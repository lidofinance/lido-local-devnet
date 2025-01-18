import { State } from "../../config/state.js";
import { readFile } from "fs/promises";
import YAML from "yaml";
import { USER_CONFIG_PATH } from "../../config/constants.js";

export const loadUserConfig = async () => {
  return YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));
};

export class Network {
  name: string;
  state: State;
  constructor(network: string, rawConfig: unknown) {
    this.name = network;
    this.state = new State(network, rawConfig);
  }

  static async getNew(network: string) {
    const userConfig = await loadUserConfig().catch(() =>
      console.log("User config not found, use empty object")
    );

    const networkConfig =
      userConfig?.networks?.find((net: any) => net?.name === network) ?? {};

    return new Network(network, networkConfig);
  }
}
