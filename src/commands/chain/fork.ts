import { execa } from "execa";

import { command } from "../../command/command.js";

export const StartAnvil = command.cli({
  description:
    "Start Anvil in fork mode connected to a specified Ethereum node",
  params: {},
  async handler({ logger, dre }) {
    const { state } = dre;

    const { elPublic } = await state.getChain();

    logger(`Starting Anvil forking from: ${elPublic}...`);

    await execa("anvil", ["--steps-tracing", "--fork-url", elPublic], {
      stdio: "inherit",
    });
  },
});
