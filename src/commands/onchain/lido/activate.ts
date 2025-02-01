import { command } from "@devnet/command";

import { LidoCoreInstall } from "./install.js";

export const ActivateLidoProtocol = command.cli({
  description:
    "Activates the lido-core protocol by deploying smart contracts and configuring the environment based on the current network state.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      services: { lidoCLI },
    } = dre;

    logger.log("Initiating the activation of the lido-core protocol...");

    await LidoCoreInstall.exec(dre, {});

    const { elPublic } = await state.getChain();
    const { deployer, oracles, councils } = await state.getNamedWallet();

    await dre.network.waitEL();

    const deployEnv = {
      DEPLOYED: "deployed-local-devnet.json",
      EL_CHAIN_ID: "32382",
      EL_NETWORK_NAME: "local-devnet",
      PRIVATE_KEY: deployer.privateKey,
      EL_API_PROVIDER: elPublic,
    };

    const activateCoreSh = lidoCLI.sh({ env: deployEnv });
    // TODO: calc oracles-initial-epoch (time voting + 1 epoch for core and +50 for CSM)
    await activateCoreSh`./run.sh devnet setup 
                          --oracles-members ${oracles.map(({ publicKey }) => publicKey).join(",")}
                          --oracles-quorum ${oracles.length - 1}
                          --oracles-initial-epoch 60
                          --dsm-guardians ${councils.map(({ publicKey }) => publicKey).join(",")}
                          --dsm-quorum ${councils.length}
                          --roles-beneficiary ${deployer.publicKey}`;
  },
});
