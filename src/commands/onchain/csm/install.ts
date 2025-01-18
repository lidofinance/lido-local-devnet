import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../../config/index.js";

export class LidoCoreInstall extends Command {
  static description = "Install and build dependencies in the csm directory";

  async run() {
    const csmConfig = baseConfig.onchain.lido.csm;
    const commandRoot = csmConfig.paths.root;

    this.log();
    this.log(
      `Initiating 'just deps' in the csm directory at ${commandRoot}...`
    );

    await execa("just", ["deps"], {
      cwd: commandRoot,
      env: { CHAIN: csmConfig.env.CHAIN },
      stdio: "inherit",
    });

    this.log(
      "Dependencies installation completed successfully in the csm directory."
    );

    this.log();
    this.log("---------------------------------------------------");
    this.log();

    // this.log(
    //   `Initiating 'just build' in the csm directory at ${commandRoot}...`
    // );

    // await execa("just", ["build"], {
    //   cwd: commandRoot,
    //   stdio: "inherit",
    //   env: { CHAIN: csmConfig.env.CHAIN },
    // });

    // this.log("Dependencies build completed successfully in the csm directory.");
    // this.log();
  }
}
