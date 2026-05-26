import { Params, command } from "@devnet/command";

import { BlockscoutUp } from "../blockscout/up.js";
import { ChainKurtosisUp } from "../chain/kurtosis-up.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { GitCheckout } from "../git/checkout.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";


export const PectraContractsOnlyDevNetUp = command.cli({
  description: "Pectra contracts only with protocol smart contracts.",
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
      default: "pectra-stable",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "develop",
    });

    await dre.runCommand(ChainKurtosisUp, { preset: params.preset });
    logger.log("✅ Network initialized.");

    const deployArgs = { verify: params.verify };

    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
      voteDuration: 60,
      gasMaxFee: dre.services.lidoCore.config.constants.GAS_MAX_FEE,
      gasPriorityFee: dre.services.lidoCore.config.constants.GAS_PRIORITY_FEE,
      gasLimit: "16000000",
      configFile: dre.services.lidoCore.config.constants.NETWORK_STATE_DEFAULTS_FILE,
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
      consolidationMigratorTargetModuleId: undefined,
    });
    logger.log("✅ Lido contracts deployed.");

    logger.log("🚀 Deploying CSM contracts...");
    await dre.runCommand(DeployCSMContracts, { ...deployArgs, verifierUrl: undefined });
    logger.log("✅ CSM contracts deployed.");
  },
});
