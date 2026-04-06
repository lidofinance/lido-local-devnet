import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists, getNamespacedDeployedHelmReleases } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { getDeployMeta } from "../../shared/deploy-meta.js";
import { cmv2Extension } from "../cmv2/extensions/cmv2.extension.js";
import { dockerRegistryExtension } from "../docker-registry/extensions/docker-registry.extension.js";
import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { KuboK8sUp } from "../kubo-k8s/up.js";
import { OracleK8sBuild } from "./build.js";
import { NAMESPACE } from "./constants/oracles-k8s.constants.js";
import { oraclesK8sExtension } from "./extensions/oracles-k8s.extension.js";

type HelmRelease = {
  HELM_RELEASE: string;
  command: string;
  privateKey: { privateKey: string };
  stakingModuleAddress: string;
};

type StateLike = any;
type OracleServiceLike = { config: { constants: Record<string, number | string> }; sh: Function };

const ensurePrereqs = async (state: StateLike) => {
  if (!(await state.isChainDeployed())) {
    throw new DevNetError("Chain is not deployed");
  }

  if (!(await state.isLidoDeployed())) {
    throw new DevNetError("Lido is not deployed");
  }

  if (!(await state.isCSMDeployed())) {
    throw new DevNetError("CSM is not deployed");
  }

  if (!(await state.isKapiK8sRunning())) {
    throw new DevNetError("KAPI is not deployed");
  }
};

const resolveRegistryHostname = async (
  params: { registryHostname?: string },
  state: StateLike,
) => {
  if (params.registryHostname) return params.registryHostname;
  try {
    const registry = await state.getDockerRegistry(false);
    return registry?.registryHostname;
  } catch {
    
  }
};

const getImageConfig = async ({
  params,
  state,
  dre,
  defaultRegistryHostname,
}: {
  defaultRegistryHostname?: string;
  dre: { runCommand: Function };
  params: { build: boolean; image: string; tag: string };
  state: StateLike;
}) => {
  if (params.build) {
    await dre.runCommand(OracleK8sBuild, {});
    if (!(await state.isOraclesK8sImageReady())) {
      throw new DevNetError("Oracle image is not ready");
    }

    return await state.getOraclesK8sImage();
  }

  return {
    tag: params.tag,
    image: params.image,
    registryHostname: defaultRegistryHostname ?? "docker.io",
  };
};

const ensurePerformanceDb = async (oracle: OracleServiceLike, namespace: string) => {
  const helmSh = oracle.sh({
    env: {
      NAMESPACE: namespace,
      HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      PERFORMANCE_DB_RELEASE: "oracle-performance-db",
    },
  });

  await helmSh`make install-performance-db`;
};

const getHelmReleases = ({
  csmModule,
  cmv2Module,
  oracle1,
  oracle2,
  oracle3,
}: {
  cmv2Module?: string;
  csmModule: string;
  oracle1: { privateKey: string };
  oracle2: { privateKey: string };
  oracle3: { privateKey: string };
}): HelmRelease[] => [
  ...(cmv2Module ? [
    { HELM_RELEASE: "oracle-performance-collector", command: "performance_collector", privateKey: oracle3, stakingModuleAddress: csmModule },
    { HELM_RELEASE: "oracle-performance-web", command: "performance_web_server", privateKey: oracle3, stakingModuleAddress: csmModule },
  ] : []),
  { HELM_RELEASE: "oracle-accounting-1", command: "accounting", privateKey: oracle1, stakingModuleAddress: csmModule },
  { HELM_RELEASE: "oracle-accounting-2", command: "accounting", privateKey: oracle2, stakingModuleAddress: csmModule },
  { HELM_RELEASE: "oracle-ejector-1", command: "ejector", privateKey: oracle1, stakingModuleAddress: csmModule },
  { HELM_RELEASE: "oracle-ejector-2", command: "ejector", privateKey: oracle2, stakingModuleAddress: csmModule },
  { HELM_RELEASE: "oracle-csm-1", command: "csm", privateKey: oracle1, stakingModuleAddress: csmModule },
  { HELM_RELEASE: "oracle-csm-2", command: "csm", privateKey: oracle2, stakingModuleAddress: csmModule },
  ...(cmv2Module ? [
    { HELM_RELEASE: "oracle-cm-1", command: "cm", privateKey: oracle1, stakingModuleAddress: cmv2Module },
    { HELM_RELEASE: "oracle-cm-2", command: "cm", privateKey: oracle3, stakingModuleAddress: cmv2Module },
  ] : []),
];

