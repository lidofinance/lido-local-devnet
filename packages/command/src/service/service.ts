import { services } from "@devnet/service";
import { ExecaMethod, execa } from "execa";

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

  constructor(name: Name, artifact: ServiceArtifact) {
    this.config = services[name];
    this.artifact = artifact;

    this.createShellWrapper();
  }

  static async getNew<Name extends keyof DevNetServices>(
    rootPath: string,
    name: Name,
  ): Promise<DevNetService<Name>> {
    const artifact = await ServiceArtifact.getNew(
      rootPath,
      services[name],
    );
    const service = new DevNetService(name, artifact);

    return service;
  }

  private createShellWrapper() {
    const { env } = this.config;
    const { root: cwd } = this.artifact;

    this.sh = execa({
      cwd,
      env,
      stdio: "inherit",
    });
  }
}
