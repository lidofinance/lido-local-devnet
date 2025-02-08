import { DevNetServiceConfig, services } from "@devnet/service";
import chalk from "chalk";
import { ExecaMethod, execa } from "execa";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assert } from "../assert.js";
import {
  PublicPortInfo,
  getContainersByServiceLabels,
  getServiceInfo,
  getServiceInfoByLabel,
} from "../docker/index.js";
import { DevNetLogger } from "../logger.js";
import {
  applyColor,
  getCachedColor,
  // getSeparator,
  // transformCMDOutput,
} from "../ui.js";
import { ServiceArtifact } from "./service-artifact.js";

type DevNetServices = typeof services;
export class DevNetService<Name extends keyof DevNetServices> {
  public artifact: ServiceArtifact;
  public config: DevNetServiceConfig<DevNetServices[Name]["constants"]>;
  public sh!: ExecaMethod<{
    cwd: string;
    env: Record<string, string> | undefined;
    stdio: "inherit";
  }>;

  private commandName: string;
  private logger: DevNetLogger;

  private network: string;

  constructor(
    name: Name,
    network: string,
    logger: DevNetLogger,
    commandName: string,
    artifact: ServiceArtifact,
  ) {
    this.config = services[name];
    this.artifact = artifact;
    this.network = network;
    this.commandName = commandName;

    this.logger = logger;

    this.createShellWrapper();
  }

  static async getNew<Name extends keyof DevNetServices>(
    rootPath: string,
    network: string,
    logger: DevNetLogger,
    commandName: string,
    name: Name,
  ): Promise<DevNetService<Name>> {
    const artifact = await ServiceArtifact.getNew(
      rootPath,
      services[name],
      logger,
    );
    const service = new DevNetService(
      name,
      network,
      logger,
      commandName,
      artifact,
    );

    return service;
  }

  public clone(commandName: string, logger: DevNetLogger) {
    return new DevNetService(
      this.config.name as Name,
      this.network,
      logger,
      commandName,
      this.artifact,
    );
  }

  public async getDockerInfo() {
    const { labels } = this.config;
    return (await getContainersByServiceLabels)<DevNetServices[Name]["labels"]>(
      labels,
      `kt-${this.network}`,
    );
  }

  public async getDockerServiceInfoByLabel(labelKey: string, label: string) {
    const info = await getServiceInfoByLabel(labelKey, label);

    assert(
      info !== null,
      `No data found for the service (${this.config.name}) in the docker network`,
    );

    return info;
  }

  public async getExposedPorts(): Promise<PublicPortInfo[]> {
    const { exposedPorts } = this.config;
    assert(
      exposedPorts !== undefined,
      `It is impossible to get exposedPorts because this service (${this.config.name}) does not have this config.`,
    );

    const info = await Promise.all(
      exposedPorts.map(async (port) =>
        getServiceInfo(port, `kt-${this.network}`),
      ),
    );

    const validInfo = info.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    assert(
      validInfo.length === info.length,
      `No data found for the service (${this.config.name}) in the docker network`,
    );

    return validInfo;
  }

  public async mkdirp(relativePath: string) {
    const servicePath = this.artifact.root;
    const fullPath = path.join(servicePath, relativePath);

    this.logger.log(
      `Creating directory: "${fullPath}" for service "${this.config.name}"`,
    );

    return await mkdir(fullPath, { recursive: true });
  }

  public async readFile(relativePath: string) {
    const servicePath = this.artifact.root;
    this.logger.log(
      `Reading artifact for service "${this.config.name}" at path: "${relativePath}"`,
    );
    return await readFile(path.join(servicePath, relativePath), "utf8");
  }

  public async readJson(relativePath: string) {
    return JSON.parse(await this.readFile(relativePath));
  }

  public async writeENV(relativePath: string, env: Record<string, string>) {
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    return await this.writeFile(relativePath, envContent);
  }

  public async writeFile(relativePath: string, fileContent: string) {
    const servicePath = this.artifact.root;
    this.logger.log(
      `Writing artifact for service "${this.config.name}" to path: "${relativePath}"`,
    );
    return await writeFile(
      path.join(servicePath, relativePath),
      fileContent,
      "utf8",
    );
  }

  public async writeJson(relativePath: string, fileContent: unknown) {
    return await this.writeFile(relativePath, JSON.stringify(fileContent));
  }

  private createShellWrapper() {
    const { env } = this.config;
    const { root: cwd } = this.artifact;
    const { name } = this.config;
    const { network } = this;

    const nestedCommandColor = getCachedColor(`${network}/${name}`);
    const commandColor = DevNetLogger.getColor(network, this.commandName);
    const sh = execa({
      cwd,
      env,
      shell: true,
      stdout: [
        // async function* (chunk: any) {
        //   yield* transformCMDOutput(color, "||", chunk);
        // },
        "inherit",
      ],
      stderr: [
        // async function* (chunk: any) {
        //   yield* transformCMDOutput(color, "||", chunk);
        // },
        "inherit",
      ],
      stdin: "inherit",

      verbose(_: any, { ...verboseObject }: any) {
        if (verboseObject.type === "command") {
          // console.log(`${getSeparator(commandColor, "||")}`);
          console.log(
            applyColor(
              commandColor,
              `\\\\ [${`${network}/${name}`}]: ${applyColor(nestedCommandColor, verboseObject.escapedCommand)}`,
            ),
          );

          // return console.log(getSeparator(color, "||"));
          return console.log();
        }

        if (verboseObject.type === "duration") {
          console.log();
          // console.log(verboseObject.result.failed);
          if (verboseObject.result.failed) {
            // console.log(verboseObject.result)
            // shortMessage
            // const errorMessage = verboseObject.result.stderr.replaceAll(getSeparator(color, '||'), '')
            // console.log(`${getSeparator(color, '||')}${chalk.red(errorMessage)}`)
            // console.log(
            //   `${getSeparator(commandColor, "||")} ${chalk.red(verboseObject.result.shortMessage)}`,
            // );
            console.log(`${chalk.red(verboseObject.result.shortMessage)}`);
            console.log();
          }

          // console.log(getSeparator(color, "||"));
          // console.log();

          const ms = Math.floor(verboseObject.result.durationMs);
          return console.log(
            applyColor(
              commandColor,
              `// [${`${network}/${name}`}]: ${applyColor(nestedCommandColor, `${verboseObject.escapedCommand} finished in ${ms}ms`)}`,
            ),
          );
        }
      },
    });

    this.sh = sh as unknown as ExecaMethod<{
      cwd: string;
      env: Record<string, string> | undefined;
      stdio: "inherit";
    }>;
  }
}
