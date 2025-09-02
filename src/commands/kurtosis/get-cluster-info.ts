import { command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";

export const KurtosisGetClusterInfo = command.isomorphic({
  description:
    "Get the Kurtosis cluster type",
  params: {},
  async handler({dre: { logger, services: { kurtosis }}}) {
    logger.log("Kurtosis cluster info");

    const result = await kurtosis.sh({
        stdout: ["pipe"],
        stderr: ["pipe"],
        verbose() {},
      })`kurtosis cluster get`
      .catch((error) => logger.error(error.message));

    const kurtosisClusterType = result?.stdout.trim();

    if (!kurtosisClusterType) {
      throw new DevNetError('Unable to detect kurtosis cluster type');
    }

    return kurtosisClusterType;
  },
});
