import { Command, Flags } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../../config/index.js";
import {
  getGenesisTime,
} from "../../../lib/index.js";
import { waitEL } from "../../../lib/network/index.js";

type CSMENVConfig = typeof baseConfig.onchain.lido.csm.env;

export default class DeployLidoContracts extends Command {
  static description =
    "Deploys csm smart contracts using configured deployment scripts.";
  static flags = {
    verify: Flags.boolean({
      char: "v",
      description: "Verify smart contracts",
    }),
  };

  async run() {
    const { flags } = await this.parse(DeployLidoContracts);

    this.log("Initiating the deployment of csm smart contracts...");

    const csmConfig = baseConfig.onchain.lido.csm;
    const commandRoot = csmConfig.paths.root;
    const csmDefaultEnv = csmConfig.env;

    const state = await jsonDb.getReader();

    const rpc = state.getOrError("network.binding.elNodes.0");
    // const rpc = "http://localhost:8545";

    this.log(`Waiting for the execution node at ${rpc} to be ready...`);

    await waitEL(rpc);

    const deployEnv: CSMENVConfig = {
      // infra
      RPC_URL: rpc,
      DEPLOYER_PRIVATE_KEY: csmDefaultEnv.DEPLOYER_PRIVATE_KEY,
      DEPLOY_CONFIG: csmDefaultEnv.DEPLOY_CONFIG,
      UPGRADE_CONFIG: csmDefaultEnv.UPGRADE_CONFIG,
      CHAIN: csmDefaultEnv.CHAIN,
      ARTIFACTS_DIR: csmDefaultEnv.ARTIFACTS_DIR,
      // smart contract params
      // genesis time from local network genesis.json file
      DEVNET_GENESIS_TIME: getGenesisTime(baseConfig.artifacts.paths.genesis),
      // Lido's locator address
      CSM_LOCATOR_ADDRESS: state.getOrError(
        "lidoCore.lidoLocator.proxy.address"
      ),
      // Address of the Aragon agent
      CSM_ARAGON_AGENT_ADDRESS: state.getOrError(
        "lidoCore.app:aragon-agent.proxy.address"
      ),
      // Address of the EVM script executor
      EVM_SCRIPT_EXECUTOR_ADDRESS: state.getOrError(
        "lidoCore.app:aragon-agent.proxy.address"
      ),
      // Address of the first administrator, usually a Dev team EOA
      CSM_FIRST_ADMIN_ADDRESS: csmDefaultEnv.CSM_FIRST_ADMIN_ADDRESS,
      // oracle member addresses
      CSM_ORACLE_1_ADDRESS: csmDefaultEnv.CSM_ORACLE_1_ADDRESS,
      CSM_ORACLE_2_ADDRESS: csmDefaultEnv.CSM_ORACLE_2_ADDRESS,
      CSM_ORACLE_3_ADDRESS: csmDefaultEnv.CSM_ORACLE_3_ADDRESS,
      // Address of the treasury associated with the locator
      CSM_LOCATOR_TREASURY_ADDRESS: state.getOrError(
        "lidoCore.lidoLocator.implementation.constructorArgs.0.treasury"
      ),
      // Address of the second administrator, usually a Dev team EOA
      CSM_SECOND_ADMIN_ADDRESS: csmDefaultEnv.CSM_SECOND_ADMIN_ADDRESS,
      DEVNET_SLOTS_PER_EPOCH: String(baseConfig.kurtosis.slotsPerEpoch),

      VERIFIER_URL: csmDefaultEnv.VERIFIER_URL,
      DEVNET_CHAIN_ID: csmDefaultEnv.DEVNET_CHAIN_ID,
      VERIFIER_API_KEY: csmDefaultEnv.VERIFIER_API_KEY,
    };

    this.logJson(deployEnv);

    this.log("Executing deployment scripts...");

    await execa("just", ["clean"], {
      cwd: commandRoot,
      stdio: "inherit",
      env: deployEnv,
    });

    await this.config.runCommand("onchain:csm:install");

    const args = ["deploy-local-devnet"];
    if (flags.verify)
      args.push(
        "--verify",
        " --verifier",
        "custom",
        "--chain",
        csmDefaultEnv.DEVNET_CHAIN_ID
      );

    await execa("just", args, {
      cwd: commandRoot,
      stdio: "inherit",
      env: deployEnv,
    });

    await this.config.runCommand("onchain:csm:update-state");

    this.log("Deployment of smart contracts completed successfully.");
  }
}
