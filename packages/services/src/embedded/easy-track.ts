import { DevnetServiceConfig } from "../devnet-service-config.js";

export const easyTrack = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/easy-track.git",
    branch: "feat/cmv2-srv3-factories",
  },
  workspace: "workspaces/easy-track",
  name: "easyTrack" as const,
  constants: {},
  installCommand: "npm install",
  labels: {},
  getters: {},
});
