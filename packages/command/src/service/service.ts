import { DevNetServiceConfig, services } from "@devnet/service";
import chalk from "chalk";
import { ExecaMethod, execa } from "execa";
import {
  access,
  constants,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import * as YAML from "yaml";

import { assert } from "../assert.js";
import {
  ContainerInfo,
  PublicPortInfo,
  getContainersByServiceLabels,
  getContainersByServiceLabelsOrNull,
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

  // TODO: move to command and use as hook
  public async applyWorkspace() {
    if (!this.config.workspace) return;
    await this.artifact.copyFilesFrom(this.config.workspace);
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

  public async fileExists(relativePath: string): Promise<boolean> {
    const servicePath = this.artifact.root;
    const fullPath = path.join(servicePath, relativePath);

    try {
      await access(fullPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async getDockerInfo<M extends boolean = true>(
    must: M = true as M,
  ): Promise<
    M extends true
      ? Record<keyof DevNetServices[Name]["labels"], ContainerInfo[]>
      : Record<keyof DevNetServices[Name]["labels"], ContainerInfo[]> | null
  > {
    const { labels } = this.config;
    // todo: make something with dora
    delete labels['dora'];
    if (must) {
      return await getContainersByServiceLabels<DevNetServices[Name]["labels"]>(
        labels,
        `kt-${this.network}`,
      );
    }

    const result = await getContainersByServiceLabelsOrNull<
      DevNetServices[Name]["labels"]
    >(labels, `kt-${this.network}`);

    return result as M extends true
      ? Record<keyof DevNetServices[Name]["labels"], ContainerInfo[]>
      : Record<keyof DevNetServices[Name]["labels"], ContainerInfo[]> | null;
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

  public async readYaml(relativePath: string) {
    return YAML.parse(await this.readFile(relativePath));
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

  public async writeJson(
    relativePath: string,
    fileContent: unknown,
    format = false,
  ) {
    const json = format
      ? JSON.stringify(fileContent, null, 2)
      : JSON.stringify(fileContent);
    return await this.writeFile(relativePath, json);
  }

  public async writeYaml(relativePath: string, fileContent: unknown) {
    return await this.writeFile(relativePath, YAML.stringify(fileContent));
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
          if (verboseObject.result.failed) {
            console.log(`${chalk.red(verboseObject.result.shortMessage)}`);
            console.log();

            if (verboseObject.result.stderr) {
              console.log(`${chalk.red('stderr:')} ${verboseObject.result.stderr}`);
            }
          }

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
