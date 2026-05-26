import { DevnetServiceConfig } from "../devnet-service-config.js";

export const noWidget = new DevnetServiceConfig({
  // TODO: repository lidofinance/node-operators-widget is currently private —
  // re-enable once we have GitHub App auth in the cli-pod.
  // repository: {
  //   url: "git@github.com:lidofinance/node-operators-widget.git",
  //   branch: "feat/fusaka-devnet",
  // },
  workspace: "workspaces/no-widget",
  name: "noWidget" as const,
  constants: {},
  installCommand: "yarn",
  labels: {},
  getters: {},
});
