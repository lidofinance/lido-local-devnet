import { execa } from "execa";

import { DevNetServiceConfig } from "../user-service.js";
import { ServiceArtifact } from "./service-artifact.js";

export class DevNetServiceService {
  public artifact: ServiceArtifact;
  public config: DevNetServiceConfig;
  public sh!: typeof execa;

  constructor(config: DevNetServiceConfig, artifact: ServiceArtifact) {
    this.config = config;
    this.artifact = artifact;

    this.createShellWrapper();
  }

  static async getNew(rootPath: string, config: DevNetServiceConfig) {
    const artifact = await ServiceArtifact.getNew(rootPath, config);
    const service = new DevNetServiceService(config, artifact);

    return service;
  }

  private createShellWrapper() {
    const { env } = this.config;
    const { root: cwd } = this.artifact;
    this.sh = execa({
      env,
      cwd,
      stdin: ["inherit"],
      stdout: ["inherit"],
      stderr: ["inherit"],
    });
  }
}
