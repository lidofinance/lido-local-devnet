import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";
import { getLidoLocatorAddress } from "../../lib/lido/index.js";
import fs from "fs/promises";

export default class DSMUp extends Command {
  static description = "Start Council";

  async run() {
    this.log("Starting Council...");

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodesPrivate.0");
    // TODO: optional data-bus
    const dataBusAddress: string = state.getOrError("dataBus.contract.address");
    const name: string = state.getOrError("network.name");

    const locator = await getLidoLocatorAddress();
    const env = {
      PORT_1: 9040,
      PORT_2: 9041,
      LOG_LEVEL: "debug",
      LOG_FORMAT: "json",
      RPC_URL: el,
      WALLET_PRIVATE_KEY_1:
        baseConfig.ofchain.lidoCLI.activate.councils[0].privateKey,
      WALLET_PRIVATE_KEY_2:
        baseConfig.ofchain.lidoCLI.activate.councils[1].privateKey,
      KEYS_API_HOST: "http://keys_api",
      KEYS_API_PORT: 9030,
      // evm-chain / rabbitmq
      PUBSUB_SERVICE: "evm-chain",

      EVM_CHAIN_DATA_BUS_ADDRESS: dataBusAddress,
      EVM_CHAIN_DATA_BUS_PROVIDER_URL: el,

      RABBITMQ_URL: "ws://dsm_rabbit:15674/ws",
      RABBITMQ_LOGIN: "guest",
      RABBITMQ_PASSCODE: "guest",

      LOCATOR_DEVNET_ADDRESS: `"${locator}"`,
      DOCKER_NETWORK_NAME: `kt-${name}`,
    };

    const envPath = `${baseConfig.council.paths.ofchain}/.env`;
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    await fs.writeFile(envPath, envContent, "utf-8");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "up", "--build", "-d"],
        {
          stdio: "inherit",
          cwd: baseConfig.council.paths.ofchain,
        }
      );
      this.log("Council started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Council: ${error.message}`);
    }
  }
}
