import { command } from "@devnet/command";

export const EasyTrackInstall = command.cli({
  description: "Install dependencies and set up brownie for easy-track",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const { easyTrack } = dre.services;
    const { elPublic } = await dre.state.getChain();

    const pyenvPath = `${process.env.HOME}/.pyenv/shims:${process.env.HOME}/.pyenv/bin`;
    const sh = easyTrack.sh({
      env: {
        PATH: `${pyenvPath}:${process.env.PATH}`,
        DEVNET_RPC_URL: elPublic,
      },
    });

    logger.log("Installing poetry dependencies...");
    await sh`poetry install`;

    logger.log("Importing brownie network config...");
    await sh`poetry run brownie networks import network-config.yaml True`;

    logger.log("Compiling contracts with brownie...");
    await sh`poetry run brownie compile`;

    logger.log("Easy-track dependencies installed successfully.");
  },
});
