import { Command, Flags } from "@oclif/core";
import fs from "node:fs/promises";
import path from "node:path";

import { baseConfig, validatorsState } from "../../../config/index.js";
import { getLidoWCDepositForm } from "../../../lib/lido/index.js";

interface ValidatorData {
  used: boolean;
  withdrawal_credentials: string;
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
    // validator dir
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify(lidoUnusedKeys, null, 2),
      "utf-8"
    );

    // lido cli dir
    const cliKeysRoot = path.join(
      baseConfig.services.lidoCLI.paths.root,
      "generated-keys"
    );
    const cliKeysFileName = path.join(cliKeysRoot, `${flags.name}.json`);
    await fs.mkdir(cliKeysRoot, { recursive: true });
    await fs.writeFile(
      cliKeysFileName,
      JSON.stringify(lidoUnusedKeys, null, 2),
      "utf-8"
    );

    // Mark keys as used
    for (const k of lidoKeys) (k.used = true);
    await validatorsState.write(currentState);

    this.log(`Keys written to ${filePath}`);
    this.log(`Keys written to ${cliKeysFileName}`);
  }
}
