import { command } from "@devnet/command";

export const TunnelGetInfo = command.cli({
  description: "Displays a single SSH tunnel command for all services.",
  params: {},
  async handler({
    dre: {
      logger,
      state,
      services: { kurtosis },
    },
  }) {
    const [kurtosisInfo, blockscoutInfo, chainServices] = await Promise.all([
      kurtosis.getDockerInfo(false),
      state.getBlockScout(false),
      (async () => {
        const chainServices = await state.getChain();
        return Object.entries(chainServices).filter(
          ([k]) => !k.endsWith("Private"),
        );
      })(),
    ]);

    // If no services are enabled, log a message and return
    if (
      !kurtosisInfo &&
      !blockscoutInfo &&
      Object.keys(chainServices).length === 0
    ) {
      logger.log(`No services are enabled`);
      return;
    }

    let sshCommand = "ssh";

    const addPortToCommand = (url: string) => {
      const port = new URL(url).port || url.split(":").pop();
      sshCommand += ` -L ${port}:localhost:${port}`;
    };

    // Collect all service URLs and names
    const serviceEntries = [
      ...chainServices,
      ...(kurtosisInfo?.dora.map((dora) => [
        "dora",
        dora.ports[0].publicUrl!,
      ]) || []),
      ["blockscout", blockscoutInfo?.url],
    ].filter(([, url]) => Boolean(url));

    // Log service names in a single line
    const serviceNames = serviceEntries.map(([name]) => name).join(", ");
    logger.log(`Services included in the SSH tunnel: ${serviceNames}`);

    // Add all services to SSH command
    serviceEntries.forEach(([, url]) => addPortToCommand(url!));

    sshCommand += " user@remote_host";

    logger.log("SSH tunnel command for all services:");
    logger.log(sshCommand);
  },
});
