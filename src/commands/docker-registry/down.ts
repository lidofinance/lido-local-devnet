import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { deleteNamespace } from "@devnet/k8s";

import { NAMESPACE } from "./constants/docker-registry.constants.js";

export const DockerRegistryDown = command.cli({
  description: "Down Docker registry in k8s",
  params: {
    force: Params.boolean({
      description: "Do not check that the registry was already stopped",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { logger }, params }) {
    const {
      state,
      services: { dockerRegistry },
    } = dre;

    const dockerRegistrySh = dockerRegistry.sh({
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await dockerRegistrySh`make debug`;
    await dockerRegistrySh`make lint`;
    await dockerRegistrySh`make uninstall`;

    logger.log("Docker registry stopped.");

    await deleteNamespace(NAMESPACE(dre));

    await state.removeDockerRegistry();
  },
});
