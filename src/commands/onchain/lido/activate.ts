import { command } from "../../../lib/command/command.js";
import { setupDevNet } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";
import { LidoCoreInstall } from "./install.js";

export const ActivateLidoProtocol = command.cli({
  description:
    "Activates the lido-core protocol by deploying smart contracts and configuring the environment based on the current network state.",
  params: {},
  async handler({ logger, dre }) {
    const { state, artifacts } = dre;
    const { lidoCLI } = artifacts.services;

    logger("Initiating the activation of the lido-core protocol...");

    // Ensures all dependencies are installed before proceeding
    logger("Ensuring dependencies are installed...");
    await LidoCoreInstall.exec(dre, {});
    logger("Dependencies installed successfully.");

    const { elPublic } = await state.getChain();
    const { deployer, oracles, councils } = await state.getNamedWallet();

    logger(`Ensuring the execution node at ${elPublic} is ready...`);
    await waitEL(elPublic);
    logger("Execution node is ready.");

    const deployEnv = {
      DEPLOYED: "deployed-local-devnet.json",
      EL_CHAIN_ID: "32382",
      EL_NETWORK_NAME: "local-devnet",
      PRIVATE_KEY: deployer.privateKey,
      EL_API_PROVIDER: elPublic,
    };

    logger("Deploying and configuring lido-core protocol components...");

    await setupDevNet(
      {
        dsmGuardians: councils.map(({ publicKey }) => publicKey),
        dsmQuorum: councils.length,
        oraclesInitialEpoch: 60,
        oraclesMembers: oracles.map(({ publicKey }) => publicKey),
        oraclesQuorum: oracles.length - 1,
        rolesBeneficiary: deployer.publicKey,
      },
      lidoCLI.root,
      deployEnv,
    );

    logger("✅ Lido-core protocol activation completed successfully.");
  },
});
