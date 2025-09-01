import { command } from "@devnet/command";

export const BlockscoutGetInfo = command.isomorphic({
  description:
    "Retrieves and displays information about the blockscout service.",
  params: {},
  async handler({ dre: { logger, state } }) {
    const blockscoutDeployed = await state.isBlockscoutDeployed();
    if (!blockscoutDeployed) {
      logger.log(`Blockscout service is not enabled`);
      return;
    }

    logger.log("");

    const blockscoutInfo = await state.getBlockscout();

    logger.table(
      ["Service", "URL"],
      [
        ["blockscout-ui", blockscoutInfo.url!],
        ["blockscout-api", blockscoutInfo.api!],
      ],
    );
  },
});
