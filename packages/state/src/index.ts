import { DepositData, DepositDataResult, Keystores } from "@devnet/keygen";

import { BaseState } from "./base-state.js";
import { WALLET_KEYS_COUNT } from "./constants.js";
import {
  CSMConfigSchema,
  CSMNewVerifierSchema,
  ChainState,
  DataBusConfigSchema,
  KurtosisSchema,
  ParsedConsensusGenesisStateSchema,
  WalletSchema,
} from "./schemas.js";
import { sharedWallet } from "./shared-wallet.js";
import { generateKeysFromMnemonicOnce } from "./wallet/index.js";

export { Config } from './schemas.js';

export interface StateInterface extends State {
  // augmented in user code
}

export class State extends BaseState {
    async getChain<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      "chain",
      "chain",
      ChainState,
      must,
    );
  }

  async updateChain(state: ChainState) {
    await this.updateProperties("chain", state);
  }

  async getCSM<M extends boolean = true>(must: M = true as M) {
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
        permissionlessGate: "csm.PermissionlessGate",
      },
      "csm",
      CSMConfigSchema,
      must,
    );
  }

  async getDataBus<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        address: "dataBus.contract.address",
      },
      "dataBus",
      DataBusConfigSchema,
      must,
    );
  }

  async getDepositData() {
    const currentState = await this.validators.read();
    return currentState?.depositData as ({ used?: boolean } & DepositData)[];
  }

  async getKeystores() {
    const currentState = await this.validators.read();
    return currentState?.keystores as Keystores[];
  }

  async getKurtosis() {
    const { kurtosis } = this.config;
    const loadConfig = await KurtosisSchema.parseAsync(kurtosis);

    return loadConfig;
  }

  async getNamedWallet() {
    const [
      deployer,
      secondDeployer,
      oracle1,
      oracle2,
      oracle3,
      council1,
      council2,
    ] = await this.getWallet();

    return {
      deployer,
      secondDeployer,
      oracle1,
      oracle2,
      oracle3,
      oracles: [oracle1, oracle2, oracle3],
      council1,
      council2,
      councils: [council1, council2],
    };
  }

  async getNewVerifier<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        CSVerifier: "electraVerifier.CSVerifier",
      },
      "csm",
      CSMNewVerifierSchema,
      must,
    );
  }

  async getParsedConsensusGenesisState<M extends boolean = true>(
    must: M = true as M,
  ) {
    return this.getProperties(
      {
        genesisValidatorsRoot: "genesis_validators_root",
        genesisTime: "genesis_time",
      },
      "parsedConsensusGenesisState",
      ParsedConsensusGenesisStateSchema,
      must,
    );
  }

  async getWallet() {
    let { wallet } = this.config;
    if (!wallet && this.config.walletMnemonic) {
      wallet = generateKeysFromMnemonicOnce(
        this.config.walletMnemonic,
        WALLET_KEYS_COUNT,
      );
    }

    return WalletSchema.parseAsync(wallet ?? sharedWallet);
  }

  async updateCSM(jsonData: unknown) {
    await this.updateProperties("csm", jsonData);
  }

  async updateDataBus(jsonData: unknown) {
    await this.updateProperties("dataBus", jsonData);
  }

  async updateDepositData(depositData: ({ used?: boolean } & DepositData)[]) {
    const currentState = await this.validators.read();
    const updated = {
      depositData,
      keystores: [...(currentState?.keystores ?? [])],
    };
    await this.validators.update(updated);
  }

  async updateElectraVerifier(jsonData: unknown) {
    await this.appState.update({ electraVerifier: jsonData });
  }

  async updateValidatorsData(newData: DepositDataResult) {
    const currentState = await this.validators.read();
    const updated = {
      depositData: [
        ...(currentState?.depositData ?? []),
        ...newData.map((entry) => entry.depositData),
      ],
      keystores: [
        ...(currentState?.keystores ?? []),
        ...newData.map((entry) => entry.keystore),
      ],
    };
    await this.validators.update(updated);
  }
}
