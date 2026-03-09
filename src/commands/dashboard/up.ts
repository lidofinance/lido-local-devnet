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
import { DashboardBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/dashboard.constants.js";
import { dashboardExtension } from "./extensions/dashboard.extension.js";

export const DashboardUp = command.cli({
  description: `Start ${SERVICE_NAME} in K8s with Helm`,
  params: {},
  extensions: [dashboardExtension],
  async handler({ dre, dre: { state, services: { dashboard }, logger } }) {
    if (await state.isDashboardRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    await dre.runCommand(DashboardBuild, {});

    if (!(await state.isDashboardImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { image, tag, registryHostname } = await state.getDashboardImage();

    const hostname = process.env.DASHBOARD_INGRESS_HOSTNAME?.replace(
      NETWORK_NAME_SUBSTITUTION,
      DEFAULT_NETWORK_NAME,
    );

    if (!hostname) {
      throw new DevNetError("DASHBOARD_INGRESS_HOSTNAME env variable is not set");
    }

    const INGRESS_HOSTNAME = addPrefixToIngressHostname(hostname);

    const HELM_RELEASE = "lido-dashboard-1";
    const helmSh = dashboard.sh({
      env: {
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

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, {
      namespace: NAMESPACE(dre),
    });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateDashboardRunning({
      publicUrl: `http://${INGRESS_HOSTNAME}`,
    });

    logger.log(`${SERVICE_NAME} available at http://${INGRESS_HOSTNAME}`);
  },
});
