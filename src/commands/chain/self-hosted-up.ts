import { NETWORK_NAME_SUBSTITUTION, Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists, getK8s } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import { $ } from "execa";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { nodesIngressExtension } from "./extensions/nodes-ingress.extension.js";

const KNOWN_NETWORKS = new Set(["mainnet", "hoodi", "holesky", "sepolia", "goerli"]);
const CONFIGMAP_MAX_BINARY_SIZE = 900 * 1024; // 900KB — leave headroom for ConfigMap 1MB limit

interface Logger {
  log: (msg: string) => void;
}

interface NetworkConfig {
  clBootnodes: string;
  configMapName: string;
  elBootnodes: string;
  needsGenesisSSZUrl: boolean;
}

export const ChainSelfHostedUp = command.isomorphic({
  description:
    "Starts self-hosted EL/CL nodes in Kubernetes via Helm charts.",
  params: {
    elClient: Params.string({ description: "EL client: geth | reth", default: "geth" }),
    clClient: Params.string({ description: "CL client: lighthouse | teku | prysm", default: "lighthouse" }),
    network: Params.string({ description: "Target network (hoodi, holesky, or custom devnet name)." }),
    checkpointSyncUrl: Params.string({ description: "CL checkpoint sync URL for faster sync." }),
    elImage: Params.string({ description: "Custom EL Docker image (e.g. ethpandaops/geth:epbs-devnet-0)." }),
    clImage: Params.string({ description: "Custom CL Docker image (e.g. ethpandaops/lighthouse:epbs-devnet-0)." }),
    genesisSSZUrl: Params.string({ description: "URL to download genesis.ssz (for large files that exceed ConfigMap 1MB limit)." }),
    ingress: Params.boolean({ description: "Enable ingress for EL/CL APIs. Uses ETH_NODES_INGRESS_HOSTNAME from .env.", default: true }),
  },
  extensions: [nodesIngressExtension],
  async handler({ dre: { logger, state, network: dreNetwork }, params }) {
    const { elClient, clClient, checkpointSyncUrl, elImage, clImage, genesisSSZUrl } = params;
    const enableIngress = params.ingress ?? false;
    const targetNetwork = params.network;

    if (!targetNetwork) {
      throw new DevNetError("--network is required for self-hosted mode.");
    }

    const namespace = `kt-${dreNetwork.name}`;
    const isCustomNetwork = !KNOWN_NETWORKS.has(targetNetwork);
    const networkConfigDir = path.join(state.artifactsRoot, "network-config");

    // 1. Prepare custom network config (validate, upload ConfigMap, read bootnodes)
    const netConfig = await prepareNetworkConfig({
      isCustomNetwork, networkConfigDir, namespace, networkName: dreNetwork.name, genesisSSZUrl, logger,
    });

    // 2. Ensure JWT secret exists in K8s
    const jwtSecretName = await ensureJwtSecret(namespace, dreNetwork.name, state.artifactsRoot, logger);

    // 3. Create namespace
    logger.log(`Creating namespace '${namespace}' if not exists...`);
    await createNamespaceIfNotExists(namespace);

    // 4. Deploy EL & CL Helm charts
    const elRelease = `${dreNetwork.name}-el`;
    const clRelease = `${dreNetwork.name}-cl`;

    const ingressArgs = enableIngress
      ? { el: buildIngressArgs("execution", dreNetwork.name), cl: buildIngressArgs("consensus", dreNetwork.name) }
      : { cl: [] as string[], el: [] as string[] };

    await deployElNode({
      release: elRelease, namespace, elClient: elClient!, targetNetwork,
      isCustomNetwork, jwtSecretName, netConfig, elImage, ingressArgs: ingressArgs.el, logger,
    });

    await deployClNode({
      release: clRelease, namespace, clClient: clClient!, targetNetwork,
      isCustomNetwork, jwtSecretName, netConfig, clImage, elRelease,
      checkpointSyncUrl, genesisSSZUrl, ingressArgs: ingressArgs.cl, logger,
    });

    // 5. Resolve ingress hostnames (if enabled) for state
    const elIngressHostname = enableIngress ? buildIngressHostname("execution", dreNetwork.name) : "";
    const clIngressHostname = enableIngress ? buildIngressHostname("consensus", dreNetwork.name) : "";

    // 6. Save state and deploy info
    await saveDeployState({
      state, namespace, elRelease, clRelease, elClient: elClient!, clClient: clClient!,
      targetNetwork, isCustomNetwork, elImage, clImage,
      elIngressHostname, clIngressHostname, logger,
    });

    // 7. Update ingress state if enabled
    if (enableIngress) {
      if (elIngressHostname && clIngressHostname) {
        try {
          await state.updateNodesIngress({
            el: [{ publicIngressUrl: `http://${elIngressHostname}` }],
            cl: [{ publicIngressUrl: `http://${clIngressHostname}` }],
          });

          logger.log(`EL ingress: http://${elIngressHostname}`);
          logger.log(`CL ingress: http://${clIngressHostname}`);
        } catch {
          logger.log("Warning: Could not update ingress state.");
        }
      } else {
        logger.log("Warning: ETH_NODES_INGRESS_HOSTNAME or GLOBAL_INGRESS_HOST_PREFIX not set in .env. Ingress enabled but hostname not configured.");
      }
    }
  },
});

