import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname, createNamespaceIfNotExists, getK8s, k8s } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { KuboK8sBuild } from "./build.js";
import { NAMESPACE } from "./constants/kubo-k8s.constants.js";
import { kuboK8sExtension } from "./extensions/kubo-k8s.extension.js";

export const KuboK8sUp = command.cli({
  description: "Start Kubo on K8s with Helm",
  params: {},
  extensions: [kuboK8sExtension],
  async handler({ dre, dre: { state, network, services: { helmLidoKubo }, logger } }) {
    if (await state.isKuboK8sRunning()) {
      logger.log("KUbo already running");
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isLidoDeployed())) {
      throw new DevNetError("Lido is not deployed");
    }

    if (!(await state.isCSMDeployed())) {
      throw new DevNetError("CSM is not deployed");
    }

    await dre.runCommand(KuboK8sBuild, {});

    if (!(await state.isKuboK8sImageReady())) {
      throw new DevNetError("KUBO image is not ready");
    }

    const { elPrivate, clPrivate } = await state.getChain();

    const { locator, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { image, tag, registryHostname } = await state.getKuboK8sImage();

    const env: Record<string, string> = {
      ...helmLidoKubo.config.constants,

      CHAIN: "artifact",
    };

    const kapiHostname = process.env.KUBO_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!kapiHostname) {
      throw new DevNetError(`KUBO_INGRESS_HOSTNAME env variable is not set`);
    }

    const KUBO_INGRESS_HOSTNAME = addPrefixToIngressHostname(kapiHostname);

    const HELM_RELEASE = 'kubo';
    const helmLidoKuboSh = helmLidoKubo.sh({
      env: {
        ...env,
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        KUBO_INGRESS_HOSTNAME,
      },
    });

    await createNamespaceIfNotExists(NAMESPACE(dre));

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

    await helmLidoKuboSh`make debug`;
    await helmLidoKuboSh`make lint`;
    await helmLidoKuboSh`make install`;

    // TODO get service name from helm release
    await state.updateKuboK8sRunning({
      helmRelease: HELM_RELEASE,
      publicUrl: `http://${KUBO_INGRESS_HOSTNAME}`,
      privateUrl: `http://kubo-lido-kubo.${NAMESPACE(dre)}.svc.cluster.local:3000`
    });
  },
});
