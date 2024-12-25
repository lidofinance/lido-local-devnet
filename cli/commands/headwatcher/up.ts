import {Command} from "@oclif/core";
import {execa} from "execa";
import {getEnv} from "./common.js";

export default class HeadwatcherUp extends Command {
  static description = "Start Ethereum Head Watcher";

  async run() {
    this.log("Starting Ethereum Head Watcher...");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.yml", "up", "--build", "-d"],
        {
          stdio: "inherit",
          cwd: import.meta.dirname,
          env: await getEnv()
        }
      );
      this.log("Ethereum Head Watcher started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Ethereum Head Watcher: ${error.message}`);
    }
  }
}
