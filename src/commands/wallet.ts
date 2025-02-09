import { command } from "@devnet/command";

export const PrintWallet = command.cli({
  description: "Print current network wallet",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const wallet = await dre.state.getNamedWallet();
    logger.logJson(wallet);
  },
});
