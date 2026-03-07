import { Params, command } from "@devnet/command";
import { readWalletFile } from "@devnet/state";
import { JsonRpcProvider, formatEther } from "ethers";

import { getNamedEntries } from "./wallet.helpers.js";

export const WalletInfo = command.cli({
  description: "Display wallet addresses and optionally ETH balances.",
  params: {
    balances: Params.boolean({
      default: false,
      description: "Fetch and display ETH balances (requires running chain).",
    }),
  },
  async handler({ dre: { logger, state }, params }) {
    // Prefer wallets.yml if it exists, otherwise fall back to state
    let wallet;
    const fileWallet = await readWalletFile(state.artifactsRoot);
    if (fileWallet) {
      wallet = fileWallet;
    } else {
      try {
        wallet = await state.getNamedWallet();
      } catch {
        logger.log("No wallet configured for this network.");
        logger.log("Run 'wallet create' to generate a new wallet.");

        return;
      }
    }

    const entries = getNamedEntries(wallet);

    if (!params.balances) {
      logger.log("Wallet accounts:");
      logger.log("");

      for (const [role, account] of entries) {
        logger.log(`  ${role.padEnd(16)} ${account.publicKey}`);
      }

      return;
    }

    // Fetch balances
    let providerUrl: string;
    try {
      const chain = await state.getChain();
      providerUrl = chain.elPublic;
    } catch {
      logger.log("Chain is not configured. Cannot fetch balances.");
      logger.log("Start the chain first or use 'wallet info' without --balances.");

      return;
    }

    const provider = new JsonRpcProvider(providerUrl);

    logger.log("Wallet accounts:");
    logger.log("");
    logger.log(`  ${"Role".padEnd(16)} ${"Address".padEnd(44)} Balance`);
    logger.log(`  ${"─".repeat(16)} ${"─".repeat(44)} ${"─".repeat(20)}`);

    for (const [role, account] of entries) {
      try {
        const balance = await provider.getBalance(account.publicKey);
        const formatted = formatEther(balance);
        const display = `${Number(formatted).toFixed(4)} ETH`;

        logger.log(`  ${role.padEnd(16)} ${account.publicKey.padEnd(44)} ${display}`);
      } catch {
        logger.log(`  ${role.padEnd(16)} ${account.publicKey.padEnd(44)} (error fetching)`);
      }
    }
  },
});
