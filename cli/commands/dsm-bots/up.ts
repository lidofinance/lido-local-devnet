import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";
import { getLidoLocatorAddress } from "../../lib/lido/index.js";
import fs from "fs/promises";

export default class DSMBotsUp extends Command {
  static description = "Start DSM-bots";

  async run() {
    this.log("Starting DSM-bots...");

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodesPrivate.0");
    // TODO: optional data-bus
    const dataBusAddress: string = state.getOrError("dataBus.contract.address");
    const name: string = state.getOrError("network.name");

    const locator = await getLidoLocatorAddress();
    const env = {
      WEB3_RPC_ENDPOINTS: el,

      // Account private key
      WALLET_PRIVATE_KEY: baseConfig.wallet.privateKey,

      // App specific
      LIDO_LOCATOR: locator,

      DEPOSIT_CONTRACT: "0x4242424242424242424242424242424242424242",

      // Message transports
      // rabbit / onchain_transport
      MESSAGE_TRANSPORTS: "onchain_transport",

      // data-bus config
      ONCHAIN_TRANSPORT_ADDRESS: dataBusAddress,
      ONCHAIN_TRANSPORT_RPC_ENDPOINTS: el,

      // RabbitMQ secrets
      RABBIT_MQ_URL: "ws://dsm_rabbit:15674/ws",
      RABBIT_MQ_USERNAME: "guest",
      RABBIT_MQ_PASSWORD: "guest",

      // Transactions settings
      CREATE_TRANSACTIONS: true,

      // Flashbots RPC
      // FLASHBOTS_RPC: "https://relay-goerli.flashbots.net",
      // FLASHBOT_SIGNATURE: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",

      // Staking modules whitelist
      DEPOSIT_MODULES_WHITELIST: "1,2,3",

      // Prometheus metrics prefix
      PROMETHEUS_PREFIX: "depositor_bot",

      DOCKER_NETWORK_NAME: `kt-${name}`,
    };

    const envPath = `${baseConfig.dsmBots.paths.ofchain}/.env`;
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
          cwd: baseConfig.dsmBots.paths.ofchain,
        }
      );
      this.log("DSM-bots started successfully.");
    } catch (error: any) {
      this.error(`Failed to start DSM-bots: ${error.message}`);
    }
  }
}
