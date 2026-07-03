import { Params, command } from "@devnet/command";
import toml from "@iarna/toml";
import { JsonRpcProvider } from "ethers";
import fs from "node:fs/promises";
import path from "node:path";

import { lidoCoreExtension } from "../lido-core/extensions/lido-core.extension.js";
import { dualGovernanceExtension } from "./extensions/dual-governance.extension.js";

type DGDeployedContracts = {
  admin_executor: string;
  dual_governance: string;
  dual_governance_config_provider: string;
  emergency_governance: string;
  escrow_master_copy: string;
  reseal_manager: string;
  tiebreaker_core_committee: string;
  tiebreaker_sub_committees?: string[];
  timelock: string;
};

type DGDeployArtifact = {
  deployed_contracts: DGDeployedContracts;
};

const renderDeployConfig = ({
  chainId,
  voting,
  steth,
  wsteth,
  withdrawalQueue,
  validatorExitBus,
  deployer,
  afterSubmitDelay,
  afterScheduleDelay,
  minExecutionDelay,
}: {
  afterScheduleDelay: number;
  afterSubmitDelay: number;
  chainId: number;
  deployer: string;
  minExecutionDelay: number;
  steth: string;
  validatorExitBus: string;
  voting: string;
  withdrawalQueue: string;
  wsteth: string;
}): toml.JsonMap => ({
  chain_id: chainId,
  dual_governance: {
    admin_proposer: voting,
    proposals_canceller: voting,
    reseal_committee: deployer,
    sealable_withdrawal_blockers: [withdrawalQueue, validatorExitBus],
    tiebreaker_activation_timeout: 900,
    signalling_tokens: {
      st_eth: steth,
      wst_eth: wsteth,
      withdrawal_queue: withdrawalQueue,
    },
    sanity_check_params: {
      min_withdrawals_batch_size: 1,
      max_tiebreaker_activation_timeout: 1800,
      min_tiebreaker_activation_timeout: 300,
      max_sealable_withdrawal_blockers_count: 255,
      max_min_assets_lock_duration: 3600,
    },
  },
  dual_governance_config_provider: {
    first_seal_rage_quit_support: 300,
    second_seal_rage_quit_support: 1500,
    min_assets_lock_duration: 60,
    veto_signalling_min_duration: 60,
    veto_signalling_min_active_duration: 60,
    veto_signalling_max_duration: 600,
    veto_signalling_deactivation_max_duration: 300,
    veto_cooldown_duration: 180,
    rage_quit_extension_period_duration: 180,
    rage_quit_eth_withdrawals_min_delay: 300,
    rage_quit_eth_withdrawals_max_delay: 1800,
    rage_quit_eth_withdrawals_delay_growth: 60,
  },
  timelock: {
    after_submit_delay: afterSubmitDelay,
    after_schedule_delay: afterScheduleDelay,
    sanity_check_params: {
      min_execution_delay: minExecutionDelay,
      max_after_submit_delay: 1800,
      max_after_schedule_delay: 1800,
      max_emergency_mode_duration: 86_400,
      max_emergency_protection_duration: 63_072_000,
    },
    emergency_protection: {
      emergency_mode_duration: 3600,
      // 30 days — well within max_emergency_protection_duration (2 years)
      // so block.timestamp drift between TOML render and forge execution
      // doesn't push end_date past the sanity check window.
      emergency_protection_end_date:
        Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      emergency_governance_proposer: deployer,
      emergency_activation_committee: deployer,
      emergency_execution_committee: deployer,
    },
  },
  tiebreaker: {
    quorum: 1,
    committees_count: 1,
    execution_delay: 300,
    committees: [{ quorum: 1, members: [deployer] }],
  },
});

const findLatestArtifact = async (
  artifactsDir: string,
  chainId: number,
): Promise<string> => {
  const prefix = `deploy-artifact-${chainId}-`;
  const files = await fs.readdir(artifactsDir);
  const matching = files.filter(
    (f) => f.startsWith(prefix) && f.endsWith(".toml"),
  );
  if (matching.length === 0) {
    throw new Error(
      `No deploy artifact found in ${artifactsDir} for chainId=${chainId}`,
    );
  }

  const stats = await Promise.all(
    matching.map(async (name) => ({
      name,
      mtimeMs: (await fs.stat(path.join(artifactsDir, name))).mtimeMs,
    })),
  );
  stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return stats[0].name;
};

