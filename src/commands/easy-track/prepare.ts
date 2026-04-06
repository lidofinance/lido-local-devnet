import { command } from "@devnet/command";

/**
 * Prepare easy-track for devnet: just compile contracts.
 * The feat/devnet-support branch already has all devnet configs,
 * using env vars for addresses (DEVNET_ACL, DEVNET_AGENT, etc.)
 */
export const EasyTrackPrepare = command.cli({
  description: "Prepare easy-track for devnet deployment",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Easy Track branch feat/devnet-support has built-in devnet support. No patching needed.");
    logger.log("Contract addresses are passed via environment variables at deploy time.");
  },
});
