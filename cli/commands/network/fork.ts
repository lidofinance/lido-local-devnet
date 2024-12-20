import { Command } from "@oclif/core";
import { execa } from "execa";
import { jsonDb } from "../../config/index.js";

export class StartAnvil extends Command {
  static description =
    "Start Anvil in fork mode connected to a specified Ethereum node";

  public async run(): Promise<void> {
    const state = await jsonDb.read();

    const rpc = state.network?.binding?.elNodes?.[0];

    this.log(`Starting Anvil forking from: ${rpc}...`);

    await execa("anvil", ["--steps-tracing", "--fork-url", rpc], { stdio: "inherit" });
  }
}
