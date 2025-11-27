import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  addPrefixToIngressHostname,
  createNamespaceIfNotExists,
} from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { NoWidgetBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/no-widget.constants.js";
import { noWidgetExtension } from "./extensions/no-widget.extension.js";

export const NoWidgetUp = command.cli({
  description: `Start ${SERVICE_NAME} in K8s with Helm`,
  params: {},
  extensions: [noWidgetExtension],
  async handler({ dre, dre: { state, services: { noWidget }, logger } }) {
    if (await state.isNoWidgetRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
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

    if (!(await state.isKapiK8sRunning())) {
      throw new DevNetError("KAPI is not deployed");
    }

    if (!(await state.isNoWidgetBackendRunning())) {
      throw new DevNetError("NO Widget Backend is not deployed");
    }

    const result = await dre.runCommand(NoWidgetBuild, {});

    if (!(await state.isNoWidgetImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();

    const { locator, lido, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();

    const { privateUrl } = await state.getNoWidgetBackendRunning();
    const { image, tag, registryHostname } = await state.getNoWidgetImage();


    const env: Record<string, number | string> = {
      ...noWidget.config.constants,
      NODE_ENV: "production",
      EL_RPC_URLS_17000: elPrivate,
      BACKEND_URL_17000: privateUrl,
      SUPPORTED_CHAINS: "17000",
      DEFAULT_CHAIN: "17000"
    };

    const hostname = process.env.NO_WIDGET_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!hostname) {
      throw new DevNetError(`NO_WIDGET_INGRESS_HOSTNAME env variable is not set`);
    }

    const INGRESS_HOSTNAME = addPrefixToIngressHostname(hostname);

    const HELM_RELEASE = 'lido-no-widget-1';
    const helmSh = noWidget.sh({
      env: {
        ...env,
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        INGRESS_HOSTNAME,
      },
    });

    await createNamespaceIfNotExists(NAMESPACE(dre));

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateNoWidgetRunning({
      publicUrl: `http://${INGRESS_HOSTNAME}`
    });
  },
});
