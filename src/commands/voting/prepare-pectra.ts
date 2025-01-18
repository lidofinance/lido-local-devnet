import { Command } from "@oclif/core";
import { execa } from "execa";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import * as YAML from "yaml";

import { baseConfig, jsonDb } from "../../config/index.js";

interface Config {
  ACCOUNTING_ORACLE: string;
  AGENT: string;
  CHAIN_NETWORK_NAME: string;
  CS_FEE_ORACLE_ADDRESS: string;
  CS_VERIFIER_ADDRESS: string;
  CS_VERIFIER_ADDRESS_OLD: string;
  CSM_ADDRESS: string;
  ORACLE_REPORT_SANITY_CHECKER: string;
  TOKEN_MANAGER: string;
  VALIDATORS_EXIT_BUS_ORACLE: string;
  VOTING: string;
}

export default class PreparePectraVoting extends Command {
  static description = "Prepare pectra voting";

  async run() {
    const state = await jsonDb.getReader();

    const rpc = state.getOrError("network.binding.elNodes.0");

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
      ACCOUNTING_ORACLE: accountingOracle,
      AGENT: agent,
      // didnt find there to fix "Unexpected name of net. Should be one of: dict_keys(['mainnet', 'goerli', 'holesky', 'sepolia'])"
      CHAIN_NETWORK_NAME: "mainnet",
      CS_FEE_ORACLE_ADDRESS: csFeeOracleAddress,
      CS_VERIFIER_ADDRESS: newCSVerifier,
      CS_VERIFIER_ADDRESS_OLD: csVerifier,
      CSM_ADDRESS: csm,
      ORACLE_REPORT_SANITY_CHECKER: sanityChecker,
      TOKEN_MANAGER: tokenManager,
      VALIDATORS_EXIT_BUS_ORACLE: validatorExitBus,
      VOTING: voting,
    };

    const envPath = `${baseConfig.voting.paths.root}/configs/config_devnet4.py`;
    const configContent = Object.entries(config)
      .map(([key, value]) => `${key}="${value}"`)
      .join("\n");
    await fs.writeFile(envPath, configContent, "utf-8");

    const networkPath = path.join(baseConfig.voting.paths.root, "network-config.yaml");
    const configTemplateYaml = YAML.parse(
      await fs.readFile(networkPath, "utf8")
    );
    assert(
      Array.isArray(configTemplateYaml.development),
      "'development' must be an array"
    );

    const devnet4Config = configTemplateYaml.development.find(
      (c: { name: string }) => c.name === "Devnet4"
    );
    assert(devnet4Config, "Devnet4 configuration not found");

    assert(typeof rpc === "string" && rpc.includes(":"), "Invalid RPC format");
    const parsedPort = rpc.split(":").at(-1)
    assert(parsedPort, "Invalid Port format");

    const port = Number.parseInt(parsedPort, 10);
    assert(!Number.isNaN(port), "Failed to parse port");

    devnet4Config.cmd_settings.port = port;

    await fs.writeFile(
      networkPath,
      YAML.stringify(configTemplateYaml),
      "utf-8"
    );

    const cwd = baseConfig.voting.paths.root;

    await execa(
      "poetry",
      ["run", "brownie", "networks", "import", "network-config.yaml", "True"],
      { cwd, stdio: "inherit" }
    );
  }
}
