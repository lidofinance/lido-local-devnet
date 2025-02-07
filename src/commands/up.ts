import { Params, command } from "@devnet/command";

import { BlockscoutUp } from "./blockscout/up.js";
import { KurtosisGetInfo } from "./chain/info.js";
import { KurtosisUp } from "./chain/up.js";
import { ActivateCSM } from "./csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "./csm/add-operator.js";
import { DeployCSVerifier } from "./csm/add-verifier.js";
import { DeployCSMContracts } from "./csm/deploy.js";
import { ActivateLidoProtocol } from "./lido-core/activate.js";
import { LidoAddKeys } from "./lido-core/add-keys.js";
import { LidoAddOperator } from "./lido-core/add-operator.js";
import { DeployLidoContracts } from "./lido-core/deploy.js";
import { LidoDeposit } from "./lido-core/deposit.js";
import { GenerateLidoDevNetKeys } from "./lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "./lido-core/keys/use.js";
import { ReplaceDSM } from "./lido-core/replace-dsm.js";
import { LidoSetStakingLimit } from "./lido-core/set-staking-limit.js";
import { ValidatorAdd } from "./validator/add.js";

export const DevNetUp = command.cli({
  description:
    "Starts a local development network (DevNet) from scratch, ensuring full setup and deployment of all components.",
  params: {
    full: Params.boolean({
      description:
        "Deploys all smart contracts, not just initializes the network.",
    }),
    verify: Params.boolean({
      description: "Enables verification of smart contracts during deployment.",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(KurtosisUp, {});
    logger.log("Network initialized.");

    await dre.runCommand(BlockscoutUp, {});
    logger.log("BlockScout launched for transaction visualization.");

    if (params.full) {
      logger.log("Deploy Lido Core contracts.");
      await dre.runCommand(DeployLidoContracts, { verify: params.verify });
      logger.log("Lido contracts deployed.");

      logger.log("Deploy CSM contracts.");
      await dre.runCommand(DeployCSMContracts, { verify: params.verify });
      logger.log("CSM contracts deployed.");

      logger.log("Activate Lido Core protocol.");
      await dre.runCommand(ActivateLidoProtocol, {});
      logger.log("Lido Core protocol activated.");

      logger.log("Activate CSM protocol.");
      await dre.runCommand(ActivateCSM, {});
      logger.log("CSM protocol activated.");

      logger.log("Replaces the DSM with an EOA.");
      await dre.runCommand(ReplaceDSM, {});

      const NOR_DEVNET_OPERATOR = "devnet_nor_1";
      const CSM_DEVNET_OPERATOR = "devnet_csm_1";

      logger.log("Generate keys for NOR Module.");
      await dre.runCommand(GenerateLidoDevNetKeys, {});
      logger.log("Allocate keys for NOR Module.");
      await dre.runCommand(UseLidoDevNetKeys, { name: NOR_DEVNET_OPERATOR });

      logger.log("Generate keys for CSM Module.");
      await dre.runCommand(GenerateLidoDevNetKeys, {});
      logger.log("Allocate keys for CSM Module.");
      await dre.runCommand(UseLidoDevNetKeys, { name: CSM_DEVNET_OPERATOR });

      logger.log("Add NOR operator.");
      await dre.runCommand(LidoAddOperator, { name: NOR_DEVNET_OPERATOR });
      logger.log(`Operator ${NOR_DEVNET_OPERATOR} added`);

      logger.log("Add NOR keys.");
      await dre.runCommand(LidoAddKeys, { name: NOR_DEVNET_OPERATOR, id: 0 });
      logger.log(`Keys for operator ${NOR_DEVNET_OPERATOR} added`);

      logger.log(`Increase staking limit for NOR`);
      await dre.runCommand(LidoSetStakingLimit, { operatorId: 0, limit: 30 });

      logger.log("Add CSM operator with keys.");
      await dre.runCommand(LidoAddCSMOperatorWithKeys, {
        name: CSM_DEVNET_OPERATOR,
      });
      logger.log(`Keys for operator ${CSM_DEVNET_OPERATOR} added`);

      logger.log(`Make deposit to NOR`);
      await dre.runCommand(LidoDeposit, { id: 1, deposits: 30 });

      logger.log(`Make deposit to NOR`);
      await dre.runCommand(LidoDeposit, { id: 3, deposits: 30 });

      logger.log(`Adding keys to the validator`)
      await dre.runCommand(ValidatorAdd, {})

      logger.log("Add new CSM Verifier");
      await dre.runCommand(DeployCSVerifier, { verify: params.verify });
    }

    // Display network information
    await dre.runCommand(KurtosisGetInfo, {});
  },
});
