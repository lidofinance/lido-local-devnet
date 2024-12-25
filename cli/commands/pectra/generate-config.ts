import { Command } from "@oclif/core";
import { execa } from "execa";
import { jsonDb } from "../../config/index.js";
import fs from "fs/promises";
import path from "path";

interface Config {
  AGENT: string;
  VOTING: string;
  TOKEN_MANAGER: string;
  ORACLE_REPORT_SANITY_CHECKER: string;
  ACCOUNTING_ORACLE: string;
  VALIDATORS_EXIT_BUS_ORACLE: string;
  CSM_ADDRESS: string;
  CS_FEE_ORACLE_ADDRESS: string;
  CS_VERIFIER_ADDRESS: string;
  CS_VERIFIER_ADDRESS_OLD: string;
  CHAIN_NETWORK_NAME: string;
}

export default class VotingStart extends Command {
  static description = "Start pectra voting";

  async run() {
    const state = await jsonDb.getReader();

    const agent = state.getOrError("lidoCore.app:aragon-agent.proxy.address");
    const voting = state.getOrError("lidoCore.app:aragon-voting.proxy.address");
    const tokenManager = state.getOrError(
      "lidoCore.app:aragon-token-manager.proxy.address"
    );
    const sanityChecker = state.getOrError(
      "lidoCore.oracleReportSanityChecker.address"
    );
    const accountingOracle = state.getOrError(
      "lidoCore.accountingOracle.proxy.address"
    );
    const validatorExitBus = state.getOrError(
      "lidoCore.validatorsExitBusOracle.proxy.address"
    );
    const csm = state.getOrError("csm.CSModule");
    const csFeeOracleAddress = state.getOrError("csm.CSFeeOracle");
    const csVerifier = state.getOrError("csm.CSVerifier");
    const newCSVerifier = state.getOrError("electraVerifier.CSVerifier");

    const config: Config = {
      AGENT: agent,
      VOTING: voting,
      TOKEN_MANAGER: tokenManager,
      ORACLE_REPORT_SANITY_CHECKER: sanityChecker,
      ACCOUNTING_ORACLE: accountingOracle,
      VALIDATORS_EXIT_BUS_ORACLE: validatorExitBus,
      CSM_ADDRESS: csm,
      CS_FEE_ORACLE_ADDRESS: csFeeOracleAddress,
      CS_VERIFIER_ADDRESS: newCSVerifier,
      CS_VERIFIER_ADDRESS_OLD: csVerifier,
      // didnt find there to fix "Unexpected name of net. Should be one of: dict_keys(['mainnet', 'goerli', 'holesky', 'sepolia'])"
      CHAIN_NETWORK_NAME: "mainnet",
    };

    const OFFCHAIN_ROOT = path.join(process.cwd(), "ofchain");
    const SCRIPTS_PATH = path.join(OFFCHAIN_ROOT, "scripts");

    const envPath = `${SCRIPTS_PATH}/configs/config_devnet4.py`;
    const configContent = Object.entries(config)
      .map(([key, value]) => `${key}="${value}"`)
      .join("\n");
    await fs.writeFile(envPath, configContent, "utf-8");
  }
}
