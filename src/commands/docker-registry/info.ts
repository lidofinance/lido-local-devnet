import { command } from "@devnet/command";

export const DockerRegistryGetInfo = command.isomorphic({
  description:
    "Retrieves and displays information about the docker registry service.",
  params: {},
  async handler({ dre: { logger, state } }) {
    const dockerRegistryDeployed = await state.isDockerRegistryDeployed();
    if (!dockerRegistryDeployed) {
      logger.log(`Docker registry service is not enabled`);
      return;
    }

    logger.log("");

    const dockerRegistryInfo = await state.getDockerRegistry();

    logger.table(
      ["Service", "URL"],
      [
        ["docker registry ui", dockerRegistryInfo.uiUrl!],
        ["docker registry", dockerRegistryInfo.registryUrl!],
      ],
    );
  },
});
