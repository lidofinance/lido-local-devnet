import { Params, command } from "@devnet/command";

import { ChainGetInfo } from "../chain/info.js";
import { ChainKurtosisUp } from "../chain/kurtosis-up.js";
import { ChainPublishDigestToSlack } from "../chain/publish-digest-to-slack.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DashboardUp } from "../dashboard/up.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsK8sUp } from "../dsm-bots-k8s/up.js";
import { EasyTrackDeploy } from "../easy-track/deploy.js";
import { EasyTrackGrantPermissions } from "../easy-track/grant-permissions.js";
import { EasyTrackInstall } from "../easy-track/install.js";
import { EasyTrackPrepare } from "../easy-track/prepare.js";
import { GitCheckout } from "../git/checkout.js";
import { GrafanaUp } from "../grafana/up.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { LidoCLIInstall } from "../lido-cli/install.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { AddNewOperator } from "../lido-core/add-new-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { LoggingUp } from "../logging/up.js";
import { OnchainMonK8sUp } from "../onchain-mon-k8s/up.js";
import { OracleK8sBuildMulti } from "../oracles-k8s/build-multi.js";
import { OracleK8sUp } from "../oracles-k8s/up.js";
import { ValidatorAdd } from "../validator/add.js";
import { VroomOnchainMonK8sUp } from "../vroom-onchain-mon-k8s/up.js";

