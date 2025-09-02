import { command } from "@devnet/command";
import { execa } from "execa";

export const ChainStartAnvilFork = command.cli({
  description:
    "Start Anvil in fork mode connected to a specified Ethereum node",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const { state } = dre;

    const { elPublic } = await state.getChain();

    logger.log(`Starting Anvil forking from: ${elPublic}...`);

    await execa("anvil", ["--steps-tracing", "--fork-url", elPublic], {
      stdio: "inherit",
    });
  },
});
