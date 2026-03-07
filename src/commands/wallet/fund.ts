import { Params, command, sendFundingTransaction } from "@devnet/command";
import { readWalletFile } from "@devnet/state";
import { DevNetError } from "@devnet/utils";
import { JsonRpcProvider, ethers, formatEther } from "ethers";

import { getNamedEntries } from "./wallet.helpers.js";

export const WalletFund = command.isomorphic({
  description:
    "Fund all named wallet accounts with ETH from a pre-funded account (e.g., genesis key).",
  params: {
    amount: Params.string({
      default: "1000",
      description: "ETH amount to send to each account.",
    }),
    privateKey: Params.string({
      description: "Private key of the funding account (0x-prefixed hex).",
      required: true,
    }),
    providerUrl: Params.string({
      description: "EL RPC URL. If not provided, uses chain state.",
    }),
    roles: Params.string({
      description: "Comma-separated roles to fund (default: all). E.g., deployer,oracle1,oracle2",
    }),
  },
  async handler({ dre: { logger, state }, params }) {
    const amount = params.amount ?? "1000";
    const { privateKey } = params;

    if (!privateKey) {
      throw new DevNetError("--privateKey is required.");
    }

    // Resolve provider URL
    let { providerUrl } = params;
    if (!providerUrl) {
      try {
        const chain = await state.getChain();
        providerUrl = chain.elPublic;
      } catch {
        throw new DevNetError(
          "No chain configured and --providerUrl not provided. Either start the chain or pass --providerUrl.",
        );
      }
    }

    // Get wallet — prefer wallets.yml if it exists
    let wallet;
    const fileWallet = await readWalletFile(state.artifactsRoot);
    if (fileWallet) {
      wallet = fileWallet;
    } else {
      try {
        wallet = await state.getNamedWallet();
      } catch {
        throw new DevNetError("No wallet found. Run 'wallet create' first.");
      }
    }

    // Parse roles filter
    const rolesFilter = params.roles
      ? params.roles.split(",").map((r) => r.trim())
      : undefined;
    const entries = getNamedEntries(wallet, rolesFilter);

    if (entries.length === 0) {
      throw new DevNetError(`No matching roles found for: ${params.roles}`);
    }

    // Check funder balance
    const provider = new JsonRpcProvider(providerUrl);
    const funder = new ethers.Wallet(privateKey, provider);
    const funderBalance = await provider.getBalance(funder.address);

    logger.log(`Funder: ${funder.address}`);
    logger.log(`Funder balance: ${formatEther(funderBalance)} ETH`);
    logger.log(`Sending ${amount} ETH to ${entries.length} accounts...`);
    logger.log("");

    let funded = 0;
    let failed = 0;

    for (const [role, account] of entries) {
      try {
        logger.log(`  ${role.padEnd(16)} ${account.publicKey} ... `);

        const receipt = await sendFundingTransaction({
          amount,
          privateKey,
          providerUrl,
          toAddress: account.publicKey,
        });

        logger.log(`    TX: ${receipt.hash}`);
        funded++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        logger.log(`    FAILED: ${message}`);
        failed++;
      }
    }

    logger.log("");
    logger.log(`Funded ${funded}/${entries.length} accounts with ${amount} ETH each.`);
    if (failed > 0) {
      logger.log(`${failed} transfers failed.`);
    }
  },
});
