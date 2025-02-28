import { Params, command } from "@devnet/command";

import { BlockscoutUp } from "../blockscout/up.js";
import { KurtosisGetInfo } from "../chain/info.js";
import { KurtosisUp } from "../chain/up.js";
import { CouncilUp } from "../council/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSVerifier } from "../csm/add-verifier.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsUp } from "../dsm-bots/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiUp } from "../kapi/up.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { LidoAddKeys } from "../lido-core/add-keys.js";
import { LidoAddOperator } from "../lido-core/add-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { LidoDeposit } from "../lido-core/deposit.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { LidoSetStakingLimit } from "../lido-core/set-staking-limit.js";
import { OracleUp } from "../oracles/up.js";
import { ValidatorAdd } from "../validator/add.js";

export const PectraVaultsDevNetUp = command.cli({
  description: "Vaults test stand.",
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
    await dre.runCommand(KurtosisUp, { preset: "pectra-devnet6-vaults" });
    logger.log("✅ Network initialized.");

    await dre.runCommand(BlockscoutUp, {});
    logger.log("✅ BlockScout launched for transaction visualization.");

    if (!params.full) {
      await dre.runCommand(KurtosisGetInfo, {});
      return;
    }

    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "feat/vaults",
    });

    const deployArgs = { verify: params.verify };

    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, deployArgs);
    logger.log("✅ Lido contracts deployed.");

    logger.log("🚀 Deploying CSM contracts...");
    await dre.runCommand(DeployCSMContracts, deployArgs);
    logger.log("✅ CSM contracts deployed.");

    logger.log("🚀 Activating Lido Core protocol...");
    await dre.runCommand(ActivateLidoProtocol, {});
    logger.log("✅ Lido Core protocol activated.");

    logger.log("🚀 Activating CSM protocol...");
    await dre.runCommand(ActivateCSM, {});
    logger.log("✅ CSM protocol activated.");

    if (!params.dsm) {
      logger.log("🚀 Replacing DSM with an EOA...");
      await dre.runCommand(ReplaceDSM, {});
      logger.log("✅ DSM replaced with an EOA.");
    }

    const NOR_DEVNET_OPERATOR = "devnet_nor_1";
    const CSM_DEVNET_OPERATOR = "devnet_csm_1";

    logger.log("🚀 Generating and allocating keys for NOR Module...");
    await dre.runCommand(GenerateLidoDevNetKeys, {});
    await dre.runCommand(UseLidoDevNetKeys, { name: NOR_DEVNET_OPERATOR });
    logger.log("✅ NOR Module keys generated and allocated.");

    logger.log("🚀 Generating and allocating keys for CSM Module...");
    await dre.runCommand(GenerateLidoDevNetKeys, {});
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

    logger.log("🚀 Run KAPI service.");
    await dre.runCommand(KapiUp, {});
    logger.log("✅ KAPI service started.");

    logger.log("🚀 Run Oracle service.");
    await dre.runCommand(OracleUp, {});
    logger.log("✅ Oracle service started.");

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

    const depositArgs = { dsm: params.dsm };

    logger.log("🚀 Making deposit to NOR...");
    await dre.runCommand(LidoDeposit, { id: 1, deposits: 30, ...depositArgs });
    logger.log("✅ Deposit to NOR completed.");

    logger.log("🚀 Making deposit to CSM...");
    await dre.runCommand(LidoDeposit, { id: 3, deposits: 30, ...depositArgs });
    logger.log("✅ Deposit to CSM completed.");

    logger.log("🚀 Adding keys to the validator...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");

    logger.log("🚀 Deploying new CSM Verifier...");
    await dre.runCommand(DeployCSVerifier, deployArgs);
    logger.log("✅ New CSM Verifier deployed.");

    await dre.runCommand(KurtosisGetInfo, {});

    logger.log("");
    logger.log("Vaults deployment completed successfully.");
  },
});