// ── Network config helpers ──────────────────────────────────────────────────

async function prepareNetworkConfig(opts: {
  genesisSSZUrl?: string;
  isCustomNetwork: boolean;
  logger: Logger;
  namespace: string;
  networkConfigDir: string;
  networkName: string;
}): Promise<NetworkConfig> {
  const { isCustomNetwork, networkConfigDir, namespace, networkName, genesisSSZUrl, logger } = opts;
  const configMapName = `${networkName}-network-config`;

  if (!isCustomNetwork) {
    return { clBootnodes: "", configMapName, elBootnodes: "", needsGenesisSSZUrl: false };
  }

  logger.log(`Custom network '${networkName}' detected. Checking network-config...`);
  await validateNetworkConfig(networkConfigDir);
  logger.log("Network config validated.");

  logger.log("Uploading network config to K8s ConfigMap...");
  const skippedFiles = await uploadNetworkConfigAsConfigMap(namespace, configMapName, networkConfigDir, logger);
  logger.log(`ConfigMap '${configMapName}' created.`);

  const needsGenesisSSZUrl = skippedFiles.includes("genesis.ssz");
  if (needsGenesisSSZUrl) {
    if (genesisSSZUrl) {
      logger.log("genesis.ssz will be downloaded from URL in CL init container.");
    } else {
      logger.log("WARNING: genesis.ssz is too large for ConfigMap (>900KB). Pass --genesisSSZUrl to download it in the CL init container.");
    }
  }

  const elBootnodes = await readBootnodesFile(networkConfigDir, "enodes.txt", logger);
  const clBootnodes = await readBootnodesFile(networkConfigDir, "bootstrap_nodes.yaml", logger)
    || await readBootnodesFile(networkConfigDir, "bootstrap_nodes.txt", logger);

  return { clBootnodes, configMapName, elBootnodes, needsGenesisSSZUrl };
}

// ── JWT helpers ─────────────────────────────────────────────────────────────

async function ensureJwtSecret(
  namespace: string,
  networkName: string,
  artifactsRoot: string,
  logger: Logger,
): Promise<string> {
  const jwtPath = path.join(artifactsRoot, "jwt.hex");
  let jwtSecret: string;
  try {
    jwtSecret = await fs.readFile(jwtPath, "utf-8");
    logger.log("Using existing JWT secret.");
  } catch {
    jwtSecret = randomBytes(32).toString("hex");
    await fs.mkdir(path.dirname(jwtPath), { recursive: true });
    await fs.writeFile(jwtPath, jwtSecret, "utf-8");
    logger.log("Generated new JWT secret.");
  }

  const jwtSecretName = `${networkName}-jwt`;
  await createK8sJwtSecret(namespace, jwtSecretName, jwtSecret);
  logger.log("JWT Secret created in K8s.");
  return jwtSecretName;
}

