import { Params, command } from "@devnet/command";
import { JsonRpcProvider } from "ethers";

import { csmExtension } from "./extensions/csm.extension.js";
import { CSMInstall } from "./install.js";
import { CSMUpdateState } from "./update-state.js";

type CSMENVConfig = {
  ARTIFACTS_DIR: string;
  // CHAIN: string;
  CSM_ARAGON_AGENT_ADDRESS: string;
  CSM_EPOCHS_PER_FRAME: string;
  CSM_FIRST_ADMIN_ADDRESS: string;
  CSM_LOCATOR_ADDRESS: string;
  CSM_LOCATOR_TREASURY_ADDRESS: string;
  CSM_ORACLE_1_ADDRESS: string;
  CSM_ORACLE_2_ADDRESS: string;
  CSM_ORACLE_3_ADDRESS: string;
  CSM_RESEAL_MANAGER_ADDRESS: string;
  CSM_SECOND_ADMIN_ADDRESS: string;
  CSM_STAKING_MODULE_ID: string;
  DEPLOY_CONFIG: string;
  DEPLOYER_PRIVATE_KEY: string;
  DEVNET_CAPELLA_EPOCH: string;
  DEVNET_CHAIN_ID: string;
  DEVNET_ELECTRA_EPOCH: string;
  DEVNET_GENESIS_TIME: string;
  DEVNET_SLOTS_PER_EPOCH: string;
  EVM_SCRIPT_EXECUTOR_ADDRESS: string;
  FOUNDRY_BLOCK_GAS_LIMIT: string;
  FOUNDRY_PROFILE: string;
  RPC_URL: string;
  UPGRADE_CONFIG: string;
  VERIFIER_API_KEY: string;
  VERIFIER_URL: string;
};

export const DeployCSMContracts = command.cli({
  description:
    "Deploys CSM smart contracts using configured deployment scripts.",
  params: {
    verify: Params.boolean({
      description: "Verify smart contracts",
    }),
    verifierUrl: Params.string({
      description:
        "External block explorer API URL for contract verification (e.g. https://explorer.epbs-devnet-0.ethpandaops.io/api). Overrides Blockscout from state.",
    }),
  },
  extensions: [csmExtension],
  async handler({ params, dre, dre: { logger } }) {
    const { state, services, network } = dre;
    const { csm, oracle } = services;
    const {
      config: { constants },
    } = csm;

    if (await state.isCSMDeployed()) {
      logger.log("CSM contracts are already deployed.");
      return;
    }

    await dre.network.waitEL();

    const { agent, locator, treasury } = await state.getLido();
    const { elPublic } = await state.getChain();
    const { deployer, secondDeployer, oracle1, oracle2, oracle3 } =
      await state.getNamedWallet();

    const provider = new JsonRpcProvider(elPublic);
    const { chainId } = await provider.getNetwork();
    const chainIdStr = chainId.toString();

    await network.waitCL();
    const clClient = await network.getCLClient();

    const {
      data: { genesis_time },
    } = await clClient.getGenesis();

    const {
      data: { ELECTRA_FORK_EPOCH, SLOTS_PER_EPOCH, CAPELLA_FORK_EPOCH },
    } = await clClient.getConfig();

    let verifierUrl = "";

    if (params.verifierUrl) {
      verifierUrl = params.verifierUrl;
    } else if (process.env.EXTERNAL_VERIFIER_URL) {
      verifierUrl = process.env.EXTERNAL_VERIFIER_URL;
    } else if (params.verify) {
      const blockscoutConfig = await state.getBlockscout();
      verifierUrl = blockscoutConfig.api;
    }

    const env: CSMENVConfig = {
      FOUNDRY_PROFILE: constants.FOUNDRY_PROFILE,
      ARTIFACTS_DIR: constants.ARTIFACTS_DIR,
      CSM_ARAGON_AGENT_ADDRESS: agent,
      CSM_FIRST_ADMIN_ADDRESS: agent,
      CSM_LOCATOR_ADDRESS: locator,
      CSM_LOCATOR_TREASURY_ADDRESS: treasury,
      CSM_EPOCHS_PER_FRAME: oracle.config.constants.HASH_CONSENSUS_CSM_EPOCHS_PER_FRAME.toString(),

      CSM_ORACLE_1_ADDRESS: oracle1.publicKey,
      CSM_ORACLE_2_ADDRESS: oracle2.publicKey,
      CSM_ORACLE_3_ADDRESS: oracle3.publicKey,

      CSM_SECOND_ADMIN_ADDRESS: secondDeployer.publicKey,
      CSM_STAKING_MODULE_ID: constants.CSM_STAKING_MODULE_ID,
      DEVNET_CAPELLA_EPOCH: CAPELLA_FORK_EPOCH,
      DEPLOY_CONFIG: constants.DEPLOY_CONFIG,
      DEPLOYER_PRIVATE_KEY: deployer.privateKey,
      DEVNET_CHAIN_ID: chainIdStr,

      DEVNET_ELECTRA_EPOCH: ELECTRA_FORK_EPOCH,
      DEVNET_GENESIS_TIME: genesis_time,
      DEVNET_SLOTS_PER_EPOCH: SLOTS_PER_EPOCH,
      EVM_SCRIPT_EXECUTOR_ADDRESS: agent,
      CSM_RESEAL_MANAGER_ADDRESS: deployer.publicKey,
      RPC_URL: elPublic,
      UPGRADE_CONFIG: constants.UPGRADE_CONFIG,
      VERIFIER_API_KEY: constants.VERIFIER_API_KEY,

      VERIFIER_URL: verifierUrl,
      FOUNDRY_BLOCK_GAS_LIMIT: "1000000000"
    };

    logger.logJson(env);

    const csmSh = csm.sh({ env });
    await csmSh`just clean`;

    await dre.runCommand(CSMInstall, {});

    const args = ["deploy-live-no-confirm", "-g", "200", "--legacy", "--private-key", "$DEPLOYER_PRIVATE_KEY"];
    if (params.verify) {
      args.push("--verify", "--verifier", "blockscout", "--chain", chainIdStr);
    }

    await csmSh`just ${args}`;

    await dre.runCommand(CSMUpdateState, {});
  },
});
