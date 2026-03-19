import { Params, command } from "@devnet/command";

import { cmv2Extension } from "./extensions/cmv2.extension.js";
import { CMv2Install } from "./install.js";
import { CMv2UpdateState } from "./update-state.js";

type CMv2ENVConfig = {
  ARTIFACTS_DIR: string;
  CS_MODULE_NAME: string;
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

export const DeployCMv2Contracts = command.cli({
  description:
    "Deploys CMv2 smart contracts using configured deployment scripts.",
  params: {
    verify: Params.boolean({
      description: "Verify smart contracts",
    }),
  },
  extensions: [cmv2Extension],
  async handler({ params, dre, dre: { logger } }) {
    const { state, services, network } = dre;
    const { cmv2, oracle } = services;
    const {
      config: { constants },
    } = cmv2;

    if (await state.isCMv2Deployed()) {
      logger.log("CMv2 contracts are already deployed.");
      return;
    }

    await dre.network.waitEL();

    const { agent, locator, treasury } = await state.getLido();
    const { elPublic } = await state.getChain();
    const chainId = await network.getChainId();
    const { deployer, secondDeployer, oracle1, oracle2, oracle3 } =
      await state.getNamedWallet();

    await network.waitCL();
    const clClient = await network.getCLClient();

    const {
      data: { genesis_time },
    } = await clClient.getGenesis();

    const {
      data: { ELECTRA_FORK_EPOCH, SLOTS_PER_EPOCH, CAPELLA_FORK_EPOCH },
    } = await clClient.getConfig();

    const blockscoutConfig = await state.getBlockscout();

    const env: CMv2ENVConfig = {
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

      CS_MODULE_NAME: "curated-module-v2",
      CSM_SECOND_ADMIN_ADDRESS: secondDeployer.publicKey,
      CSM_STAKING_MODULE_ID: constants.CSM_STAKING_MODULE_ID,
      DEVNET_CAPELLA_EPOCH: CAPELLA_FORK_EPOCH,
      DEPLOY_CONFIG: constants.DEPLOY_CONFIG,
      DEPLOYER_PRIVATE_KEY: deployer.privateKey,
      DEVNET_CHAIN_ID: chainId,

      DEVNET_ELECTRA_EPOCH: ELECTRA_FORK_EPOCH,
      DEVNET_GENESIS_TIME: genesis_time,
      DEVNET_SLOTS_PER_EPOCH: SLOTS_PER_EPOCH,
      EVM_SCRIPT_EXECUTOR_ADDRESS: agent,
      CSM_RESEAL_MANAGER_ADDRESS: deployer.publicKey,
      RPC_URL: elPublic,
      UPGRADE_CONFIG: constants.UPGRADE_CONFIG,
      VERIFIER_API_KEY: constants.VERIFIER_API_KEY,

      VERIFIER_URL: blockscoutConfig.api,
      FOUNDRY_BLOCK_GAS_LIMIT: "1000000000"
    };

    logger.logJson(env);

    const cmv2Sh = cmv2.sh({ env });
    await cmv2Sh`just clean`;

    await dre.runCommand(CMv2Install, {});

    if (params.verify) {
      await cmv2Sh`just build --skip test`;
    }

    const args = ["deploy-curated-live-no-confirm", "-g", "200", "--legacy", "--private-key", "$DEPLOYER_PRIVATE_KEY"];
    if (params.verify) {
      args.push("--verify", "--verifier", "blockscout", "--chain", chainId);
    }

    await cmv2Sh`just ${args}`;

    await dre.runCommand(CMv2UpdateState, {});
  },
});
