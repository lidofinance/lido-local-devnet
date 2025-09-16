import { command } from "@devnet/command";

export const ActivateLidoProtocol = command.cli({
  description:
    "Activates the lido-core protocol by deploying smart contracts and configuring the environment based on the current network state.",
  params: {},
  async handler({ dre, dre: { logger} }) {
    const {
      state,
      services: { lidoCLI, oracle },
      network,
    } = dre;

    if (await state.isLidoActivated()) {
      logger.log("Lido already activated");
      return;
    }

    const { elPublic } = await state.getChain();
    const { deployer, oracles, councils } = await state.getNamedWallet();
    const clClient = await network.getCLClient();

    await dre.network.waitEL();

    const deployEnv = {
      DEPLOYED: "deployed-local-devnet.json",
      EL_CHAIN_ID: "32382",
      EL_NETWORK_NAME: "local-devnet",
      PRIVATE_KEY: deployer.privateKey,
      EL_API_PROVIDER: elPublic,
    };

    const {
      HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    } = oracle.config.constants;

    const epochPerFrame = Math.max(
      HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    );

    const currentEpoch = await clClient.getHeadEpoch();
    const initialEpoch = epochPerFrame + currentEpoch + 2;

    const activateCoreSh = lidoCLI.sh({ env: deployEnv });

    await activateCoreSh`./run.sh devnet setup
                          --oracles-members ${oracles.map(({ publicKey }) => publicKey).join(",")}
                          --oracles-quorum ${oracles.length - 1}
                          --oracles-initial-epoch ${initialEpoch}
                          --dsm-guardians ${councils.map(({ publicKey }) => publicKey).join(",")}
                          --dsm-quorum ${councils.length}
                          --roles-beneficiary ${deployer.publicKey}`;

    await state.updateLidoActivated({ active: true });
  },
});