const getConsensusPicker = (consensusClientUris: string | undefined, clPrivate: string) => {
  const consensusUris = (consensusClientUris ?? "")
    .split(",")
    .map((uri) => uri.trim())
    .filter(Boolean);
  const consensusPool = consensusUris.length > 0 ? consensusUris : [clPrivate];
  let consensusIndex = 0;

  return () => {
    const uri = consensusPool[consensusIndex % consensusPool.length];
    consensusIndex += 1;
    return uri;
  };
};

const resolveConsensusRouting = ({
  networkName,
  clPrivate,
  consensusClientUris,
  performanceConsensusClientUri,
}: {
  clPrivate: string;
  consensusClientUris?: string;
  networkName: string;
  performanceConsensusClientUri?: string;
}) => {
  const envConsensusUris = process.env.ORACLES_K8S_CONSENSUS_URIS;
  const envPerformanceUri = process.env.ORACLES_K8S_PERFORMANCE_CONSENSUS_URI;
  const hasExplicit = Boolean(consensusClientUris || performanceConsensusClientUri || envConsensusUris || envPerformanceUri);
  if (hasExplicit) {
    return {
      consensusClientUris: consensusClientUris ?? envConsensusUris,
      performanceConsensusClientUri: performanceConsensusClientUri ?? envPerformanceUri,
      auto: false,
    };
  }

  // For self-hosted chains, clPrivate is the only CL endpoint
  // For Kurtosis chains, try known pod names
  const chainNamespace = `kt-${networkName}`;
  const teku = `http://cl-1-teku-geth.${chainNamespace}.svc.cluster.local:4000`;
  const lighthouse = `http://cl-2-lighthouse-geth.${chainNamespace}.svc.cluster.local:4000`;
  const kurtosisUris = `${teku},${lighthouse}`;

  return {
    consensusClientUris: clPrivate.includes("lido-cl-node") ? clPrivate : kurtosisUris,
    performanceConsensusClientUri: clPrivate.includes("lido-cl-node") ? clPrivate : lighthouse,
    auto: true,
  };
};

const resolveReleaseImageTag = ({
  command,
  params,
  image,
  tag,
}: {
  command: string;
  image: string;
  params: {
    accountingImage?: string;
    accountingTag?: string;
    csmImage?: string;
    csmTag?: string;
    ejectorImage?: string;
    ejectorTag?: string;
  };
  tag: string;
}) => {
  const isCsmFamily = [
    "cm",
    "csm",
    "performance_collector",
    "performance_web_server",
  ].includes(command);

  const releaseImage = command === "accounting"
    ? (params.accountingImage ?? image)
    : command === "ejector"
      ? (params.ejectorImage ?? image)
      : isCsmFamily
        ? (params.csmImage ?? image)
        : image;

  const releaseTag = command === "accounting"
    ? (params.accountingTag ?? tag)
    : command === "ejector"
      ? (params.ejectorTag ?? tag)
      : isCsmFamily
        ? (params.csmTag ?? tag)
        : tag;

  return { releaseImage, releaseTag };
};

const isReleaseRunning = async (namespace: string, releaseName: string) => {
  const deployedHelmReleases = await getNamespacedDeployedHelmReleases(namespace);
  return deployedHelmReleases?.includes(releaseName);
};