// ── Helm deploy helpers ─────────────────────────────────────────────────────

async function deployElNode(opts: {
  elClient: string; elImage?: string; ingressArgs: string[]; isCustomNetwork: boolean;
  jwtSecretName: string; logger: Logger; namespace: string;
  netConfig: NetworkConfig; release: string; targetNetwork: string;
}) {
  const { release, namespace, elClient, targetNetwork, isCustomNetwork, jwtSecretName, netConfig, elImage, ingressArgs, logger } = opts;
  const chartPath = path.join(HELM_VENDOR_CHARTS_ROOT_PATH, "lido/lido-el-node");
  const imageArgs = elImage ? parseImageOverride(elImage, elClient) : [];

  logger.log(`Deploying EL node (${elClient}) as Helm release '${release}'...`);
  if (elImage) logger.log(`  Using custom EL image: ${elImage}`);

  const setArgs = [
    `client=${elClient}`,
    `network=${targetNetwork}`,
    `customNetwork=${isCustomNetwork}`,
    `jwt.existingSecret=${jwtSecretName}`,
    ...(isCustomNetwork ? [`networkConfigMapName=${netConfig.configMapName}`, `syncMode=full`] : []),
    ...(netConfig.elBootnodes ? [`bootnodes=${netConfig.elBootnodes}`] : []),
    ...imageArgs,
    ...ingressArgs,
  ];

  await helmUpgradeInstall(release, chartPath, namespace, setArgs);
  logger.log("EL Helm release deployed.");
}

async function deployClNode(opts: {
  checkpointSyncUrl?: string; clClient: string; clImage?: string;
  elRelease: string; genesisSSZUrl?: string; ingressArgs: string[]; isCustomNetwork: boolean;
  jwtSecretName: string; logger: Logger; namespace: string;
  netConfig: NetworkConfig; release: string; targetNetwork: string;
}) {
  const { release, namespace, clClient, targetNetwork, isCustomNetwork, jwtSecretName, netConfig, clImage, elRelease, checkpointSyncUrl, genesisSSZUrl, ingressArgs, logger } = opts;
  const chartPath = path.join(HELM_VENDOR_CHARTS_ROOT_PATH, "lido/lido-cl-node");
  const elServiceUrl = `http://${elRelease}-lido-el-node.${namespace}.svc.cluster.local:8551`;
  const imageArgs = clImage ? parseImageOverride(clImage, clClient) : [];

  logger.log(`Deploying CL node (${clClient}) as Helm release '${release}'...`);
  if (clImage) logger.log(`  Using custom CL image: ${clImage}`);

  const setArgs = [
    `client=${clClient}`,
    `network=${targetNetwork}`,
    `customNetwork=${isCustomNetwork}`,
    `executionEndpoint=${elServiceUrl}`,
    `jwt.existingSecret=${jwtSecretName}`,
    ...(isCustomNetwork ? [`networkConfigMapName=${netConfig.configMapName}`] : []),
    ...(checkpointSyncUrl ? [`checkpointSyncUrl=${checkpointSyncUrl}`] : []),
    ...(netConfig.clBootnodes ? [`bootnodes=${netConfig.clBootnodes}`] : []),
    ...(genesisSSZUrl ? [`genesisSSZUrl=${genesisSSZUrl}`] : []),
    ...imageArgs,
    // Lighthouse ePBS fix: disable hot-cold DB migration to avoid sync stall at Gloas fork
    ...(clClient === "lighthouse" ? [`extraArgs[0]=--epochs-per-migration=99999`] : []),
    ...ingressArgs,
  ];

  await helmUpgradeInstall(release, chartPath, namespace, setArgs);
  logger.log("CL Helm release deployed.");
}

