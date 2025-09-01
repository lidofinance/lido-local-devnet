import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import path from "node:path";

export const DockerRegistryDown = command.cli({
  description: "Down Docker registry in k8s",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      services: { dockerRegistry },
    } = dre;

    if (!(await dre.state.isDockerRegistryDeployed())) {
      logger.log("Docker registry already stopped.");
      return;
    }

    const NAMESPACE = `kt-${dre.network.name}-docker-registry`;

    const dockerRegistrySh = dockerRegistry.sh({
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await dockerRegistrySh`make debug`;
    await dockerRegistrySh`make lint`;
    await dockerRegistrySh`make uninstall`;

    logger.log("Docker registry stopped.");

    await state.removeDockerRegistry();
  },
});
