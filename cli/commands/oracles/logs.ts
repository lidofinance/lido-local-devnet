import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";
import OracleDown from "./down.js";

export default class OracleLogs extends Command {
  static description = "Show Oracle(s) logs";

  async run() {
    await execa(
      "docker",
      ["compose", "-f", "docker-compose.devnet.yml", "logs", "-f"],
      {
        stdio: "inherit",
        cwd: baseConfig.oracle.paths.ofchain,
        //   cwd: baseConfig.kapi.paths.root,
      }
    );
  }
}
