import path from "node:path";
import { ZodSchema, z } from "zod";

import { JsonDb } from "../lib/state/index.js";
import { generateKeysFromMnemonicOnce } from "../lib/wallet/index.js";
import {
  ARTIFACTS_PATH,
  PARSED_CONSENSUS_GENESIS_FILE,
  STATE_FILE,
  WALLET_KEYS_COUNT,
} from "./constants.js";
import {
  CSMConfigSchema,
  ChainConfigSchema,
  Config,
  ConfigValidator,
  LidoConfigSchema,
  WalletSchema,
} from "./schemas.js";
import { sharedWallet } from "./shared-wallet.js";

/**
 * The State class is responsible for managing and retrieving configuration data from both a user-provided config object
 * and a JSON database. It supports three primary configuration groups: chain, lido, and csm, each with their own mappings.
 *
 * - The constructor validates the raw config using Zod schemas and initializes JSON database readers.
 * - The `getProperties` method handles retrieval of configuration values, prioritizing user config over database values,
 *   and validates the final result using Zod schemas.
 * - Each group (chain, lido, csm) has a dedicated method to retrieve its corresponding configuration.
 *
 * This class ensures type safety and flexibility by leveraging Zod schemas for validation and TypeScript for strong typing.
 */
export class State {
  private appState: JsonDb;
  private config: Config;
  private parsedConsensusGenesisState: JsonDb;

  constructor(network: string, rawConfig: unknown) {
    this.config = ConfigValidator.validate(rawConfig);
    this.appState = new JsonDb(path.join(ARTIFACTS_PATH, network, STATE_FILE));
    this.parsedConsensusGenesisState = new JsonDb(
      path.join(ARTIFACTS_PATH, network, PARSED_CONSENSUS_GENESIS_FILE)
    );
  }

  async getChain(): Promise<z.infer<typeof ChainConfigSchema>> {
    const reader = await this.appState.getReader();
    return this.getProperties(
      {
        clPrivate: "chain.binding.clNodesPrivate.0",
        clPublic: "network.binding.clNodes.0",
        elPrivate: "chain.binding.elNodesPrivate.0",
        elPublic: "network.binding.elNodes.0",
      },
      "chain",
      ChainConfigSchema,
      reader
    );
  }

  async getCSM(): Promise<z.infer<typeof CSMConfigSchema>> {
    const reader = await this.appState.getReader();
    return this.getProperties(
      {
        accounting: "csm.CSAccounting",
        earlyAdoption: "csm.CSEarlyAdoption",
        feeDistributor: "csm.CSFeeDistributor",
        feeOracle: "csm.CSFeeOracle",
        gateSeal: "csm.GateSeal",
        hashConsensus: "csm.HashConsensus",
        lidoLocator: "csm.LidoLocator",
        module: "csm.CSModule",
        verifier: "csm.CSVerifier",
      },
      "csm",
      CSMConfigSchema,
      reader
    );
  }

  async getLido(): Promise<z.infer<typeof LidoConfigSchema>> {
    const reader = await this.appState.getReader();
    return this.getProperties(
      {
        accountingOracle: "lidoCore.accountingOracle.proxy.address",
        agent: "lidoCore.app:aragon-agent.proxy.address",
        locator: "lidoCore.lidoLocator.proxy.address",
        sanityChecker: "lidoCore.oracleReportSanityChecker.address",
        tokenManager: "lidoCore.app:aragon-token-manager.proxy.address",
        validatorExitBus: "lidoCore.validatorsExitBusOracle.proxy.address",
        voting: "lidoCore.app:aragon-voting.proxy.address",
      },
      "lido",
      LidoConfigSchema,
      reader
    );
  }

  async getWallet() {
    let {wallet} = this.config;

    if (!wallet && this.config.walletMnemonic) {
      wallet = generateKeysFromMnemonicOnce(
        this.config.walletMnemonic,
        WALLET_KEYS_COUNT
      );
    }

    return WalletSchema.parseAsync(wallet ?? sharedWallet);
  }

  async updateChain(jsonData: unknown) {
    await this.appState.update({ chain: jsonData });
  }

  async updateCSM(jsonData: unknown) {
    await this.appState.update({ csm: jsonData });
  }

  async updateLido(jsonData: unknown) {
    await this.appState.update({ lidoCore: jsonData });
  }

  private async getProperties<T extends Record<string, any>>(
    keys: { [K in keyof T]: string },
    group: keyof Config,
    schema: ZodSchema<T>,
    dbReader: { get: (key: string) => any }
  ): Promise<T> {
    const result: Partial<T> = {};
    const groupConfig = this.config[group] || {};
    for (const key in keys) {
      if (Object.hasOwn(keys, key)) {
        const dbPath = keys[key];
        result[key] = (groupConfig as any)[key] ?? dbReader.get(dbPath);
      }
    }

    return schema.parse(result); // Validate the result using the provided schema
  }
}
