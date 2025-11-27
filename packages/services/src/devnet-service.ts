import {
  ContainerInfo,
  PublicPortInfo,
  getContainersByServiceLabels,
  getContainersByServiceLabelsOrNull,
  getServiceInfo,
  getServiceInfoByLabel,
} from "@devnet/docker";
import { DevNetLogger } from "@devnet/logger";
import {
  Network,
  NetworkArtifactRoot,
  Path,
} from "@devnet/types";
import { assert } from "@devnet/utils";
import {
  access,
  constants,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import * as YAML from "yaml";

import { DevnetServiceArtifact } from "./devnet-service-artifact.js";
import { serviceConfigs } from "./embedded/index.js";
import { DevNetServicesConfigs } from "./services-configs.js";
import { createShellWrapper } from "./shell-wrapper.js";


export class DevNetService<Name extends keyof DevNetServicesConfigs> {
  public artifact: DevnetServiceArtifact;
  public config: DevNetServicesConfigs[Name];

  public sh: ReturnType<typeof createShellWrapper<Name>>;

  private commandName: string;
  private logger: DevNetLogger;
  private network: Network;


  protected constructor(
    name: Name,
    network: Network,
    logger: DevNetLogger,
    commandName: string,
    artifact: DevnetServiceArtifact,
  ) {
    this.config = serviceConfigs[name];
    this.artifact = artifact;
    this.network = network;
    this.commandName = commandName;

    this.logger = logger;

    this.sh = createShellWrapper(this.config, this.artifact, network, commandName);
  }

  public static async create<Name extends keyof DevNetServicesConfigs>(
    networkArtifactRootPath: NetworkArtifactRoot,
    network: Network,
    logger: DevNetLogger,
    commandName: string,
    name: Name,
  ): Promise<DevNetService<Name>> {
    const artifact = await DevnetServiceArtifact.create(
      networkArtifactRootPath,
      serviceConfigs[name],
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

  public async fileExists(relativePath: string | Path): Promise<boolean> {
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
      ? Record<keyof DevNetServicesConfigs[Name]["labels"], ContainerInfo[]>
      : Record<keyof DevNetServicesConfigs[Name]["labels"], ContainerInfo[]> | null
  > {
    const { labels } = this.config;
    // todo: make something with dora
    if (must) {
      return await getContainersByServiceLabels<DevNetServicesConfigs[Name]["labels"]>(
        labels,
        `kt-${this.network}`,
      );
    }

    const result = await getContainersByServiceLabelsOrNull<
      DevNetServicesConfigs[Name]["labels"]
    >(labels, `kt-${this.network}`);

    return result as M extends true
      ? Record<keyof DevNetServicesConfigs[Name]["labels"], ContainerInfo[]>
      : Record<keyof DevNetServicesConfigs[Name]["labels"], ContainerInfo[]> | null;
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
    return YAML.parse(await this.readFile(relativePath), { intAsBigInt: true });
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
}
