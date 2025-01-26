import { services } from "@devnet/service";
import { ExecaMethod, execa } from "execa";

import { applyColor, getCachedColor, transformCMDOutput } from "../ui.js";
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
          yield* transformCMDOutput(color, "||", chunk);
        },
        "inherit",
      ],
      stderr: [
        async function* (chunk: any) {
          yield* transformCMDOutput(color, "||", chunk);
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
          const ms = Math.floor(verboseObject.result.durationMs);
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
