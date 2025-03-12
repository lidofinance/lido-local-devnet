import { Params, command } from "@devnet/command";

import { BlockscoutUp } from "../blockscout/up.js";
import { KurtosisGetInfo } from "../chain/info.js";
import { KurtosisUp } from "../chain/up.js";
import { CouncilUp } from "../council/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsUp } from "../dsm-bots/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiUp } from "../kapi/up.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { LidoDeposit } from "../lido-core/deposit.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { OracleUp } from "../oracles/up.js";
import { ValidatorAdd } from "../validator/add.js";
import { CSMUpdateState } from "../csm/update-state.js";

export const PectraDevNetUp = command.cli({
  description: "CSM v2 on Pectra stand.",
  params: {
    full: Params.boolean({
      description:
        "Deploys all smart contracts, not just initializes the network.",
    }),
    verify: Params.boolean({
      description: "Enables verification of smart contracts during deployment.",
    }),
    dsm: Params.boolean({
      description: "Use full DSM setup.",
      default: false,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "develop",
    });

    await dre.runCommand(GitCheckout, {
      service: "lidoCLI",
      ref: "devnet-csm-v2",
    });

    await dre.runCommand(GitCheckout, {
      service: "csm",
      ref: "deploy-devnet",
    });

    await dre.runCommand(KurtosisUp, { preset: "csm-v2" });
    logger.log("✅ Network initialized.");

    await dre.runCommand(BlockscoutUp, {});
    logger.log("✅ BlockScout launched for transaction visualization.");

    // if (!params.full) {
    //   await dre.runCommand(KurtosisGetInfo, {});
    //   return;
    // }

    const deployArgs = { verify: params.verify };
    const depositArgs = { dsm: params.dsm };

    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, deployArgs);
    logger.log("✅ Lido contracts deployed.");

    logger.log("🚀 Deploying CSM contracts...");
    await dre.runCommand(DeployCSMContracts, deployArgs);
    logger.log("✅ CSM contracts deployed.");

    await dre.runCommand(CSMUpdateState, {});

    logger.log("🚀 Activating Lido Core protocol...");
    await dre.runCommand(ActivateLidoProtocol, {});
    logger.log("✅ Lido Core protocol activated.");

    logger.log("🚀 Activating CSM module...");
    await dre.runCommand(ActivateCSM, {
      stakeShareLimitBP: 10000,
      priorityExitShareThresholdBP: 10000,
      maxDepositsPerBlock: 100,
    });
    logger.log("✅ CSM module activated.");

    if (!params.dsm) {
      logger.log("🚀 Replacing DSM with an EOA...");
      await dre.runCommand(ReplaceDSM, {});
      logger.log("✅ DSM replaced with an EOA.");
    }

    const CSM_OPERATOR_PREFIX = "devnet_csm_";
    const CSM_OPERATORS_COUNT = 4;

    logger.log("🚀 Generating and allocating keys for CSM Module...");
    for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
      await dre.runCommand(GenerateLidoDevNetKeys, { validators: 25 });
      await dre.runCommand(UseLidoDevNetKeys, {
        name: `${CSM_OPERATOR_PREFIX}${i}`,
      });
    }
    logger.log("✅ CSM Module keys generated and allocated.");

    logger.log("🚀 Adding CSM operator with keys...");
    for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
      await dre.runCommand(LidoAddCSMOperatorWithKeys, {
        name: `${CSM_OPERATOR_PREFIX}${i}`,
      });
      logger.log(`✅ Keys for operator ${CSM_OPERATOR_PREFIX}${i} added.`);
    }

    logger.log("🚀 Run KAPI service.");
    await dre.runCommand(KapiUp, {});

    logger.log("🚀 Run Oracle service.");
    await dre.runCommand(OracleUp, {});

    if (params.dsm) {
      logger.log("🚀 Deploying Data-bus...");
      await dre.runCommand(DataBusDeploy, {});
      logger.log("✅ Data-bus deployed.");

      logger.log("🚀 Running Council service...");
      await dre.runCommand(CouncilUp, {});
      logger.log("✅ Council service started.");

      logger.log("🚀 Running DSM-bots service...");
      await dre.runCommand(DSMBotsUp, {});
      logger.log("✅ DSM-bots service started.");
    }

    // TODO: Most likely it will take N times to deposit.
    logger.log("🚀 Making deposit to CSM...");
    await dre.runCommand(LidoDeposit, {
      id: 3,
      deposits: CSM_OPERATORS_COUNT * 25,
      ...depositArgs,
    });
    logger.log("✅ Deposit to CSM completed.");

    logger.log("🚀 Adding keys to the validator...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");

    await dre.runCommand(KurtosisGetInfo, {});

    // FIXME: Extract to a separate command.
    const {
      services: { lidoCLI },
    } = dre;
    logger.log("Getting CSM operators count");
    await lidoCLI.sh`./run.sh csm operators`;
    logger.log("Going through the operators");
    for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
      await lidoCLI.sh`./run.sh csm operator ${i}`;
    }
    logger.log("Getting staking modules");
    await lidoCLI.sh`./run.sh sr modules`;
  },
});
