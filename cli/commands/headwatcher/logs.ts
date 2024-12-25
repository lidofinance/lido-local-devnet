import {Command} from "@oclif/core";
import {execa} from "execa";
import {getEnv} from "./common.js";

export default class HeadwatcherLogs extends Command {
  static description = "Output logs of Ethereum Head Watcher";

  async run() {
    await execa(
      "docker",
      ["compose", "-f", "docker-compose.yml", "logs", "-f"],
      {
        stdio: "inherit",
        cwd: import.meta.dirname,
        env: await getEnv()
      }
    );
  }
}