export const DGDeploy = command.cli({
  description:
    "Deploys Dual Governance contracts via forge DeployConfigurable script and writes addresses into state.json and lido-cli extra-deployed config.",
  params: {
    afterSubmitDelay: Params.string({
      description:
        "Timelock after-submit delay (seconds). Default 30. Min depends on DG MIN_EXECUTION_DELAY constraint.",
      required: false,
    }),
    afterScheduleDelay: Params.string({
      description: "Timelock after-schedule delay (seconds). Default 30.",
      required: false,
    }),
    minExecutionDelay: Params.string({
      description:
        "Sanity-check MIN_EXECUTION_DELAY (seconds). Default 30. Invariant: submit + schedule >= min_execution.",
      required: false,
    }),
  },
  extensions: [dualGovernanceExtension, lidoCoreExtension],
  async handler({ params, dre, dre: { logger } }) {
    const { state, services, network } = dre;
    const { dualGovernance, lidoCLI } = services;

    if (await state.isDualGovernanceDeployed()) {
      logger.log("Dual Governance is already deployed.");
      return;
    }

    await network.waitEL();

    const { voting, lido, withdrawalQueue, validatorExitBus } =
      await state.getLido();
    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    // wstETH is not exposed by getLido() — read directly from raw state.json
    const stateRaw = JSON.parse(
      await fs.readFile(path.join(state.artifactsRoot, "state.json"), "utf-8"),
    );
    const wsteth = stateRaw?.lidoCore?.wstETH?.address;
    if (!wsteth) {
      throw new Error(
        "wstETH address not found in state.json under lidoCore.wstETH.address",
      );
    }

    const provider = new JsonRpcProvider(elPublic);
    const { chainId } = await provider.getNetwork();
    const chainIdNum = Number(chainId);

    const afterSubmitDelay = Number(params.afterSubmitDelay ?? "30");
    const afterScheduleDelay = Number(params.afterScheduleDelay ?? "30");
    const minExecutionDelay = Number(params.minExecutionDelay ?? "30");

    if (afterSubmitDelay + afterScheduleDelay < minExecutionDelay) {
      throw new Error(
        `DG invariant violated: afterSubmitDelay (${afterSubmitDelay}) + afterScheduleDelay (${afterScheduleDelay}) must be >= minExecutionDelay (${minExecutionDelay})`,
      );
    }

    const {
      config: { constants },
    } = dualGovernance;

    const deployConfig = renderDeployConfig({
      chainId: chainIdNum,
      voting,
      steth: lido,
      wsteth,
      withdrawalQueue,
      validatorExitBus,
      deployer: deployer.publicKey,
      afterSubmitDelay,
      afterScheduleDelay,
      minExecutionDelay,
    });

    const configRelPath = path.join(
      constants.DEPLOY_CONFIG_DIR,
      constants.DEPLOY_CONFIG_FILE_NAME,
    );

    await dualGovernance.writeToml(configRelPath, deployConfig);
    logger.log(`Deploy config written: ${configRelPath}`);
    logger.logJson(deployConfig);

    const env = {
      DEPLOY_CONFIG_FILE_NAME: constants.DEPLOY_CONFIG_FILE_NAME,
      DEPLOYER_PRIVATE_KEY: deployer.privateKey,
      RPC_URL: elPublic,
    };

    const dgSh = dualGovernance.sh({ env });

    logger.log("Running DeployConfigurable forge script...");
    await dgSh`forge script ${constants.DEPLOY_SCRIPT} --fork-url ${elPublic} --broadcast --private-key $DEPLOYER_PRIVATE_KEY`;

    const artifactsAbsDir = path.join(
      dualGovernance.artifact.root,
      constants.DEPLOY_ARTIFACTS_DIR,
    );
    const artifactName = await findLatestArtifact(artifactsAbsDir, chainIdNum);
    logger.log(`Parsing deploy artifact: ${artifactName}`);

    const artifact = (await dualGovernance.readToml(
      path.join(constants.DEPLOY_ARTIFACTS_DIR, artifactName),
    )) as unknown as DGDeployArtifact;

    const deployed = artifact.deployed_contracts;
    if (!deployed?.dual_governance || !deployed?.timelock) {
      throw new Error(
        `Deploy artifact ${artifactName} missing required deployed_contracts fields`,
      );
    }

    const dgState = {
      dualGovernance: deployed.dual_governance,
      emergencyProtectedTimelock: deployed.timelock,
      adminExecutor: deployed.admin_executor,
      resealManager: deployed.reseal_manager,
      configProvider: deployed.dual_governance_config_provider,
      escrowMasterCopy: deployed.escrow_master_copy,
      tiebreakerCoreCommittee: deployed.tiebreaker_core_committee,
      emergencyGovernance: deployed.emergency_governance,
      deployed: true,
    };

    await state.updateDualGovernance(dgState);
    logger.log("State updated: state.dualGovernance");

    const lidoCliExtraConfigPath =
      lidoCLI.config.constants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH;
    let lidoCliExtra: Record<string, unknown> = {};
    try {
      lidoCliExtra = (await lidoCLI.readJson(lidoCliExtraConfigPath)) as Record<
        string,
        unknown
      >;
    } catch {
      lidoCliExtra = {};
    }

    lidoCliExtra.dg = {
      dualGovernance: { address: deployed.dual_governance },
      emergencyProtectedTimelock: { address: deployed.timelock },
      adminExecutor: { address: deployed.admin_executor },
      resealManager: { address: deployed.reseal_manager },
    };

    await lidoCLI.writeJson(lidoCliExtraConfigPath, lidoCliExtra, true);
    logger.log(
      `lido-cli extra-deployed config updated: ${lidoCliExtraConfigPath}`,
    );

    logger.log("Dual Governance deployed successfully.");
    logger.logJson(dgState);
  },
});