export const SRv3CMv2EasyTrackDevnetUp = command.cli({
  description: "SRv3 + CMv2 + Easy Track Devnet (upgrade testing)",
  params: {
    verify: Params.boolean({
      description: "Enables verification of smart contracts during deployment.",
    }),
    dsm: Params.boolean({
      description: "Use full DSM setup.",
      default: false,
    }),
    preset: Params.string({
      description: "Kurtosis preset name",
      default: "srv3-devnet",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const deployArgs = { verify: params.verify };
    const depositArgs = { dsm: params.dsm };

    // === Phase 1: Chain + Core contracts (from main — old SR) ===

    await dre.runCommand(GitCheckout, { service: "lidoCore", ref: "master" });
    await dre.runCommand(GitCheckout, { service: "csm", ref: "main" });
    await dre.runCommand(GitCheckout, { service: "cmv2", ref: "develop" });

    await dre.runCommand(ChainKurtosisUp, { preset: params.preset });
    logger.log("✅ Network initialized.");

    logger.log("🚀 Deploying Lido Core contracts (main branch — old SR)...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
      voteDuration: 300,
      gasMaxFee: "60",
      gasPriorityFee: "1",
      gasLimit: "16000000",
      configFile: dre.services.lidoCore.config.constants.SCRATCH_DEPLOY_CONFIG,
      normalizedClRewardPerEpoch: 64,
      normalizedClRewardMistakeRateBp: 1000,
      rebaseCheckNearestEpochDistance: 1,
      rebaseCheckDistantEpochDistance: 2,
      validatorDelayedTimeoutInSlots: 7200,
      validatorDelinquentTimeoutInSlots: 28_800,
      nodeOperatorNetworkPenetrationThresholdBp: 100,
      predictionDurationInSlots: 50_400,
      finalizationMaxNegativeRebaseEpochShift: 1350,
      exitEventsLookbackWindowInSlots: 7200,
    });
    logger.log("✅ Lido contracts deployed.");

    logger.log("🚀 Deploying CSM contracts...");
    await dre.runCommand(DeployCSMContracts, { ...deployArgs, verifierUrl: undefined });
    logger.log("✅ CSM contracts deployed.");

    // logger.log("🚀 Deploying CMv2 contracts (not activating yet)...");
    // await dre.runCommand(DeployCMv2Contracts, deployArgs);
    // logger.log("✅ CMv2 contracts deployed.");

    // === Phase 2: Activate protocol + CSM (NOT CMv2 — that comes later via voting) ===

    await dre.runCommand(GitCheckout, {
      service: "lidoCLI",
      ref: "feature/devnet-command",
    });
    await dre.runCommand(LidoCLIInstall, {});

    logger.log("🚀 Activating Lido Core protocol...");
    await dre.runCommand(ActivateLidoProtocol, {});
    logger.log("✅ Lido Core protocol activated.");

    logger.log("🚀 Activating CSM module...");
    await dre.runCommand(ActivateCSM, {
      stakeShareLimitBP: 2000,
      priorityExitShareThresholdBP: 2500,
      maxDepositsPerBlock: 30,
    });
    logger.log("✅ CSM module activated.");

    // CMv2 activation skipped — will be done later via Easy Track/voting

    if (!params.dsm) {
      logger.log("🚀 Replacing DSM with an EOA...");
      await dre.runCommand(ReplaceDSM, {});
      logger.log("✅ DSM replaced with an EOA.");
    }

    // === Phase 3: Operators + Keys (curated + CSM only, no CMv2) ===

    const validators = 30;
    logger.log("🚀 Adding curated operator with validators...");
    await dre.runCommand(AddNewOperator, { ...depositArgs, operatorId: 0, stakingModuleId: 1, depositCount: validators });
    logger.log("✅ 1 curated operator with validators added.");

    const CSM_OPERATOR_PREFIX = "devnet_csm_";
    const CSM_OPERATORS_COUNT = 2;
    const KEYS_PER_OPERATOR = 25;

    logger.log("🚀 Generating and allocating keys for CSM Module...");
    for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
      await dre.runCommand(GenerateLidoDevNetKeys, { validators: KEYS_PER_OPERATOR, wcType: "0x01" });
      await dre.runCommand(UseLidoDevNetKeys, { name: `${CSM_OPERATOR_PREFIX}${i}`, wcType: "0x01" });
    }

    logger.log("✅ CSM Module keys generated and allocated.");

    logger.log("🚀 Adding CSM operators with keys...");
    for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
      await dre.runCommand(LidoAddCSMOperatorWithKeys, { name: `${CSM_OPERATOR_PREFIX}${i}` });
      logger.log(`✅ Keys for operator ${CSM_OPERATOR_PREFIX}${i} added.`);
    }

    logger.log("🚀 Adding keys to the validator client...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");

    // === Phase 4: Easy Track ===

    await dre.runCommand(GitCheckout, { service: "easyTrack", ref: "feat/devnet-support" });

    logger.log("🚀 Preparing Easy Track for devnet...");
    await dre.runCommand(EasyTrackPrepare, {});
    logger.log("✅ Easy Track prepared.");

    logger.log("🚀 Installing Easy Track dependencies...");
    await dre.runCommand(EasyTrackInstall, {});
    logger.log("✅ Easy Track installed.");

    logger.log("🚀 Deploying Easy Track contracts...");
    await dre.runCommand(EasyTrackDeploy, {});
    logger.log("✅ Easy Track deployed.");

    // === Phase 5: Infrastructure services ===

    await dre.runCommand(GitCheckout, { service: "kapi", ref: "feat/withdrawal-creds-type" });

    logger.log("🚀 Run KAPI service in K8s.");
    await dre.runCommand(KapiK8sUp, {});

    logger.log("🚀 Run Oracle service in K8s.");
    const oracleTags = {
      accounting: `kt-${dre.network.name}-ao`,
      ejector: `kt-${dre.network.name}-vebo`,
      csm: `kt-${dre.network.name}-csm`,
    };
    await dre.runCommand(OracleK8sBuildMulti, {
      accountingBranch: "master",
      accountingTag: oracleTags.accounting,
      ejectorBranch: "master",
      ejectorTag: oracleTags.ejector,
      csmBranch: "master",
      csmTag: oracleTags.csm,
      image: "lido/oracle",
      fetch: true,
      keepWorktrees: true,
    });
    const { registryHostname } = await dre.state.getDockerRegistry();
    await dre.runCommand(OracleK8sUp, {
      image: "lido/oracle",
      registryHostname,
      tag: oracleTags.csm,
      accountingImage: undefined,
      accountingTag: oracleTags.accounting,
      csmImage: undefined,
      ejectorTag: oracleTags.ejector,
      csmTag: oracleTags.csm,
      ejectorImage: undefined,
      consensusClientUris: undefined,
      performanceConsensusClientUri: undefined,
      build: false,
    });

    // === Phase 6: DSM + Easy Track Permissions ===

    if (params.dsm) {
      logger.log("🚀 Deploying Data-bus...");
      await dre.runCommand(DataBusDeploy, {});
      logger.log("✅ Data-bus deployed.");

      logger.log("🚀 Granting Easy Track executor permissions (Aragon voting, 5 min)...");
      await dre.runCommand(EasyTrackGrantPermissions, {});
      logger.log("✅ Easy Track permissions granted.");

      await dre.runCommand(GitCheckout, { service: "council", ref: "feat/sr-67-wc-two-types-devnet" });

      logger.log("🚀 Running Council service...");
      await dre.runCommand(CouncilK8sUp, {});
      logger.log("✅ Council service started.");

      await dre.runCommand(GitCheckout, { service: "dsmBots", ref: "fix/0x02-modules-support" });

      logger.log("🚀 Running DSM-bots service...");
      await dre.runCommand(DSMBotsK8sUp, {});
      logger.log("✅ DSM-bots service started.");
    }

    // === Phase 7: Monitoring + Dashboard ===

    logger.log("🚀 Deploying Dashboard...");
    await dre.runCommand(DashboardUp, {});
    logger.log("✅ Dashboard deployed.");

    logger.log("🚀 Deploying Logging...");
    await dre.runCommand(LoggingUp, {});
    logger.log("✅ Logging deployed.");

    // === Phase 8: Onchain monitoring ===

    await dre.runCommand(GitCheckout, { service: "vroomOnchainMon", ref: "feat/sr-v3" });

    logger.log("🚀 Deploying vroom-onchain-mon...");
    await dre.runCommand(VroomOnchainMonK8sUp, {});
    logger.log("✅ vroom-onchain-mon deployed.");

    logger.log("🚀 Deploying onchain-mon (feeder + forwarder)...");
    await dre.runCommand(OnchainMonK8sUp, {});
    logger.log("✅ onchain-mon deployed.");

    logger.log("🚀 Publishing digest to Slack...");
    await dre.runCommand(ChainPublishDigestToSlack, {
      channel: undefined,
      skipDashboardRefresh: false,
      webhookUrl: undefined,
    });

    await dre.runCommand(ChainGetInfo, {});
  },
});
