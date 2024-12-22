import { Command, Flags } from "@oclif/core";
import { baseConfig, validatorsState } from "../../../config/index.js";
import { getLidoWCDepositForm } from "../../../lib/lido/index.js";
import fs from "fs/promises";
import path from "path";

interface ValidatorData {
  withdrawal_credentials: string;
  used: boolean;
}

export default class DevNetConfig extends Command {
  static description = "Get keys from internal db";
  static flags = {
    name: Flags.string({
      description: "Name of the validator to create the dump",
      required: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(DevNetConfig);

    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData as ValidatorData[];

    if (!depositData || depositData.length === 0) {
      this.error("Deposit data not found in validator/state.json file");
    }

    const WC = await getLidoWCDepositForm();

    const lidoKeys = depositData.filter((d) => d.withdrawal_credentials === WC);
    const lidoUnusedKeys = lidoKeys.filter((k) => !k.used);

    if (lidoUnusedKeys.length === 0) {
      this.log("No unused keys found.");
      return; // Exit if no unused keys are found
    }

    const baseDir = baseConfig.artifacts.paths.validatorKeysDump;
    const filePath = path.join(baseDir, `${flags.name}.json`);

    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify(lidoUnusedKeys, null, 2),
      "utf-8"
    );

    // Mark keys as used
    lidoKeys.forEach((k) => (k.used = true));
    await validatorsState.write(currentState);

    this.log(`Keys written to ${filePath}`);
  }
}
