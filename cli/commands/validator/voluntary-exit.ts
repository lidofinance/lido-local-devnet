import { Command, Flags } from "@oclif/core";
import { baseConfig } from "../../config/index.js";
import { runLidoCLI } from "../../lib/lido-cli/index.js";

const {
  paths: { root },
} = baseConfig.ofchain.lidoCLI;

const mnemonics = {
  genesis:
    "giant issue aisle success illegal bike spike question tent bar rely arctic volcano long crawl hungry vocal artwork sniff fantasy very lucky have athlete",
  generated:
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
};

export default class VoluntaryExit extends Command {
  static description =
    "Performs voluntary exit of a validator from the Lido protocol.";
  static flags = {
    mtype: Flags.option({
      description: "Type of mnemonic to use.",
      options: ["genesis", "generated"] as const,
      required: true,
    })(),
    index: Flags.integer({
      description: "Index of the validator to exit.",
      required: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(VoluntaryExit);

    this.log("Starting the voluntary exit process for the Lido protocol...");

    // Ensure all necessary dependencies are installed before execution
    this.log("Validating environment and installing dependencies if needed...");
    await this.config.runCommand("onchain:lido:install");
    this.log("Dependencies are ready. Environment validated successfully.");

    // Perform the voluntary exit process
    this.log(
      `Initiating voluntary exit for validator with index ${flags.index}...`
    );
    await runLidoCLI(
      [
        "validators",
        "voluntary-exit",
        mnemonics[flags.mtype],
        String(flags.index),
      ],
      root,
      {}
    );

    this.log(
      `Validator with index ${flags.index} has exited the protocol successfully.`
    );
  }
}
