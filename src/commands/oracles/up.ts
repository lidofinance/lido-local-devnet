import { Command } from "@oclif/core";
import { execa } from "execa";
import fs from "node:fs/promises";

import { baseConfig, jsonDb } from "../../config/index.js";
import {
  getCSMModuleAddress,
  getLidoLocatorAddress,
} from "../../lib/lido/index.js";

interface ENV {
  CHAIN_ID: string;

  CONSENSUS_CLIENT_URI: string;
  CSM_MODULE_ADDRESS: string;
  DOCKER_NETWORK_NAME: string;
  EXECUTION_CLIENT_URI: string;

  GW3_ACCESS_KEY: string;
  GW3_SECRET_KEY: string;
  LIDO_LOCATOR_ADDRESS: string;
  MEMBER_PRIV_KEY_1: string;
  MEMBER_PRIV_KEY_2: string;

  PINATA_JWT: string;
}

export default class OracleUp extends Command {
  static description = "Start Oracle(s)";

  async run() {
    this.log("Starting Oracle(s)...");

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodesPrivate.0");
    const cl: string = state.getOrError("network.binding.clNodesPrivate.0");
    const name: string = state.getOrError("network.name");

    const locator = await getLidoLocatorAddress();
    const csmModule = await getCSMModuleAddress();

    const env: ENV = {
      CHAIN_ID: "32382",

      CONSENSUS_CLIENT_URI: cl,
      CSM_MODULE_ADDRESS: csmModule,
      DOCKER_NETWORK_NAME: `kt-${name}`,
      EXECUTION_CLIENT_URI: el,

      GW3_ACCESS_KEY: process.env.CSM_ORACLE_GW3_ACCESS_KEY ?? "",
      GW3_SECRET_KEY: process.env.CSM_ORACLE_GW3_SECRET_KEY ?? "",
      LIDO_LOCATOR_ADDRESS: locator,
      MEMBER_PRIV_KEY_1: baseConfig.oracle.wallet[0].privateKey,
      MEMBER_PRIV_KEY_2: baseConfig.oracle.wallet[1].privateKey,
      PINATA_JWT: "",
    };

    const envPath = `${baseConfig.oracle.paths.repository}/.env`;
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    await fs.writeFile(envPath, envContent, "utf-8");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "up", "--build", "-d"],
        {
          cwd: baseConfig.oracle.paths.repository,
          stdio: "inherit",
        },
      );
      this.log("Oracle(s) started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Oracle(s): ${error.message}`);
    }
  }
}
