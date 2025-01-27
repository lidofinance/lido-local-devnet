import { Params, command } from "@devnet/command";

import { waitEL } from "../../../lib/network/index.js";
import { LidoCoreInstall } from "./install.js";

export const ActivateLidoProtocol = command.cli({
  description:
    "Activates the lido-core protocol by deploying smart contracts and configuring the environment based on the current network state.",
  params: { check: Params.boolean({ default: true, description: "kek" }) },
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      services: { lidoCLI },
    } = dre;

    logger.log("Initiating the activation of the lido-core protocol...");

    // Ensures all dependencies are installed before proceeding
    logger.log("Ensuring dependencies are installed...");
    await LidoCoreInstall.exec(dre, {});
    logger.log("Dependencies installed successfully.");

    const { elPublic } = await state.getChain();
    const { deployer, oracles, councils } = await state.getNamedWallet();

    logger.log(`Ensuring the execution node at ${elPublic} is ready...`);
    await waitEL(elPublic);
    logger.log("Execution node is ready.");

    const deployEnv = {
      DEPLOYED: "deployed-local-devnet.json",
      EL_CHAIN_ID: "32382",
      EL_NETWORK_NAME: "local-devnet",
      PRIVATE_KEY: deployer.privateKey,
      EL_API_PROVIDER: elPublic,
    };

    const activateCoreSh = lidoCLI.sh({ env: deployEnv });

    await activateCoreSh`./run.sh devnet setup 
                          --oracles-members ${oracles.map(({ publicKey }) => publicKey).join(",")}
                          --oracles-quorum ${oracles.length - 1}
                          --oracles-initial-epoch 60
                          --dsm-guardians ${councils.map(({ publicKey }) => publicKey).join(",")}
                          --dsm-quorum ${councils.length}
                          --roles-beneficiary ${deployer.publicKey}`;

    logger.log("✅ Lido-core protocol activation completed successfully.");
  },
});
