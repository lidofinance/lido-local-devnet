import { Command, Flags } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { waitEL } from "../../../lib/network/index.js";
import fs from "fs/promises";

export default class DeployCSVerifier extends Command {
  static description =
    "Deploys the CSVerifier smart contract using configured deployment scripts.";
  static flags = {
    verify: Flags.boolean({
      char: "v",
      description: "Verify the smart contract after deployment",
    }),
  };

  async run() {
    const { flags } = await this.parse(DeployCSVerifier);

    this.log("Initiating the deployment of the CSVerifier smart contract...");

    const csmConfig = baseConfig.onchain.lido.csm;
    const commandRoot = csmConfig.paths.root;
    const csmDefaultEnv = csmConfig.env;

    const state = await jsonDb.getReader();

    const rpc = state.getOrError("network.binding.elNodes.0");
    // const rpc = "http://localhost:8545";

    this.log(`Waiting for the Execution Layer node at ${rpc} to be ready...`);

    await waitEL(rpc);

    const deployEnv = {
      // Infrastructure
      RPC_URL: rpc,
      DEPLOYER_PRIVATE_KEY: csmDefaultEnv.DEPLOYER_PRIVATE_KEY,
      DEPLOY_CONFIG: csmDefaultEnv.DEPLOY_CONFIG,
      UPGRADE_CONFIG: csmDefaultEnv.UPGRADE_CONFIG,
      CHAIN: csmDefaultEnv.CHAIN,
      ARTIFACTS_DIR: csmDefaultEnv.ARTIFACTS_DIR,

      VERIFIER_URL: csmDefaultEnv.VERIFIER_URL,
      DEVNET_CHAIN_ID: csmDefaultEnv.DEVNET_CHAIN_ID,
      VERIFIER_API_KEY: csmDefaultEnv.VERIFIER_API_KEY,

      CSM_WITHDRAWAL_VAULT: state.getOrError(
        "lidoCore.withdrawalVault.proxy.address"
      ),
      CSM_MODULE: state.getOrError("csm.CSModule"),
    };

    this.logJson(deployEnv);

    this.log("Executing CSVerifier deployment scripts...");
    // forge script ./script/DeployCSVerifierElectra.s.sol:DeployCSVerifier[Holesky|Mainnet|DevNet]
    await execa("just", ["clean"], {
      cwd: commandRoot,
      stdio: "inherit",
      env: deployEnv,
    });

    await this.config.runCommand("onchain:csm:install");

    const args = [
      "script",
      "./script/DeployCSVerifierElectra.s.sol:DeployCSVerifierDevNet",
      "--broadcast",
      "--rpc-url",
      rpc,
    ];
    if (flags.verify)
      args.push(
        "--verify",
        "--verifier",
        "custom",
        "--chain",
        csmDefaultEnv.DEVNET_CHAIN_ID,
        "--verifier-url",
        csmDefaultEnv.VERIFIER_URL,
        "--verifier-api-key",
        csmDefaultEnv.VERIFIER_API_KEY
      );

    await execa("forge", args, {
      cwd: commandRoot,
      stdio: "inherit",
      env: deployEnv,
    });

    const deployedVerifier = baseConfig.onchain.lido.csm.paths.deployedVerifier;
    const fileContent = await fs.readFile(deployedVerifier, "utf8");
    const jsonData = JSON.parse(fileContent);

    await jsonDb.update({ electraVerifier: jsonData });

    this.log("CSVerifier smart contract deployment completed successfully.");
  }
}
