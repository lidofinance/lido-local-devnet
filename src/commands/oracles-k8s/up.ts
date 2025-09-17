import { command } from "@devnet/command";
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
  params: {},
  extensions: [oraclesK8sExtension],
  async handler({ dre: { logger, state, services: { helmLidoOracle } }, dre }) {
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

    const { privateUrl: kuboPrivateUrl } = await state.getKuboK8sRunning();

    await dre.runCommand(OracleK8sBuild, {});

    if (!(await state.isOraclesK8sImageReady())) {
      throw new DevNetError("Oracle image is not ready");
    }

    const { elPrivate, clPrivate } = await state.getChain();

    const { locator, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { oracle1, oracle2, oracle3 } = await state.getNamedWallet();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { image, tag, registryHostname } = await state.getOraclesK8sImage();

    const env: Record<string, string> = {
      ...helmLidoOracle.config.constants,

      CHAIN_ID: "32382",
      EXECUTION_CLIENT_URI: elPrivate,
      CONSENSUS_CLIENT_URI: clPrivate,
      LIDO_LOCATOR_ADDRESS: locator,
      KEYS_API_URI: kapiPrivateUrl,
      CSM_MODULE_ADDRESS: csmModule,
      CSM_ORACLE_MAX_CONCURRENCY: "1",
      SUBMIT_DATA_DELAY_IN_SLOTS: "1",
      ALLOW_REPORTING_IN_BUNKER_MODE: "false",
      PINATA_JWT: process.env.CSM_ORACLE_PINATA_JWT ?? "",
      KUBO_HOST: kuboPrivateUrl,
    };

    const helmReleases = [
      { HELM_RELEASE: 'oracle-accounting-1', command: 'accounting', privateKey: oracle1 },
      { HELM_RELEASE: 'oracle-accounting-2', command: 'accounting', privateKey: oracle2 },
      { HELM_RELEASE: 'oracle-ejector-1', command: 'ejector', privateKey: oracle1 },
      { HELM_RELEASE: 'oracle-ejector-2', command: 'ejector', privateKey: oracle2 },
      { HELM_RELEASE: 'oracle-csm-1', command: 'csm', privateKey: oracle1 },
      { HELM_RELEASE: 'oracle-csm-2', command: 'csm', privateKey: oracle2 },
    ];

    for (const release of helmReleases) {
      const { HELM_RELEASE, privateKey, command } = release;

      const alreadyDeployedHelmReleases = await getNamespacedDeployedHelmReleases(NAMESPACE(dre));
      if (alreadyDeployedHelmReleases?.includes(HELM_RELEASE)) {
        logger.log(`Oracles release ${HELM_RELEASE} already running`);
        continue;
      }

      const helmLidoOracleSh = helmLidoOracle.sh({
        env: {
          ...env,
          NAMESPACE: NAMESPACE(dre),
          HELM_RELEASE,
          HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
          IMAGE: image,
          TAG: tag,
          REGISTRY_HOSTNAME: registryHostname,
          MEMBER_PRIV_KEY: privateKey.privateKey,
          COMMAND: command,
        },
      });

      await createNamespaceIfNotExists(NAMESPACE(dre));

      await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

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
