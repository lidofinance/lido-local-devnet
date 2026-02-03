import { Params, command } from "@devnet/command";

import { ChainGetInfo } from "../chain/info.js";
import { ChainUp } from "../chain/up.js";
import { ActivateCMv2 } from "../cmv2/activate.js";
import { LidoAddCMv2OperatorWithKeys } from "../cmv2/add-operator.js";
import { DeployCMv2Contracts } from "../cmv2/deploy.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsK8sUp } from "../dsm-bots-k8s/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { AddNewOperator } from "../lido-core/add-new-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { OracleK8sUp } from "../oracles-k8s/up.js";

export const SRv3CMv2DevnetUp = command.cli({
  description: "Staking Router V3 with CMv2 Devnet1",
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

    /* await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "feat/srv3-develop-merge",
    });

    await dre.runCommand(GitCheckout, {
      service: "csm",
      ref: "develop",
    });

    await dre.runCommand(GitCheckout, {
      service: "cmv2",
      ref: "develop",
    });

    await dre.runCommand(ChainUp, { preset: params.preset });
    logger.log("✅ Network initialized.");

    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
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
    await dre.runCommand(DeployCSMContracts, deployArgs);
    logger.log("✅ CSM contracts deployed.");

    logger.log("🚀 Deploying CMv2 contracts...");
    await dre.runCommand(DeployCMv2Contracts, deployArgs);
    logger.log("✅ CMv2 contracts deployed.");

    await dre.runCommand(GitCheckout, {
      service: "lidoCLI",
      ref: "feature/vroom-435-staking-router-v3-devnet1-with-cmv2",
    });

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

    logger.log("🚀 Activating CMv2 module...");
    await dre.runCommand(ActivateCMv2, {
      stakeShareLimitBP: 2000,
      priorityExitShareThresholdBP: 2500,
      maxDepositsPerBlock: 30,
    });
    logger.log("✅ CMv2 module activated.");

    if (!params.dsm) {
      logger.log("🚀 Replacing DSM with an EOA...");
      await dre.runCommand(ReplaceDSM, {});
      logger.log("✅ DSM replaced with an EOA.");
    }
    */
    const validators = 30;
    logger.log("🚀 Adding 3 new operators with validators...");
    // await dre.runCommand(AddNewOperator, { ...depositArgs, operatorId: 0, stakingModuleId: 1, depositCount: validators});
    // await dre.runCommand(AddNewOperator, { ...depositArgs, operatorId: 1, stakingModuleId: 1, depositCount: validators});
    // await dre.runCommand(AddNewOperator, { ...depositArgs, operatorId: 2, stakingModuleId: 1, depositCount: validators});
    // logger.log("✅ 3 new operators with validators added.");

    const CSM_OPERATOR_PREFIX = "devnet_csm_";
    const CMV2_OPERATOR_PREFIX = "devnet_cmv2___";
    const CSM_OPERATORS_COUNT = 2;
    const CMV2_OPERATORS_COUNT = 2;
    const KEYS_PER_OPERATOR = 25;

    // logger.log("🚀 Generating and allocating keys for CSM Module...");
    // for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
    //   await dre.runCommand(GenerateLidoDevNetKeys, { validators: KEYS_PER_OPERATOR });
    //   await dre.runCommand(UseLidoDevNetKeys, {
    //     name: `${CSM_OPERATOR_PREFIX}${i}`,
    //   });
    // }

    // logger.log("✅ CSM Module keys generated and allocated.");

    // logger.log("🚀 Adding CSM operators with keys...");
    // for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
    //   await dre.runCommand(LidoAddCSMOperatorWithKeys, {
    //     name: `${CSM_OPERATOR_PREFIX}${i}`,
    //   });
    //   logger.log(`✅ Keys for operator ${CSM_OPERATOR_PREFIX}${i} added.`);
    // }

    logger.log("🚀 Generating and allocating keys for CMv2 Module...");
    for (let i = 0; i < CMV2_OPERATORS_COUNT; i++) {
      await dre.runCommand(GenerateLidoDevNetKeys, { validators: KEYS_PER_OPERATOR });
      await dre.runCommand(UseLidoDevNetKeys, {
        name: `${CMV2_OPERATOR_PREFIX}${i}`,
      });
    }

    logger.log("✅ CMv2 Module keys generated and allocated.");

    logger.log("🚀 Adding CMv2 operators with keys...");
    for (let i = 0; i < CMV2_OPERATORS_COUNT; i++) {
      await dre.runCommand(LidoAddCMv2OperatorWithKeys, {
        name: `${CMV2_OPERATOR_PREFIX}${i}`,
      });
      logger.log(`✅ Keys for operator ${CMV2_OPERATOR_PREFIX}${i} added.`);
    }

    logger.log("🚀 Run KAPI service in K8s.");
    await dre.runCommand(KapiK8sUp, {});

    logger.log("🚀 Run Oracle service in K8s.");
    await dre.runCommand(OracleK8sUp, { tag: "kt-srv3-cmv2-devnet", build: true });

    if (params.dsm) {
      logger.log("🚀 Deploying Data-bus...");
      await dre.runCommand(DataBusDeploy, {});
      logger.log("✅ Data-bus deployed.");

      logger.log("🚀 Running Council service...");
      await dre.runCommand(CouncilK8sUp, {});
      logger.log("✅ Council service started.");

      logger.log("🚀 Running DSM-bots service...");
      await dre.runCommand(DSMBotsK8sUp, {});
      logger.log("✅ DSM-bots service started.");
    }

    await dre.runCommand(ChainGetInfo, {});
  },
});