async function helmUpgradeInstall(release: string, chartPath: string, namespace: string, setArgs: string[]) {
  await $`helm upgrade --install ${release} ${chartPath} --namespace ${namespace} ${setArgs.flatMap(a => ['--set', a])}`;
}

// ── State persistence ───────────────────────────────────────────────────────

async function saveDeployState(opts: {
  clClient: string; clImage?: string; clIngressHostname: string; clRelease: string;
  elClient: string; elImage?: string; elIngressHostname: string; elRelease: string;
  isCustomNetwork: boolean; logger: Logger; namespace: string;
  state: any; targetNetwork: string;
}) {
  const { state, namespace, elRelease, clRelease, elClient, clClient, targetNetwork, isCustomNetwork, elImage, clImage, elIngressHostname, clIngressHostname, logger } = opts;
  const elServiceName = `${elRelease}-lido-el-node`;
  const clServiceName = `${clRelease}-lido-cl-node`;

  const elInternalUrl = `http://${elServiceName}.${namespace}.svc.cluster.local:8545`;
  const clInternalUrl = `http://${clServiceName}.${namespace}.svc.cluster.local:5052`;
  const elWsInternalUrl = `ws://${elServiceName}.${namespace}.svc.cluster.local:8546`;

  await state.updateChain({
    elPrivate: elInternalUrl,
    elPublic: elIngressHostname ? `http://${elIngressHostname}` : elInternalUrl,
    clPrivate: clInternalUrl,
    clPublic: clIngressHostname ? `http://${clIngressHostname}` : clInternalUrl,
    elWsPrivate: elWsInternalUrl,
    elWsPublic: elIngressHostname ? `http://${elIngressHostname}` : elWsInternalUrl,
    elClientType: elClient,
  });

  await state.updateChainMode("self-hosted");

  const selfHostedDir = path.join(state.artifactsRoot, "self-hosted");
  await fs.mkdir(selfHostedDir, { recursive: true });
  await fs.writeFile(
    path.join(selfHostedDir, "deploy-info.json"),
    JSON.stringify({
      elRelease, clRelease, namespace, elClient, clClient,
      targetNetwork, isCustomNetwork,
      ...(elImage ? { elImage } : {}),
      ...(clImage ? { clImage } : {}),
    }, null, 2),
    "utf-8",
  );

  logger.log("Chain started in self-hosted mode.");
  logger.log(`  EL private: ${elInternalUrl}`);
  logger.log(`  CL private: ${clInternalUrl}`);
  if (elIngressHostname) logger.log(`  EL public:  http://${elIngressHostname}`);
  if (clIngressHostname) logger.log(`  CL public:  http://${clIngressHostname}`);
}

// ── Utility functions ───────────────────────────────────────────────────────

/**
 * Reads a bootnodes file from the network-config directory.
 * Returns Helm-escaped comma-separated list of bootnode URLs, or empty string.
 */
async function readBootnodesFile(configDir: string, filename: string, logger: Logger): Promise<string> {
  const filePath = path.join(configDir, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      // Strip YAML list prefix "- "
      .map((l) => l.startsWith("- ") ? l.slice(2).trim() : l)
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("//"));

    if (lines.length > 0) {
      logger.log(`Found ${lines.length} bootnodes in ${filename}.`);
      // Escape commas for Helm --set (Helm treats , as array separator)
      return lines.join("\\,");
    }
  } catch {
    // File doesn't exist, that's OK
  }

  return "";
}

/**
 * Parses a Docker image string like "ethpandaops/geth:epbs-devnet-0"
 * into Helm --set args for the given client type.
 */
function parseImageOverride(image: string, clientType: string): string[] {
  const [repoWithRegistry, tag] = image.includes(":")
    ? [image.slice(0, image.lastIndexOf(":")), image.slice(image.lastIndexOf(":") + 1)]
    : [image, "latest"];

  const parts = repoWithRegistry.split("/");
  const registry = parts.length >= 3 ? parts[0]! : "docker.io";
  const repository = parts.length >= 3 ? parts.slice(1).join("/") : repoWithRegistry;

  return [
    `image.${clientType}.registry=${registry}`,
    `image.${clientType}.repository=${repository}`,
    `image.${clientType}.tag=${tag}`,
  ];
}

