import { command } from "@devnet/command";

export const AssertoorGetInfo = command.isomorphic({
  description:
    "Retrieves and displays information about the assertoor service.",
  params: {},
  async handler({
    dre: {
      logger,
      services: { assertoor },
    },
  }) {
    const assertoorInfo = await assertoor.getDockerInfo(false);
    if (!assertoorInfo) {
      logger.log(`Assertoor service is not enabled`);
      return;
    }

    logger.log("");

    logger.table(
      ["Service", "URL"],
      [["assertoor", assertoorInfo.api[0].ports[0].publicUrl!]],
    );
  },
});
