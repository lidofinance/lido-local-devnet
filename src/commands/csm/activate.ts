// services/lido-cli/programs/omnibus-scripts/devnet-csm-start.ts

import { command } from "@devnet/command";

type CSMActivateENV = {
  CS_ACCOUNTING_ADDRESS: string;
  CS_MODULE_ADDRESS: string;
  CS_ORACLE_HASH_CONSENSUS_ADDRESS: string;
  CS_ORACLE_INITIAL_EPOCH: string;
  EL_API_PROVIDER: string;
};

export const ActivateCSM = command.cli({
  description:
    "Activates the csm by deploying smart contracts and configuring the environment based on the current network state.",
  params: {},
  async handler({ dre, dre: { logger, network } }) {
    const { lidoCLI, oracle } = dre.services;

    const { elPublic } = await dre.state.getChain();
    const csmState = await dre.state.getCSM();
    const clClient = await network.getCLClient();

    await dre.network.waitEL();

    const {
      HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    } = oracle.config.constants;

    const epochPerFrame = Math.max(
      HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    );

    const currentEpoch = await clClient.getHeadEpoch();
    const initialEpoch = epochPerFrame + currentEpoch + 2;

    const env: CSMActivateENV = {
      CS_ACCOUNTING_ADDRESS: csmState.accounting,
      CS_MODULE_ADDRESS: csmState.module,
      CS_ORACLE_HASH_CONSENSUS_ADDRESS: csmState.hashConsensus,
      // TODO: calculate it
      CS_ORACLE_INITIAL_EPOCH: initialEpoch.toString(),
      EL_API_PROVIDER: elPublic,
    };

    logger.logJson(env);

    logger.log("Deploying and configuring csm components...");

    await lidoCLI.sh({ env })`./run.sh omnibus script devnetCSMStart`;
  },
});
