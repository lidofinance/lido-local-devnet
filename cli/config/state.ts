import { JsonDb } from "../lib/state/index.js";
import path from "path";
import { z, ZodSchema } from "zod";
import {
  ChainConfigSchema,
  LidoConfigSchema,
  CSMConfigSchema,
  Config,
  ConfigValidator,
} from "./schemas.js";
import {
  ARTIFACTS_PATH,
  STATE_FILE,
  PARSED_CONSENSUS_GENESIS_FILE,
} from "./constants.js";

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
  private parsedConsensusGenesisState: JsonDb;
  private config: Config;

  constructor(network: string, rawConfig: unknown) {
    this.config = ConfigValidator.validate(rawConfig);
    this.appState = new JsonDb(path.join(ARTIFACTS_PATH, network, STATE_FILE));
    this.parsedConsensusGenesisState = new JsonDb(
      path.join(ARTIFACTS_PATH, network, PARSED_CONSENSUS_GENESIS_FILE)
    );
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
      const dbPath = keys[key];
      result[key] = (groupConfig as any)[key] ?? dbReader.get(dbPath);
    }

    return schema.parse(result); // Validate the result using the provided schema
  }

  async getChain(): Promise<z.infer<typeof ChainConfigSchema>> {
    const reader = await this.appState.getReader();
    return this.getProperties(
      {
        elPrivate: "chain.binding.elNodesPrivate.0",
        clPrivate: "chain.binding.clNodesPrivate.0",
        elPublic: "network.binding.elNodes.0",
        clPublic: "network.binding.clNodes.0",
      },
      "chain",
      ChainConfigSchema,
      reader
    );
  }

  async getLido(): Promise<z.infer<typeof LidoConfigSchema>> {
    const reader = await this.appState.getReader();
    return this.getProperties(
      {
        agent: "lidoCore.app:aragon-agent.proxy.address",
        voting: "lidoCore.app:aragon-voting.proxy.address",
        tokenManager: "lidoCore.app:aragon-token-manager.proxy.address",
        sanityChecker: "lidoCore.oracleReportSanityChecker.address",
        accountingOracle: "lidoCore.accountingOracle.proxy.address",
        validatorExitBus: "lidoCore.validatorsExitBusOracle.proxy.address",
        locator: "lidoCore.lidoLocator.proxy.address",
      },
      "lido",
      LidoConfigSchema,
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
        module: "csm.CSModule",
        verifier: "csm.CSVerifier",
        gateSeal: "csm.GateSeal",
        hashConsensus: "csm.HashConsensus",
        lidoLocator: "csm.LidoLocator",
      },
      "csm",
      CSMConfigSchema,
      reader
    );
  }

  // async getGenesisValidatorsRoot(): Promise<string> {
  //   const reader = await this.parsedConsensusGenesisState.getReader();
  //   return (
  //     this.config.chain?.genesisValidatorsRoot ??
  //     reader.getOrError("genesis_validators_root")
  //   );
  // }

  async updateChain(jsonData: unknown) {
    await this.appState.update({ chain: jsonData });
  }

  async updateLido(jsonData: unknown) {
    await this.appState.update({ lidoCore: jsonData });
  }

  async updateCSM(jsonData: unknown) {
    await this.appState.update({ csm: jsonData });
  }
}