export const OracleK8sUp = command.cli({
  description: "Start Oracle(s) in K8s with Helm",
  params: {
    image: Params.string({
      description: "Oracle image name",
      default: "lidofinance/oracle",
      required: false,
    }),
    registryHostname: Params.string({
      description: "Docker registry hostname override",
      required: false,
    }),
    tag: Params.string({
      description: "Oracle image tag",
      default: "6.0.1",
      required: false,
    }),
    accountingImage: Params.string({
      description: "Accounting oracle image name override",
      required: false,
    }),
    accountingTag: Params.string({
      description: "Accounting oracle image tag override",
      required: false,
    }),
    csmImage: Params.string({
      description: "CSM oracle image name override (csm/cm/performance)",
      required: false,
    }),
    csmTag: Params.string({
      description: "CSM oracle image tag override (csm/cm/performance)",
      required: false,
    }),
    consensusClientUris: Params.string({
      description: "Comma-separated consensus client URIs for oracles (round-robin)",
      required: false,
    }),
    performanceConsensusClientUri: Params.string({
      description: "Consensus client URI override for performance-collector",
      required: false,
    }),
    ejectorImage: Params.string({
      description: "Ejector (VEBO) oracle image name override",
      required: false,
    }),
    ejectorTag: Params.string({
      description: "Ejector (VEBO) oracle image tag override",
      required: false,
    }),
    build: Params.boolean({
      description: "Build oracle image from git repo instead of tag",
      default: false,
      required: false,
    }),
  },
  extensions: [oraclesK8sExtension, dockerRegistryExtension, cmv2Extension],
  async handler({ dre: { logger, state, services: { oracle } }, dre, params }) {
    await ensurePrereqs(state);
    // Commands run from artifacts; keep oracle workspace synced with local edits.
    await oracle.applyWorkspace();
    await dre.runCommand(KuboK8sUp, {});

    const namespace = NAMESPACE(dre);
    await createNamespaceIfNotExists(namespace);

    const { privateUrl: kuboPrivateUrl } = await state.getKuboK8sRunning();
    const defaultRegistryHostname = await resolveRegistryHostname(params, state);
    const { image, tag, registryHostname } = await getImageConfig({
      params,
      state,
      dre,
      defaultRegistryHostname,
    });

    if (!params.registryHostname && registryHostname === "docker.io") {
      logger.warn("Registry hostname not provided and local registry not found in state; using docker.io");
    }

    const { elPrivate, clPrivate } = await state.getChain();
    const chainId = await dre.network.getChainId();
    const { locator } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const cmv2 = await state.getCMv2(false);
    const cmv2Module = cmv2?.module;
    const { oracle1, oracle2, oracle3 } = await state.getNamedWallet();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();

    const PERFORMANCE_DB_RELEASE = "oracle-performance-db";
    const PERFORMANCE_COLLECTOR_RELEASE = "oracle-performance-collector";
    const PERFORMANCE_WEB_RELEASE = "oracle-performance-web";
    const performanceDbHost = `${PERFORMANCE_DB_RELEASE}-postgresql`;
    const performanceWebService = `${PERFORMANCE_WEB_RELEASE}-lido-oracle`;
    const performanceCollectorUri = `http://${performanceWebService}.${namespace}.svc.cluster.local:9020/`;

    if (cmv2Module) {
      await ensurePerformanceDb(oracle, namespace);
    }

    const allowReportingInBunkerMode = dre.network.name.startsWith("srv3-cmv2-") ? "true" : "false";

    const env: Record<string, number | string> = {
      ...oracle.config.constants,
      CHAIN_ID: chainId,
      EXECUTION_CLIENT_URI: elPrivate,
      CONSENSUS_CLIENT_URI: clPrivate,
      LIDO_LOCATOR_ADDRESS: locator,
      KEYS_API_URI: kapiPrivateUrl,
      CSM_ORACLE_MAX_CONCURRENCY: "1",
      SUBMIT_DATA_DELAY_IN_SLOTS: "1",
      ALLOW_REPORTING_IN_BUNKER_MODE: allowReportingInBunkerMode,
      PINATA_JWT: process.env.CSM_ORACLE_PINATA_JWT ?? "",
      KUBO_HOST: kuboPrivateUrl.replace(":5001", ""),
      ...(cmv2Module ? {
        PERFORMANCE_COLLECTOR_URI: performanceCollectorUri,
        PERFORMANCE_DB_HOST: performanceDbHost,
        PERFORMANCE_DB_PORT: "5432",
        PERFORMANCE_DB_NAME: "performance",
        PERFORMANCE_DB_USER: "performance",
        PERFORMANCE_DB_PASSWORD: "performance",
      } : {}),
    };

    const helmReleases = getHelmReleases({
      csmModule,
      cmv2Module,
      oracle1,
      oracle2,
      oracle3,
    });

    const routing = resolveConsensusRouting({
      networkName: dre.network.name,
      clPrivate,
      consensusClientUris: params.consensusClientUris,
      performanceConsensusClientUri: params.performanceConsensusClientUri,
    });
    if (routing.auto) {
      logger.log("Auto consensus routing enabled (performance -> lighthouse, others round-robin).");
    }

    const nextConsensusUri = getConsensusPicker(routing.consensusClientUris, clPrivate);

    const { DEPLOY_COMMIT, DEPLOY_TIME } = await getDeployMeta(oracle.artifact.root);

    for (const release of helmReleases) {
      const { HELM_RELEASE, privateKey, command, stakingModuleAddress } = release;
      const isRunning = await isReleaseRunning(namespace, HELM_RELEASE);
      const shouldUpgrade = command === "performance_collector" || command === "performance_web_server";
      if (isRunning && !shouldUpgrade) {
        logger.log(`Oracles release ${HELM_RELEASE} already running`);
        continue;
      }

      const releaseConsensusUri = command === "performance_collector" && routing.performanceConsensusClientUri
        ? routing.performanceConsensusClientUri
        : nextConsensusUri();

      const releaseEnv = {
        ...env,
        STAKING_MODULE_ADDRESS: stakingModuleAddress,
        CONSENSUS_CLIENT_URI: releaseConsensusUri,
        ...(command === "csm" ? { CSM_MODULE_ADDRESS: stakingModuleAddress } : {}),
      };

      const { releaseImage, releaseTag } = resolveReleaseImageTag({
        command,
        params,
        image,
        tag,
      });

      const performanceWebProbeOverrides =
        "--set-string=" +
        "lido-app.livenessProbe.exec.command[0]=curl," +
        "lido-app.livenessProbe.exec.command[1]=-f," +
        "lido-app.livenessProbe.exec.command[2]=http://localhost:9020/health," +
        "lido-app.readinessProbe.exec.command[0]=curl," +
        "lido-app.readinessProbe.exec.command[1]=-f," +
        "lido-app.readinessProbe.exec.command[2]=http://localhost:9020/health";
      const releaseHelmExtraSet = command === "performance_web_server"
        ? performanceWebProbeOverrides
        : "";

      const helmLidoOracleSh = oracle.sh({
        env: {
          ...releaseEnv,
          NAMESPACE: namespace,
          HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: releaseImage,
        TAG: releaseTag,
        REGISTRY_HOSTNAME: registryHostname,
        MEMBER_PRIV_KEY: privateKey.privateKey,
        COMMAND: command,
        DEPLOY_COMMIT,
        DEPLOY_TIME,
      },
    });

      await createNamespaceIfNotExists(namespace);
      await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace });

      await helmLidoOracleSh`make HELM_EXTRA_SET=${releaseHelmExtraSet} debug`;
      await helmLidoOracleSh`make HELM_EXTRA_SET=${releaseHelmExtraSet} lint`;

      try {
        await (isRunning && shouldUpgrade ? helmLidoOracleSh`make HELM_EXTRA_SET=${releaseHelmExtraSet} upgrade` : helmLidoOracleSh`make HELM_EXTRA_SET=${releaseHelmExtraSet} install`);
      } catch {
        await helmLidoOracleSh`make uninstall`;
      }
    }

    await state.updateOraclesK8sRunning({
      helmReleases: ["active"],
    });
  },
});
