import { Command } from "@oclif/core";
import fs from "fs/promises";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";
import YAML from "yaml";

export default class DoraUp extends Command {
  static description = "Start Dora";

  async run() {
    this.log("Starting Dora...");
    const { config, configTemplate } = baseConfig.dora.paths;
    const configTemplateYaml = YAML.parse(
      await fs.readFile(configTemplate, "utf-8")
    );

    const state = await jsonDb.read();
    const { network } = baseConfig;

    const el = state.network?.binding?.elNodesPrivate?.[0] ?? network.el.url;
    const cl = state.network?.binding?.clNodesPrivate?.[0] ?? network.el.url;
    const name = state.network?.binding?.name ?? network.name;

    configTemplateYaml.beaconapi.endpoints = [
      {
        name: "local",
        url: cl,
      },
    ];

    configTemplateYaml.executionapi.endpoints = [
      {
        name: "local",
        url: el,
      },
    ];

    await fs.writeFile(config, YAML.stringify(configTemplateYaml), "utf-8");
    try {
      await execa("docker", ["compose", "up", "-d"], {
        stdio: "inherit",
        cwd: baseConfig.dora.paths.root,
        env: { DOCKER_NETWORK_NAME: `kt-${name}` },
      });
      this.log("Dora started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Dora: ${error.message}`);
    }
  }
}
