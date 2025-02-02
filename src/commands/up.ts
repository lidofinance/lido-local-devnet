import { Params, command } from "@devnet/command";

import { BlockscoutUp } from "./blockscout/up.js";
import { KurtosisGetInfo } from "./chain/info.js";
import { KurtosisUp } from "./chain/up.js";
import { ActivateCSM } from "./onchain/csm/activate.js";
import { DeployCSMContracts } from "./onchain/csm/deploy.js";
import { ActivateLidoProtocol } from "./onchain/lido/activate.js";
import { DeployLidoContracts } from "./onchain/lido/deploy.js";
import { ReplaceDSM } from "./onchain/lido/replace-dsm.js";

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
    // Start basic network infrastructure
    await KurtosisUp.exec(dre, {});
    logger.log("Network initialized.");

    // Launch auxiliary services like BlockScout for block exploration
    await BlockscoutUp.exec(dre, {});
    logger.log("BlockScout launched for transaction visualization.");

    if (params.full) {
      logger.log("Deploy Lido Core contracts.");
      await DeployLidoContracts.exec(dre, { verify: params.verify });
      logger.log("Lido contracts deployed.");

      logger.log("Deploy CSM contracts.");
      await DeployCSMContracts.exec(dre, { verify: params.verify });
      logger.log("CSM contracts deployed.");

      logger.log("Activate Lido Core protocol.");
      await ActivateLidoProtocol.exec(dre, {});
      logger.log("Lido Core protocol activated.");

      logger.log("Activate CSM protocol.");
      await ActivateCSM.exec(dre, {});
      logger.log("CSM protocol activated.");

      logger.log("Replaces the DSM with an EOA.");
      await ReplaceDSM.exec(dre, {});

      // const NOR_DEVNET_OPERATOR = "devnet_nor_1";
      // const CSM_DEVNET_OPERATOR = "devnet_csm_1";

      // logger.log("Generate keys for NOR Module.");
      // await dre.runCommand("lido:keys:generate");
      // logger.log("Allocate keys for NOR Module.");
      // await dre.runCommand("lido:keys:use", ["--name", NOR_DEVNET_OPERATOR]);

      // logger.log("Generate keys for CSM Module.");
      // await dre.runCommand("lido:keys:generate");
      // logger.log("Allocate keys for CSM Module.");
      // await dre.runCommand("lido:keys:use", ["--name", CSM_DEVNET_OPERATOR]);

      // logger.log("Add NOR operator.");
      // await dre.runCommand("onchain:lido:add-operator", [
      //   "--name",
      //   NOR_DEVNET_OPERATOR,
      // ]);
      // logger.log(`Operator ${NOR_DEVNET_OPERATOR} added`);

      // logger.log(`Increase staking limit for NOR`);
      // await dre.runCommand("onchain:lido:set-staking-limit", [
      //   "--operatorId",
      //   "0",
      //   "--limit",
      //   "30",
      // ]);

      // logger.log("Add NOR keys.");
      // await dre.runCommand("onchain:lido:add-keys", [
      //   "--name",
      //   NOR_DEVNET_OPERATOR,
      //   "--id",
      //   "0",
      // ]);
      // logger.log(`Keys for operator ${NOR_DEVNET_OPERATOR} added`);

      // logger.log("Add CSM operator with keys.");
      // await dre.runCommand("onchain:csm:add-operator", [
      //   "--name",
      //   CSM_DEVNET_OPERATOR,
      // ]);
      // logger.log(`Keys for operator ${CSM_DEVNET_OPERATOR} added`);

      // logger.log(`Make deposit to NOR`);
      // await dre.runCommand("onchain:lido:deposit", ["--id", "1"]);

      // logger.log(`Make deposit to CSM`);
      // await dre.runCommand("onchain:lido:deposit", ["--id", "3"]);

      // logger.log("Add new CSM Verifier");
      // await dre.runCommand("onchain:csm:add-verifier", args);
    }

    // Display network information
    await KurtosisGetInfo.exec(dre, {});
  },
});
