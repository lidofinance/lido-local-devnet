import { DepositData, DepositDataResult, Keystores } from "@devnet/keygen";

import { BaseState } from "./base-state.js";
import { WALLET_KEYS_COUNT } from "./constants.js";
import {
  BlockScoutSchema,
  CSMConfigSchema,
  CSMNewVerifierSchema,
  ChainConfigSchema,
  DataBusConfigSchema,
  KurtosisSchema,
  LidoConfigSchema,
  NodesChainConfigSchema,
  ParsedConsensusGenesisStateSchema,
  WalletSchema,
} from "./schemas.js";
import { sharedWallet } from "./shared-wallet.js";
import { generateKeysFromMnemonicOnce } from "./wallet/index.js";

export class State extends BaseState {
  async getBlockScout<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      { url: "blockscout.url", api: "blockscout.api" },
      "blockscout",
      BlockScoutSchema,
      must,
    );
  }

  async getChain<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        clPrivate: "chain.binding.clNodesPrivate.0",
        // clWsPrivate1: "chain.binding.clWsPrivate.1",
        // ...
        clPublic: "chain.binding.clNodes.0",
        elPrivate: "chain.binding.elNodesPrivate.0",
        elPublic: "chain.binding.elNodes.0",
        elWsPublic: "chain.binding.elWs.0",
        elWsPrivate: "chain.binding.elWsPrivate.0",
        validatorsApi: "chain.binding.validatorsApi.0",
        validatorsApiPrivate: "chain.binding.validatorsApiPrivate.0",
      },
      "chain",
      ChainConfigSchema,
      must,
    );
  }

  async getNodes<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        clNodesSpecs: "chain.binding.clNodesSpecs",
      },
      "chain",
      NodesChainConfigSchema,
      must,
    );
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

  async getLido<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        accountingOracle: "lidoCore.accountingOracle.proxy.address",
        agent: "lidoCore.app:aragon-agent.proxy.address",
        locator: "lidoCore.lidoLocator.proxy.address",
        sanityChecker: "lidoCore.oracleReportSanityChecker.address",
        tokenManager: "lidoCore.app:aragon-token-manager.proxy.address",
        validatorExitBus: "lidoCore.validatorsExitBusOracle.proxy.address",
        voting: "lidoCore.app:aragon-voting.proxy.address",
        treasury:
          "lidoCore.withdrawalVault.implementation.constructorArgs.1",

        stakingRouter: "lidoCore.stakingRouter.proxy.address",
        curatedModule: "lidoCore.app:node-operators-registry.proxy.address",
        acl: "lidoCore.aragon-acl.proxy.address",
        oracleDaemonConfig: "lidoCore.oracleDaemonConfig.address",
        withdrawalVault: "lidoCore.withdrawalVault.proxy.address",
        withdrawalQueue: "lidoCore.withdrawalQueueERC721.proxy.address",
        withdrawalVaultImpl: "lidoCore.withdrawalVault.implementation.address",
        validatorExitBusImpl: "lidoCore.validatorsExitBusOracle.implementation.address",
        withdrawalQueueImpl: "lidoCore.withdrawalQueueERC721.implementation.address",
        finance: "lidoCore.app:aragon-finance.proxy.address"
      },
      "lido",
      LidoConfigSchema,
      must,
    );
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

  async updateBlockScout(jsonData: unknown) {
    await this.updateProperties("blockscout", jsonData);
  }

  async updateChain(jsonData: unknown) {
    await this.updateProperties("chain", jsonData);
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

  async updateLido(jsonData: unknown) {
    await this.updateProperties("lidoCore", jsonData);
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
