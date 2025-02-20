import { command } from "@devnet/command";

import { VotingInstall } from "./install.js";

export const AddBrownieAccount = command.cli({
  description: "Add a new account to Brownie in silent mode",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      state,
      services: { voting },
    },
  }) {
    await dre.runCommand(VotingInstall, {});

    const { deployer } = await state.getNamedWallet();

    logger.log("====================================");
    logger.log("💡 Starting the process to add a new Brownie account...");
    logger.log(`📌 Account Name (alias): ${deployer.publicKey}`);
    logger.log(
      "🔑 IMPORTANT: You will need to enter the private key manually.",
    );
    logger.log("🔒 Follow the instructions carefully:");
    logger.log("  1. When prompted, copy and paste the following private key:");
    logger.log(`     Private Key: ${deployer.privateKey}`);
    logger.log("  2. After that, you will be asked to set a password.");
    logger.log(
      "     ➡️  For testing or development purposes, it is recommended to use an **empty password**.",
    );
    logger.log("  3. Confirm the password by pressing Enter again.");
    logger.log("====================================");

    await voting.sh`poetry run brownie accounts new ${deployer.publicKey}`;

    logger.log("✅ Account addition completed successfully!");
    logger.log(
      `🎉 Account '${deployer.privateKey}' has been added to Brownie.`,
    );
    logger.log("====================================");
  },
});