async function validateNetworkConfig(configDir: string): Promise<void> {
  const requiredFiles = ["genesis.json", "config.yaml", "genesis.ssz"];
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(configDir, file));
    } catch {
      throw new DevNetError(
        `Required network config file '${file}' not found in ${configDir}. ` +
        `For custom devnets, place genesis.json, config.yaml, and genesis.ssz in artifacts/<stand>/network-config/`,
      );
    }
  }
}

async function uploadNetworkConfigAsConfigMap(
  namespace: string,
  name: string,
  configDir: string,
  logger: Logger,
): Promise<string[]> {
  const kc = await getK8s();
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  const files = await fs.readdir(configDir);
  const data: Record<string, string> = {};
  const binaryData: Record<string, string> = {};
  const skippedFiles: string[] = [];

  for (const file of files) {
    const filePath = path.join(configDir, file);
    const stat = await fs.stat(filePath);

    if (file.endsWith(".ssz") || file.endsWith(".bin")) {
      if (stat.size > CONFIGMAP_MAX_BINARY_SIZE) {
        logger.log(`Skipping '${file}' (${(stat.size / 1024).toFixed(0)}KB) — too large for ConfigMap.`);
        skippedFiles.push(file);
        continue;
      }

      const content = await fs.readFile(filePath);
      binaryData[file] = content.toString("base64");
    } else {
      data[file] = await fs.readFile(filePath, "utf-8");
    }
  }

  const configMapBody: k8s.V1ConfigMap = {
    metadata: { name, namespace },
    data,
    binaryData,
  };

  try {
    await coreApi.readNamespacedConfigMap({ name, namespace });
    await coreApi.replaceNamespacedConfigMap({ name, namespace, body: configMapBody });
  } catch {
    await coreApi.createNamespacedConfigMap({ namespace, body: configMapBody });
  }

  return skippedFiles;
}

// ── Ingress helpers ──────────────────────────────────────────────────────────

/**
 * Builds ingress Helm --set args from .env variables.
 */
function buildIngressArgs(nodeType: string, networkName: string): string[] {
  const hostname = buildIngressHostname(nodeType, networkName);
  if (!hostname) return [];

  return [
    `ingress.enabled=true`,
    `ingress.className=public`,
    `ingress.hosts[0].host=${hostname}`,
    `ingress.hosts[0].paths[0].path=/`,
    `ingress.hosts[0].paths[0].pathType=Prefix`,
  ];
}

/**
 * Builds ingress hostname from .env variables.
 * Pattern: <PREFIX>-<nodeType>.<ETH_NODES_INGRESS_HOSTNAME>
 */
function buildIngressHostname(nodeType: string, networkName: string): string {
  const baseHostname = process.env.ETH_NODES_INGRESS_HOSTNAME?.replace(
    NETWORK_NAME_SUBSTITUTION,
    networkName,
  );
  const prefix = process.env.GLOBAL_INGRESS_HOST_PREFIX;

  if (!baseHostname || !prefix) {
    return "";
  }

  return `${prefix}-${nodeType}.${baseHostname}`;
}

async function createK8sJwtSecret(namespace: string, name: string, jwtHex: string): Promise<void> {
  const kc = await getK8s();
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  const secretBody: k8s.V1Secret = {
    metadata: { name, namespace },
    type: "Opaque",
    data: {
      "jwt.hex": Buffer.from(jwtHex).toString("base64"),
    },
  };

  try {
    await coreApi.readNamespacedSecret({ name, namespace });
    await coreApi.replaceNamespacedSecret({ name, namespace, body: secretBody });
  } catch {
    await coreApi.createNamespacedSecret({ namespace, body: secretBody });
  }
}
