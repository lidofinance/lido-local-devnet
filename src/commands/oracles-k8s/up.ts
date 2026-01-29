import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists, getNamespacedDeployedHelmReleases } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { KuboK8sUp } from "../kubo-k8s/up.js";
import { OracleK8sBuild } from "./build.js";
import { NAMESPACE } from "./constants/oracles-k8s.constants.js";
import { oraclesK8sExtension } from "./extensions/oracles-k8s.extension.js";

export const OracleK8sUp = command.cli({
  description: "Start Oracle(s) in K8s with Helm",
  params: {
    tag: Params.string({
      description: "Oracle image tag",
      default: '6.0.1',
      required: false,
    }),
    build: Params.boolean({
      description: "Build oracle image from git repo instead of tag",
      default: false,
      required: false,
    }),
  },
  extensions: [oraclesK8sExtension],
  async handler({ dre: { logger, state, services: { oracle } }, dre, params }) {
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

    await dre.runCommand(KuboK8sUp, {});

    const namespace = NAMESPACE(dre);
    await createNamespaceIfNotExists(namespace);

    const { privateUrl: kuboPrivateUrl } = await state.getKuboK8sRunning();

    const buildAndGetImage = async () => {
      await dre.runCommand(OracleK8sBuild, {});
      if (!(await state.isOraclesK8sImageReady())) {
        throw new DevNetError("Oracle image is not ready");
      }

      return await state.getOraclesK8sImage()
    }

    const { image, tag, registryHostname } = params.build
      ? await buildAndGetImage()
      : {
        tag: params.tag,
        image: 'lidofinance/oracle',
        registryHostname: 'docker.io'
      };


    const { elPrivate, clPrivate } = await state.getChain();

    const { locator, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { oracle1, oracle2, oracle3 } = await state.getNamedWallet();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();

    const PERFORMANCE_DB_RELEASE = "oracle-performance-db";
    const PERFORMANCE_COLLECTOR_RELEASE = "oracle-performance-collector";
    const PERFORMANCE_WEB_RELEASE = "oracle-performance-web";
    const performanceDbHost = `${PERFORMANCE_DB_RELEASE}-postgresql`;
    const performanceWebService = `${PERFORMANCE_WEB_RELEASE}-lido-oracle`;
    const performanceCollectorUri = `http://${performanceWebService}.${namespace}.svc.cluster.local:9020/`;

    const alreadyDeployedHelmReleases = await getNamespacedDeployedHelmReleases(namespace);
    if (!alreadyDeployedHelmReleases?.includes(PERFORMANCE_DB_RELEASE)) {
      const postgresChartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/vendor/postgresql`;
      const helmPostgresSh = oracle.sh({ env: { NAMESPACE: namespace } });

      await helmPostgresSh`helm install ${PERFORMANCE_DB_RELEASE} ${postgresChartPath} --namespace ${namespace} --set auth.username=performance --set auth.password=performance --set auth.database=performance --set auth.postgresPassword=postgres`;
    }

    const env: Record<string, number | string> = {
      ...oracle.config.constants,

      CHAIN_ID: "32382",
      EXECUTION_CLIENT_URI: elPrivate,
      CONSENSUS_CLIENT_URI: clPrivate,
      LIDO_LOCATOR_ADDRESS: locator,
      KEYS_API_URI: kapiPrivateUrl,
      CSM_ORACLE_MAX_CONCURRENCY: "1",
      SUBMIT_DATA_DELAY_IN_SLOTS: "1",
      ALLOW_REPORTING_IN_BUNKER_MODE: "false",
      PINATA_JWT: process.env.CSM_ORACLE_PINATA_JWT ?? "",
      KUBO_HOST: kuboPrivateUrl.replace(":5001", ""),
      PERFORMANCE_COLLECTOR_URI: performanceCollectorUri,
      PERFORMANCE_DB_HOST: performanceDbHost,
      PERFORMANCE_DB_PORT: "5432",
      PERFORMANCE_DB_NAME: "performance",
      PERFORMANCE_DB_USER: "performance",
      PERFORMANCE_DB_PASSWORD: "performance",
    };

    const helmReleases = [
      { HELM_RELEASE: PERFORMANCE_COLLECTOR_RELEASE, command: 'performance_collector', privateKey: oracle3, stakingModuleAddress: csmModule },
      { HELM_RELEASE: PERFORMANCE_WEB_RELEASE, command: 'performance_web_server', privateKey: oracle3, stakingModuleAddress: csmModule },
      { HELM_RELEASE: 'oracle-accounting-1', command: 'accounting', privateKey: oracle1, stakingModuleAddress: csmModule },
      { HELM_RELEASE: 'oracle-accounting-2', command: 'accounting', privateKey: oracle2, stakingModuleAddress: csmModule },
      { HELM_RELEASE: 'oracle-ejector-1', command: 'ejector', privateKey: oracle1, stakingModuleAddress: csmModule },
      { HELM_RELEASE: 'oracle-ejector-2', command: 'ejector', privateKey: oracle2, stakingModuleAddress: csmModule },
      { HELM_RELEASE: 'oracle-csm-1', command: 'csm', privateKey: oracle1, stakingModuleAddress: csmModule },
      { HELM_RELEASE: 'oracle-csm-2', command: 'csm', privateKey: oracle2, stakingModuleAddress: csmModule },
      { HELM_RELEASE: 'oracle-cm-1', command: 'cm', privateKey: oracle1, stakingModuleAddress: curatedModule },
      { HELM_RELEASE: 'oracle-cm-2', command: 'cm', privateKey: oracle3, stakingModuleAddress: curatedModule },
    ];

    for (const release of helmReleases) {
      const { HELM_RELEASE, privateKey, command, stakingModuleAddress } = release;

      const deployedHelmReleases = await getNamespacedDeployedHelmReleases(namespace);
      if (deployedHelmReleases?.includes(HELM_RELEASE)) {
        logger.log(`Oracles release ${HELM_RELEASE} already running`);
        continue;
      }

      const releaseEnv = {
        ...env,
        STAKING_MODULE_ADDRESS: stakingModuleAddress,
      };

      const helmLidoOracleSh = oracle.sh({
        env: {
          ...releaseEnv,
          NAMESPACE: namespace,
          HELM_RELEASE,
          HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
          IMAGE: image,
          TAG: tag,
          REGISTRY_HOSTNAME: registryHostname,
          MEMBER_PRIV_KEY: privateKey.privateKey,
          COMMAND: command,
        },
      });

      await createNamespaceIfNotExists(namespace);

      await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace });

      await helmLidoOracleSh`make debug`;
      await helmLidoOracleSh`make lint`;

      try {
        await helmLidoOracleSh`make install`;
      } catch {
        // rollback changes
        await helmLidoOracleSh`make uninstall`;
      }
    }

    await state.updateOraclesK8sRunning({
      helmReleases: ['active'],
    });
  },
});
