import {Command} from "@oclif/core";
import {execa} from "execa";
import {getEnv} from "../../lib/headwatcher/env.js";

export default class HeadwatcherDown extends Command {
  static description = "Shutdown Ethereum Head Watcher";

  async run() {
    this.log("Stopping Ethereum Head Watcher...");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.yml", "down", "-v"],
        {
          stdio: "inherit",
          cwd: import.meta.dirname,
          env: await getEnv()
        }
      );
      this.log("Ethereum Head Watcher stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Ethereum Head Watcher: ${error.message}`);
    }
  }
}
