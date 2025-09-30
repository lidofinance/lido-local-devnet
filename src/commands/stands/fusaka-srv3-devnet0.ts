import { DevNetRuntimeEnvironmentInterface, Params, command } from "@devnet/command";

import { ChainGetInfo } from "../chain/info.js";
import { ChainUp } from "../chain/up.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsK8sUp } from "../dsm-bots-k8s/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { LidoAddKeys } from "../lido-core/add-keys.js";
import { LidoAddOperator } from "../lido-core/add-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { LidoDeposit } from "../lido-core/deposit.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { LidoSetStakingLimit } from "../lido-core/set-staking-limit.js";
import { OracleK8sUp } from "../oracles-k8s/up.js";
import { ValidatorAdd } from "../validator/add.js";

const addLidoNodeOperator = async (dre: DevNetRuntimeEnvironmentInterface, name: string, id: number, validators: number) => {
  const { logger } = dre;

  logger.log("🚀 Generating and allocating keys for NOR Module...");
  await dre.runCommand(GenerateLidoDevNetKeys, { validators });
  await dre.runCommand(UseLidoDevNetKeys, { name });
  logger.log("✅ NOR Module keys generated and allocated.");

  logger.log("🚀 Adding NOR operator...");
  await dre.runCommand(LidoAddOperator, { name });
  logger.log(`✅ Operator ${name} added.`);

  logger.log("🚀 Adding NOR keys...");
  await dre.runCommand(LidoAddKeys, { name, id: id - 1 });
  logger.log("✅ NOR keys added.");

  logger.log("🚀 Increasing staking limit for NOR...");
  await dre.runCommand(LidoSetStakingLimit, { operatorId: id - 1, limit: validators });
  logger.log("✅ Staking limit for NOR increased.");
}

export const FusakaSRV3DevNetUp = command.cli({
  description: "Staking Router V3 Devnet0 on Fusaka test stand.",
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
      default: "fusaka-devnet2",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "feat/staking-router-3.0",
    });

    await dre.runCommand(GitCheckout, {
      service: "csm",
      ref: "main",
    });

    await dre.runCommand(ChainUp, { preset: params.preset });
    logger.log("✅ Network initialized.");

    const deployArgs = { verify: false };
    const depositArgs = { dsm: true };

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
      ref: "feature/sr-66-devnet0-1",
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
    const NOR_DEVNET_OPERATOR_1 = "devnet_nor_1";
    const NOR_DEVNET_OPERATOR_2 = "devnet_nor_2";
    const NOR_DEVNET_OPERATOR_3 = "devnet_nor_3";

    await addLidoNodeOperator(dre, NOR_DEVNET_OPERATOR_1, 1, validators).then(() => logger.log(`✅ ${NOR_DEVNET_OPERATOR_1} initialized.`));
    await addLidoNodeOperator(dre, NOR_DEVNET_OPERATOR_2, 2, validators).then(() => logger.log(`✅ ${NOR_DEVNET_OPERATOR_2} initialized.`));
    await addLidoNodeOperator(dre, NOR_DEVNET_OPERATOR_3, 3, validators).then(() => logger.log(`✅ ${NOR_DEVNET_OPERATOR_3} initialized.`));

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

    logger.log("🚀 Making deposit to NOR...");
    await dre.runCommand(LidoDeposit, { id: 1, deposits: validators * 3, ...depositArgs });
    logger.log("✅ Deposit to NOR completed.");

    logger.log("🚀 Adding keys to the validator...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");

    await dre.runCommand(ChainGetInfo, {});
  },
});
