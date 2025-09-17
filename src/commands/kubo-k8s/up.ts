import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname, createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { KuboK8sBuild } from "./build.js";
import { NAMESPACE } from "./constants/kubo-k8s.constants.js";
import { kuboK8sExtension } from "./extensions/kubo-k8s.extension.js";

export const KuboK8sUp = command.cli({
  description: "Start Kubo on K8s with Helm",
  params: {},
  extensions: [kuboK8sExtension],
  async handler({ dre, dre: { state, services: { helmLidoKubo }, logger } }) {
    if (await state.isKuboK8sRunning()) {
      logger.log("KUbo already running");
      return;
    }

    await dre.runCommand(KuboK8sBuild, {});

    if (!(await state.isKuboK8sImageReady())) {
      throw new DevNetError("KUBO image is not ready");
    }

    const { image, tag, registryHostname } = await state.getKuboK8sImage();

    const env: Record<string, string> = {
      ...helmLidoKubo.config.constants,

      CHAIN: "artifact",
    };

    const kuboHostname = process.env.KUBO_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!kuboHostname) {
      throw new DevNetError(`KUBO_INGRESS_HOSTNAME env variable is not set`);
    }

    const KUBO_INGRESS_HOSTNAME = addPrefixToIngressHostname(kuboHostname);

    const HELM_RELEASE = 'lido-kubo-1';
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
      privateUrl: `http://lido-kubo-1.${NAMESPACE(dre)}.svc.cluster.local:5001`
    });
  },
});
