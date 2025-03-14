import { Params, command } from "@devnet/command";

import { CSMInstall } from "./install.js";
import { CSMUpdateState } from "./update-state.js";

type CSMENVConfig = {
  FOUNDRY_PROFILE: string;
  ARTIFACTS_DIR: string;
  // CHAIN: string;
  CSM_ARAGON_AGENT_ADDRESS: string;
  CSM_FIRST_ADMIN_ADDRESS: string;
  CSM_LOCATOR_ADDRESS: string;
  CSM_LOCATOR_TREASURY_ADDRESS: string;
  CSM_ORACLE_1_ADDRESS: string;
  CSM_ORACLE_2_ADDRESS: string;
  CSM_ORACLE_3_ADDRESS: string;
  CSM_SECOND_ADMIN_ADDRESS: string;
  DEPLOY_CONFIG: string;
  DEPLOYER_PRIVATE_KEY: string;
  DEVNET_CHAIN_ID: string;
  DEVNET_ELECTRA_EPOCH: string;
  DEVNET_GENESIS_TIME: string;
  DEVNET_SLOTS_PER_EPOCH: string;
  EVM_SCRIPT_EXECUTOR_ADDRESS: string;
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
  },
  async handler({ params, dre, dre: { logger } }) {
    const { state, services, network } = dre;
    const { csm } = services;
    const {
      config: { constants },
    } = csm;

    await dre.network.waitEL();

    const { agent, locator, treasury } = await state.getLido();
    const { elPublic } = await state.getChain();
    const { deployer, secondDeployer, oracle1, oracle2, oracle3 } =
      await state.getNamedWallet();

    const clClient = await network.getCLClient();

    const {
      data: { genesis_time },
    } = await clClient.getGenesis();

    const {
      data: { ELECTRA_FORK_EPOCH, SLOTS_PER_EPOCH },
    } = await clClient.getConfig();

    const blockscoutConfig = await state.getBlockScout();

    const env: CSMENVConfig = {
      FOUNDRY_PROFILE: constants.FOUNDRY_PROFILE,
      ARTIFACTS_DIR: constants.ARTIFACTS_DIR,
      CSM_ARAGON_AGENT_ADDRESS: agent,
      CSM_FIRST_ADMIN_ADDRESS: deployer.publicKey,
      CSM_LOCATOR_ADDRESS: locator,
      CSM_LOCATOR_TREASURY_ADDRESS: treasury,

      CSM_ORACLE_1_ADDRESS: oracle1.publicKey,
      CSM_ORACLE_2_ADDRESS: oracle2.publicKey,
      CSM_ORACLE_3_ADDRESS: oracle3.publicKey,

      CSM_SECOND_ADMIN_ADDRESS: secondDeployer.publicKey,
      DEPLOY_CONFIG: constants.DEPLOY_CONFIG,
      DEPLOYER_PRIVATE_KEY: deployer.privateKey,
      DEVNET_CHAIN_ID: "32382",

      DEVNET_ELECTRA_EPOCH: ELECTRA_FORK_EPOCH,
      DEVNET_GENESIS_TIME: genesis_time,
      DEVNET_SLOTS_PER_EPOCH: SLOTS_PER_EPOCH,
      EVM_SCRIPT_EXECUTOR_ADDRESS: agent,
      RPC_URL: elPublic,
      UPGRADE_CONFIG: constants.UPGRADE_CONFIG,
      VERIFIER_API_KEY: constants.VERIFIER_API_KEY,

      VERIFIER_URL: blockscoutConfig.api,
    };

    logger.logJson(env);

    const csmSh = csm.sh({ env });
    await csmSh`just clean`;

    await dre.runCommand(CSMInstall, {});

    const args = ["deploy-live-no-confirm", "-g", "300"];
    if (params.verify) {
      args.push("--verify", "--verifier", "blockscout", "--chain", "32382");
    }

    await csmSh`just ${args}`;

    await dre.runCommand(CSMUpdateState, {});
  },
});
