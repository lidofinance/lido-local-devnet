/* eslint-disable no-bitwise */
import { services } from "@devnet/service";
import chalk from "chalk";
import { ExecaMethod, execa } from "execa";

import { DevNetServiceConfig } from "../user-service.js";
import { ServiceArtifact } from "./service-artifact.js";
type DevNetServices = typeof services;

const getColorForText = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const color = `#${((hash >> 24) & 0xff).toString(16).padStart(2, "0")}${(
    (hash >> 16) &
    0xff
  )
    .toString(16)
    .padStart(2, "0")}${((hash >> 8) & 0xff).toString(16).padStart(2, "0")}`;
  return color;
};

const colorCache: { [key: string]: string } = {};

const getCachedColor = (text: string): string => {
  if (!colorCache[text]) {
    colorCache[text] = getColorForText(text);
  }

  return colorCache[text];
};

const transform = async function* (
  color: string,
  separator: string,
  chunk: any,
) {
  yield `${chalk.hex(color)(`${separator}`)} ${chunk}`;
};

const applyColor = (color: string, text: string) => chalk.hex(color)(text);
export class DevNetService<Name extends keyof DevNetServices> {
  public artifact: ServiceArtifact;
  public config: DevNetServiceConfig<DevNetServices[Name]["constants"]>;
  public sh!: ExecaMethod<{
    cwd: string;
    env: Record<string, string> | undefined;
    stdio: "inherit";
  }>;

  private network: string;

  constructor(name: Name, network: string, artifact: ServiceArtifact) {
    this.config = services[name];
    this.artifact = artifact;
    this.network = network;

    this.createShellWrapper();
  }

  static async getNew<Name extends keyof DevNetServices>(
    rootPath: string,
    network: string,
    name: Name,
  ): Promise<DevNetService<Name>> {
    const artifact = await ServiceArtifact.getNew(rootPath, services[name]);
    const service = new DevNetService(name, network, artifact);

    return service;
  }

  private createShellWrapper() {
    const { env } = this.config;
    const { root: cwd } = this.artifact;
    const { name } = this.config;
    const { network } = this;

    const color = getCachedColor(`${network}/${name}`);
    const sh = execa({
      cwd,
      env,
      shell: true,
      stdout: [
        async function* (chunk: any) {
          yield* transform(color, "||", chunk);
        },
        "inherit",
      ],
      stderr: [
        async function* (chunk: any) {
          yield* transform(color, "||", chunk);
        },
        "inherit",
      ],
      stdin: "inherit",

      verbose(_: any, { ...verboseObject }: any) {
        if (verboseObject.type === "command") {
          return console.log(
            applyColor(
              color,
              `\\\\ [${`${network}/${name}`}]: ${verboseObject.escapedCommand}`,
            ),
          );
        }

        if (verboseObject.type === "duration") {
          const ms = Math.floor(verboseObject.result.durationMs)
          return console.log(
            applyColor(
              color,
              `// [${`${network}/${name}`}]: ${verboseObject.escapedCommand} finished in ${ms}ms`,
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
