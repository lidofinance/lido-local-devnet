// services/lido-cli/programs/omnibus-scripts/devnet-csm-start.ts

import { Params, command } from "@devnet/command";

type CMv2ActivateENV = {
  CS_ACCOUNTING_ADDRESS: string;
  CS_MAX_DEPOSITS_PER_BLOCK: string;
  CS_MODULE_ADDRESS: string;
  CS_ORACLE_HASH_CONSENSUS_ADDRESS: string;
  CS_ORACLE_INITIAL_EPOCH: string;
  CS_PRIORITY_EXIT_SHARE_THRESHOLD: string;
  CS_STAKE_SHARE_LIMIT: string;
  EL_API_PROVIDER: string;
  EL_CHAIN_ID: string;
  EL_NETWORK_NAME: string;
  PRIVATE_KEY: string;
};

export const ActivateCMv2 = command.cli({
  description:
    "Activates CMv2 by deploying smart contracts and configuring the environment based on the current network state.",
  params: {
    stakeShareLimitBP: Params.integer({
      description: "CMv2 stake share limit in BP.",
      required: false,
      default: 2000,
    }),
    priorityExitShareThresholdBP: Params.integer({
      description: "CMv2 priority exit share limit in BP.",
      required: false,
      default: 2500,
    }),
    maxDepositsPerBlock: Params.integer({
      description: "CMv2 max deposits per block.",
      required: false,
      default: 30,
    }),
  },
  async handler({ params, dre, dre: { logger, network } }) {
    const { lidoCLI, oracle } = dre.services;
    const { state } = dre;
    const { deployer } = await state.getNamedWallet();
    const { elPublic } = await dre.state.getChain();
    const cmv2State = await dre.state.getCMv2();
    const clClient = await network.getCLClient();

    if (await state.isCMv2Activated()) {
      logger.log("CMv2 already activated");
      return;
    }

    await dre.network.waitEL();

    const { HASH_CONSENSUS_CSM_EPOCHS_PER_FRAME } = oracle.config.constants;

    let currentEpoch = await clClient.getHeadEpoch();
    // Ensure a minimum epoch for having non-zero block roots from CL state on initial epoch.
    currentEpoch = Math.max(currentEpoch, 256); // SLOTS_PER_HISTORICAL_ROOT / SLOTS_PER_EPOCH
    const initialEpoch = HASH_CONSENSUS_CSM_EPOCHS_PER_FRAME + currentEpoch + 2;

    const env: CMv2ActivateENV = {
      CS_ACCOUNTING_ADDRESS: cmv2State.accounting,
      CS_MODULE_ADDRESS: cmv2State.module,
      CS_ORACLE_HASH_CONSENSUS_ADDRESS: cmv2State.hashConsensus,
      CS_STAKE_SHARE_LIMIT: params.stakeShareLimitBP.toString(),
      CS_PRIORITY_EXIT_SHARE_THRESHOLD:
        params.priorityExitShareThresholdBP.toString(),
      CS_MAX_DEPOSITS_PER_BLOCK: params.maxDepositsPerBlock.toString(),
      // TODO: calculate it
      CS_ORACLE_INITIAL_EPOCH: initialEpoch.toString(),
      EL_NETWORK_NAME: "local-devnet",
      EL_API_PROVIDER: elPublic,
      EL_CHAIN_ID: "32382",
      PRIVATE_KEY: deployer.privateKey,
    };

    logger.logJson(env);

    logger.log("Deploying and configuring CMv2 components...");

    await lidoCLI.sh({ env })`./run.sh omnibus script devnetCMv2Start`;

    await state.updateCMv2Activated({ active: true });
  },
});
