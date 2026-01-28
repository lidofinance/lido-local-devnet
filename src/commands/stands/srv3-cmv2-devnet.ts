import { Params, command } from "@devnet/command";

import { ChainGetInfo } from "../chain/info.js";
import { ChainUp } from "../chain/up.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsK8sUp } from "../dsm-bots-k8s/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { AddNewOperator } from "../lido-core/add-new-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
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
    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "feat/staking-router-3.0",
    });

    await dre.runCommand(GitCheckout, {
      service: "csm",
      ref: "develop",
    });

    await dre.runCommand(ChainUp, { preset: params.preset });
    logger.log("✅ Network initialized.");

    const deployArgs = { verify: params.verify };
    const depositArgs = { dsm: params.dsm };

    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
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

    await dre.runCommand(GitCheckout, {
      service: "lidoCLI",
      ref: "develop",
    });

    logger.log("🚀 Activating Lido Core protocol...");
    await dre.runCommand(ActivateLidoProtocol, {});
    logger.log("✅ Lido Core protocol activated.");

    if (!params.dsm) {
      logger.log("🚀 Replacing DSM with an EOA...");
      await dre.runCommand(ReplaceDSM, {});
      logger.log("✅ DSM replaced with an EOA.");
    }

    const validators = 30;
    logger.log("🚀 Adding 3 new operators with validators...");
    await dre.runCommand(AddNewOperator, { ...depositArgs, operatorId: 2, stakingModuleId: 1, depositCount: validators});
    await dre.runCommand(AddNewOperator, { ...depositArgs, operatorId: 1, stakingModuleId: 1, depositCount: validators});
    await dre.runCommand(AddNewOperator, { ...depositArgs, operatorId: 3, stakingModuleId: 1, depositCount: validators});
    logger.log("✅ 3 new operators with validators added.");

    logger.log("🚀 Run KAPI service in K8s.");
    await dre.runCommand(KapiK8sUp, {});

    logger.log("🚀 Run Oracle service in K8s.");
    await dre.runCommand(OracleK8sUp, { tag: "6.0.1", build: false });

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
