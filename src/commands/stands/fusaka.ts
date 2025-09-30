import { Params, command } from "@devnet/command";

import { ChainGetInfo } from "../chain/info.js";
import { ChainUp } from "../chain/up.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSVerifier } from "../csm/add-verifier.js";
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
import { NoWidgetUp } from "../no-widget/up.js";
import { NoWidgetBackendUp } from "../no-widget-backend/up.js";
import { OracleK8sUp } from "../oracles-k8s/up.js";
import { ValidatorAdd } from "../validator/add.js";

export const FusakaDevNetUp = command.cli({
  description: "Base Fusaka test stand.",
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
      ref: "fix/scratch-deploy-tw",
    });

    await dre.runCommand(GitCheckout, {
      service: "csm",
      ref: "main",
    });

    await dre.runCommand(GitCheckout, {
      service: "lidoCLI",
      ref: "fix/vroom-306-temp-fix-fusaka-1",
    });

    await dre.runCommand(ChainUp, { preset: params.preset });
    logger.log("✅ Network initialized.");

    const deployArgs = { verify: false };
    const depositArgs = { dsm: true };

    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
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
    });
    logger.log("✅ Lido contracts deployed.");

    logger.log("🚀 Deploying CSM contracts...");
    await dre.runCommand(DeployCSMContracts, deployArgs);
    logger.log("✅ CSM contracts deployed.");

    await dre.network.waitCLFinalizedEpoch(1);

    logger.log("🚀 Activating Lido Core protocol...");
    await dre.runCommand(ActivateLidoProtocol, {});
    logger.log("✅ Lido Core protocol activated.");

    logger.log("🚀 Activating CSM protocol...");
    await dre.runCommand(ActivateCSM, {
      stakeShareLimitBP: 2000,
      priorityExitShareThresholdBP: 2500,
      maxDepositsPerBlock: 30,
    });
    logger.log("✅ CSM protocol activated.");

    if (!params.dsm) {
      logger.log("🚀 Replacing DSM with an EOA...");
      await dre.runCommand(ReplaceDSM, {});
      logger.log("✅ DSM replaced with an EOA.");
    }

    const NOR_DEVNET_OPERATOR = "devnet_nor_1";
    const CSM_DEVNET_OPERATOR = "devnet_csm_1";

    logger.log("🚀 Generating and allocating keys for NOR Module...");
    await dre.runCommand(GenerateLidoDevNetKeys, { validators: 30 });
    await dre.runCommand(UseLidoDevNetKeys, { name: NOR_DEVNET_OPERATOR });
    logger.log("✅ NOR Module keys generated and allocated.");

    logger.log("🚀 Generating and allocating keys for CSM Module...");
    await dre.runCommand(GenerateLidoDevNetKeys, { validators: 30 });
    await dre.runCommand(UseLidoDevNetKeys, { name: CSM_DEVNET_OPERATOR });
    logger.log("✅ CSM Module keys generated and allocated.");

    logger.log("🚀 Adding NOR operator...");
    await dre.runCommand(LidoAddOperator, { name: NOR_DEVNET_OPERATOR });
    logger.log(`✅ Operator ${NOR_DEVNET_OPERATOR} added.`);

    logger.log("🚀 Adding NOR keys...");
    await dre.runCommand(LidoAddKeys, { name: NOR_DEVNET_OPERATOR, id: 0 });
    logger.log("✅ NOR keys added.");

    logger.log("🚀 Increasing staking limit for NOR...");
    await dre.runCommand(LidoSetStakingLimit, { operatorId: 0, limit: 30 });
    logger.log("✅ Staking limit for NOR increased.");

    logger.log("🚀 Adding CSM operator with keys...");
    await dre.runCommand(LidoAddCSMOperatorWithKeys, {
      name: CSM_DEVNET_OPERATOR,
    });
    logger.log(`✅ Keys for operator ${CSM_DEVNET_OPERATOR} added.`);

    logger.log("🚀 Run KAPI service in K8s.");
    await dre.runCommand(KapiK8sUp, {});

    logger.log("🚀 Run Oracle service in K8s.");
    await dre.runCommand(OracleK8sUp, { tag: '6.0.1', build: false });

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
    await dre.runCommand(LidoDeposit, { id: 1, deposits: 30, ...depositArgs });
    logger.log("✅ Deposit to NOR completed.");

    logger.log("🚀 Making deposit to CSM...");
    await dre.runCommand(LidoDeposit, { id: 3, deposits: 30, ...depositArgs });
    logger.log("✅ Deposit to CSM completed.");

    logger.log("🚀 Adding keys to the validator...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");

    await dre.runCommand(ChainGetInfo, {});

    logger.log("🚀 Run No Widget Backend");
    await dre.runCommand(NoWidgetBackendUp, { });

    logger.log("🚀 Run No Widget");
    await dre.runCommand(NoWidgetUp, { });
  },
});
