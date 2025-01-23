import { DevNetServiceConfig } from "../command/user-service.js";

export const blockscout = new DevNetServiceConfig({
  config: "services/blockscout",
  name: "blockscout" as const,
});

export const lidoCore = new DevNetServiceConfig({
  repository: "submodules/lido-core",
  name: "lidoCore" as const,
});

export const lidoCLI = new DevNetServiceConfig({
  repository: "submodules/lido-cli",
  name: "lidoCLI" as const,
});

export const kurtosis = new DevNetServiceConfig({
  config: "services/kurtosis",
  name: "kurtosis" as const,
});
