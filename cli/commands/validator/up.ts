import * as fs from "fs";
import { parse } from "yaml";
import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb, validatorsState } from "../../config/index.js";
import { fetchActiveValidators } from "../../lib/validator/index.js";
import path from "path";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServicesSequentially(rootPath: string) {
  const filePath = path.join(rootPath, "docker-compose.yaml");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const doc = parse(fileContents);

  if (!doc || !doc.services) {
    throw new Error("No services found in the docker-compose file.");
  }

  const services = Object.keys(doc.services);
  console.log(`Found services: ${services.join(", ")}`);

  for (const service of services) {
    console.log(`Starting service: ${service}`);
    await execa("docker", ["compose", "up", "-d", service, "--remove-orphans"], {
      cwd: rootPath,
      stdio: "inherit",
    });
    console.log(`Service ${service} started, waiting for 2 seconds...`);
    await sleep(3000);
  }

  console.log("All services have been started.");
}

export default class VerifyCore extends Command {
  static description = "Verify deployed lido-core contracts";

  async run() {
    const configDir = baseConfig.validator.paths.docker;
    console.log(configDir);
    await startServicesSequentially(configDir);
  }
}
