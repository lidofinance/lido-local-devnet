import { services } from "@devnet/service";
import chalk from "chalk";
import { ExecaMethod, execa } from "execa";

import { DevNetLogger } from "../logger.js";
import {
  applyColor,
  getCachedColor,
  // getSeparator,
  // transformCMDOutput,
} from "../ui.js";
import { DevNetServiceConfig } from "../user-service.js";
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
  private network: string;

  constructor(
    name: Name,
    network: string,
    commandName: string,
    artifact: ServiceArtifact,
  ) {
    this.config = services[name];
    this.artifact = artifact;
    this.network = network;
    this.commandName = commandName;

    this.createShellWrapper();
  }

  static async getNew<Name extends keyof DevNetServices>(
    rootPath: string,
    network: string,
    commandName: string,
    name: Name,
  ): Promise<DevNetService<Name>> {
    const artifact = await ServiceArtifact.getNew(rootPath, services[name]);
    const service = new DevNetService(name, network, commandName, artifact);

    return service;
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
