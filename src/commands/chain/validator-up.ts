import { NETWORK_NAME_SUBSTITUTION, Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { DevNetError } from "@devnet/utils";
import { $ } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

import { nodesIngressExtension } from "./extensions/nodes-ingress.extension.js";

interface DeployInfo {
  clClient: string;
  clRelease: string;
  elRelease: string;
  isCustomNetwork: boolean;
  namespace: string;
  targetNetwork: string;
  vcClient?: string;
  vcRelease?: string;
}

export const ChainValidatorUp = command.isomorphic({
  description:
    "Deploys a validator client in Kubernetes via Helm chart, using previously generated keystores.",
  params: {
    vcClient: Params.string({ description: "Validator client: lighthouse | teku | prysm.", default: "lighthouse" }),
    vcImage: Params.string({ description: "Custom validator Docker image." }),
    feeRecipient: Params.string({ description: "Fee recipient address for proposed blocks." }),
    graffiti: Params.string({ description: "Graffiti string for proposed blocks.", default: "lido-devnet" }),
    ingress: Params.boolean({ description: "Enable ingress for VC Key Manager API.", default: false }),
  },
  extensions: [nodesIngressExtension],
  async handler({ dre: { logger, state, network: dreNetwork }, params }) {
    const vcClient = params.vcClient ?? "lighthouse";
    const graffiti = params.graffiti ?? "lido-devnet";
    const enableIngress = params.ingress ?? false;

    // 1. Read deploy info from self-hosted deployment
    const deployInfoPath = path.join(state.artifactsRoot, "self-hosted", "deploy-info.json");
    let deployInfo: DeployInfo;
    try {
      deployInfo = JSON.parse(await fs.readFile(deployInfoPath, "utf-8")) as DeployInfo;
    } catch {
      throw new DevNetError(
        "No self-hosted deploy info found. Run 'chain self-hosted-up' first to deploy EL/CL nodes.",
      );
    }

    const { namespace, clRelease, targetNetwork, isCustomNetwork } = deployInfo;

    // 2. Verify keystores exist
    const keystoresSecretName = `${dreNetwork.name}-validator-keystores`;
    const passwordSecretName = `${dreNetwork.name}-validator-password`;

    const keysDir = path.join(state.artifactsRoot, "validator-keys");
    try {
      await fs.access(path.join(keysDir, "keystores"));
    } catch {
      throw new DevNetError(
        "No validator keystores found. Run 'chain generate-validator-keys' first.",
      );
    }

    logger.log(`Deploying validator client (${vcClient}) in namespace '${namespace}'...`);

    // 3. Resolve fee recipient
    let { feeRecipient } = params;
    if (!feeRecipient) {
      try {
        const { deployer } = await state.getNamedWallet();
        feeRecipient = deployer.publicKey;
      } catch {
        feeRecipient = "0x0000000000000000000000000000000000000000";
      }
    }

    // 4. Build CL beacon endpoint URLs
    const clServiceName = `${clRelease}-lido-cl-node.${namespace}.svc.cluster.local`;
    const clServiceUrl = `http://${clServiceName}:5052`;
    const clGrpcUrl = `${clServiceName}:4000`;

    // 5. Build Helm args
    const chartPath = path.join(HELM_VENDOR_CHARTS_ROOT_PATH, "lido/lido-validator-node");
    const vcRelease = `${dreNetwork.name}-vc`;
    const imageArgs = params.vcImage ? parseImageOverride(params.vcImage, vcClient) : [];

    if (params.vcImage) {
      logger.log(`Using custom VC image: ${params.vcImage}`);
    }

    const configMapName = `${dreNetwork.name}-network-config`;

    const setArgs = [
      `client=${vcClient}`,
      `network=${targetNetwork}`,
      `customNetwork=${isCustomNetwork}`,
      `beaconEndpoint=${clServiceUrl}`,
      `feeRecipient=${feeRecipient}`,
      `graffiti=${graffiti}`,
      `keystoresSecret=${keystoresSecretName}`,
      `keystorePasswordSecret=${passwordSecretName}`,
      ...(isCustomNetwork ? [`networkConfigMapName=${configMapName}`] : []),
      ...(vcClient === "prysm" ? [`beaconGrpcEndpoint=${clGrpcUrl}`] : []),
      ...imageArgs,
    ];

    // 6. Add ingress args if enabled
    if (enableIngress) {
      const ingressArgs = buildIngressArgs("validator", dreNetwork.name);
      setArgs.push(...ingressArgs);
    }

    // 7. Deploy via Helm
    logger.log(`Helm release: ${vcRelease}`);
    await $`helm upgrade --install ${vcRelease} ${chartPath} --namespace ${namespace} ${setArgs.flatMap(a => ['--set', a])}`;
    logger.log("Validator client deployed.");

    // 8. Update state
    const vcServiceName = `${vcRelease}-lido-validator-node`;
    const vcApiUrl = `http://${vcServiceName}.${namespace}.svc.cluster.local:5062`;

    const currentChain = await state.getChain();
    await state.updateChain({
      ...currentChain,
      validatorsApiPrivate: vcApiUrl,
      validatorsApiPublic: vcApiUrl,
      vcClientType: vcClient,
      vcRelease,
    });

    // 9. Update deploy-info with VC info
    deployInfo.vcClient = vcClient;
    deployInfo.vcRelease = vcRelease;
    await fs.writeFile(deployInfoPath, JSON.stringify(deployInfo, null, 2), "utf-8");

    // 10. Update ingress state if enabled
    if (enableIngress) {
      const vcHostname = buildIngressHostname("validator", dreNetwork.name);
      try {
        const currentIngress = await state.getNodesIngress(false);
        await state.updateNodesIngress({
          el: currentIngress?.el ?? [{ publicIngressUrl: "" }],
          cl: currentIngress?.cl ?? [{ publicIngressUrl: "" }],
          vc: [{ publicIngressUrl: `http://${vcHostname}` }],
        });
      } catch {
        logger.log("Warning: Could not update ingress state.");
      }

      logger.log(`VC ingress: http://${vcHostname}`);
    }

    logger.log("Validator client started.");
    logger.log(`  Key Manager API: ${vcApiUrl}`);
    logger.log(`  Beacon REST endpoint: ${clServiceUrl}`);
    if (vcClient === "prysm") {
      logger.log(`  Beacon gRPC endpoint: ${clGrpcUrl}`);
    }

    logger.log(`  Fee recipient: ${feeRecipient}`);
  },
});

/**
 * Parses a Docker image string into Helm --set args.
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
