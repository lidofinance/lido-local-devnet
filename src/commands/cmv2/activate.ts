// services/lido-cli/programs/omnibus-scripts/devnet-csm-start.ts

import { Params, command } from "@devnet/command";

type CMv2ActivateENV = {
  CS_ACCOUNTING_ADDRESS: string;
  CS_EJECTOR_ADDRESS?: string;
  CS_MAX_DEPOSITS_PER_BLOCK: string;
  CS_MODULE_ADDRESS: string;
  CS_ORACLE_HASH_CONSENSUS_ADDRESS: string;
  CS_ORACLE_INITIAL_EPOCH: string;
  CS_PRIORITY_EXIT_SHARE_THRESHOLD: string;
  CS_STAKE_SHARE_LIMIT: string;
  CS_TRIGGERABLE_WITHDRAWALS_GATEWAY_ADDRESS?: string;
  CS_TWG_ADDRESS?: string;
  EL_API_PROVIDER: string;
  EL_CHAIN_ID: string;
  EL_NETWORK_NAME: string;
  PRIVATE_KEY: string;
};

type LidoCLIFileService = {
  readFile: (relativePath: string) => Promise<string>;
  writeFile: (relativePath: string, fileContent: string) => Promise<void>;
};

const patchDevnetCmv2StartMetaRegistryGrant = async (
  lidoCLI: LidoCLIFileService,
  logger: { log: (message: string) => void; warn: (message: string) => void },
) => {
  const scriptPath = "programs/omnibus-scripts/devnet-cmv2-start.ts";
  const current = await lidoCLI.readFile(scriptPath);
  const marker = "skipping direct MANAGE_OPERATOR_GROUPS_ROLE grant and relying on the follow-up vote flow";

  if (current.includes(marker)) {
    return;
  }

  const original = `    if (!hasManageOperatorGroupsRole) {
      if (walletAddress != metaRegistryAdmin) {
        throw new Error(
          \`Wallet \${walletAddress} is not MetaRegistry admin \${metaRegistryAdmin}. Cannot grant MANAGE_OPERATOR_GROUPS_ROLE.\`,
        );
      }

      await (
        await metaRegistryAccessControl.grantRole(
          await getRoleHashByAddress(metaRegistryAddress, 'MANAGE_OPERATOR_GROUPS_ROLE'),
          CS_META_REGISTRY_ROLE_GRANTEE,
        )
      ).wait();
    }`;

  const patched = `    if (!hasManageOperatorGroupsRole) {
      if (walletAddress != metaRegistryAdmin) {
        console.log(
          \`[cmv2] Wallet \${walletAddress} is not MetaRegistry admin \${metaRegistryAdmin}; skipping direct MANAGE_OPERATOR_GROUPS_ROLE grant and relying on the follow-up vote flow\`,
        );
      } else {
        await (
          await metaRegistryAccessControl.grantRole(
            await getRoleHashByAddress(metaRegistryAddress, 'MANAGE_OPERATOR_GROUPS_ROLE'),
            CS_META_REGISTRY_ROLE_GRANTEE,
          )
        ).wait();
      }
    }`;

  if (!current.includes(original)) {
    logger.warn("Unable to patch devnetCMv2Start MetaRegistry grant block automatically");
    return;
  }

  await lidoCLI.writeFile(scriptPath, current.replace(original, patched));
  logger.log("Patched devnetCMv2Start to skip direct MetaRegistry grant when admin is the agent");
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
    const { lidoCLI, oracle, cmv2 } = dre.services;
    const { state } = dre;
    const { deployer } = await state.getNamedWallet();
    const { elPublic } = await dre.state.getChain();
    const cmv2State = await dre.state.getCMv2();
    const { triggerableWithdrawalsGateway } = await dre.state.getLido();
    const cmv2DeployState = (await cmv2.readJson(cmv2.config.constants.DEPLOY_CONFIG).catch(() => ({}))) as {
      Ejector?: string;
    };
    const cmv2Ejector = cmv2State.ejector ?? cmv2DeployState.Ejector;
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
      ...(cmv2Ejector ? { CS_EJECTOR_ADDRESS: cmv2Ejector } : {}),
      ...(triggerableWithdrawalsGateway
        ? {
            CS_TRIGGERABLE_WITHDRAWALS_GATEWAY_ADDRESS: triggerableWithdrawalsGateway,
            CS_TWG_ADDRESS: triggerableWithdrawalsGateway,
          }
        : {}),
    };

    if (!triggerableWithdrawalsGateway || !cmv2Ejector) {
      logger.warn(
        "Skipping automatic ADD_FULL_WITHDRAWAL_REQUEST_ROLE grant for CMv2 Ejector: missing TWG or Ejector address in state",
      );
    }

    logger.logJson(env);

    logger.log("Deploying and configuring CMv2 components...");
    await patchDevnetCmv2StartMetaRegistryGrant(lidoCLI, logger);

    await lidoCLI.sh({ env })`./run.sh omnibus script devnetCMv2Start`;

    logger.log("Granting MANAGE_OPERATOR_GROUPS_ROLE on CMv2 MetaRegistry...");
    try {
      await lidoCLI.sh({ env })`./run.sh cmv2 grant-manage-operator-groups-role-vote`;
    } catch {
      logger.warn("Failed to grant MANAGE_OPERATOR_GROUPS_ROLE; proceed manually if needed");
    }

    await state.updateCMv2Activated({ active: true });
  },
});
