import {Command} from "@oclif/core";
import {execa} from "execa";
import {baseConfig, jsonDb} from "../../config/index.js";
import fs from "fs/promises";

interface ENV {
  CHAIN_ID: string;
  EXECUTION_CLIENT_URI: string;
  CONSENSUS_CLIENT_URI: string;
  DOCKER_NETWORK_NAME: string;
}

export default class AssertoorUp extends Command {
  static description = "Start Assertoor";

  async run() {
    this.log("Starting Assertoor...");

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodesPrivate.0");
    const cl: string = state.getOrError("network.binding.clNodesPrivate.0");
    const name: string = state.getOrError("network.name");

    const env: ENV = {
      CHAIN_ID: "32382",

      EXECUTION_CLIENT_URI: el,
      CONSENSUS_CLIENT_URI: cl,

      DOCKER_NETWORK_NAME: `kt-${name}`,
    };

    const envPath = `${baseConfig.assertoor.paths.root}/.env`;
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    await fs.writeFile(envPath, envContent, "utf-8");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.yml", "up", "--build", "-d"],
        {
          stdio: "inherit",
          cwd: baseConfig.assertoor.paths.root,
        }
      );
      this.log("Assertoor started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Assertoor: ${error.message}`);
    }
  }
}
