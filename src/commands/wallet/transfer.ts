import { Params, command, sendFundingTransaction } from "@devnet/command";
import { readWalletFile } from "@devnet/state";
import { DevNetError } from "@devnet/utils";

import { resolveAddress, resolvePrivateKey } from "./wallet.helpers.js";

export const WalletTransfer = command.cli({
  description: "Transfer ETH between accounts. Sender/recipient can be named roles or raw keys/addresses.",
  params: {
    amount: Params.string({
      description: "ETH amount to send.",
      required: true,
    }),
    from: Params.string({
      description:
        "Sender: a named role (deployer, oracle1, etc.) or a 0x-prefixed private key.",
      required: true,
    }),
    providerUrl: Params.string({
      description: "EL RPC URL. If not provided, uses chain state.",
    }),
    to: Params.string({
      description:
        "Recipient: a named role (deployer, oracle1, etc.) or a 0x-prefixed address.",
      required: true,
    }),
  },
  async handler({ dre: { logger, state }, params }) {
    const { amount, from, to } = params;

    if (!from || !to || !amount) {
      throw new DevNetError("--from, --to, and --amount are required.");
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

    // Resolve sender and recipient — prefer wallets.yml
    let senderKey: string;
    let recipientAddress: string;

    try {
      const fileWallet = await readWalletFile(state.artifactsRoot);
      const wallet = fileWallet ?? await state.getNamedWallet();
      senderKey = resolvePrivateKey(from, wallet);
      recipientAddress = resolveAddress(to, wallet);
    } catch (error: unknown) {
      if (error instanceof DevNetError) throw error;

      // No wallet — both must be raw values
      if (!from.startsWith("0x")) {
        throw new DevNetError(
          `Cannot resolve role '${from}' without a wallet. Run 'wallet create' first or provide a raw private key.`,
        );
      }

      if (!to.startsWith("0x")) {
        throw new DevNetError(
          `Cannot resolve role '${to}' without a wallet. Run 'wallet create' first or provide a raw address.`,
        );
      }

      senderKey = from;
      recipientAddress = to;
    }

    logger.log(`Transferring ${amount} ETH...`);
    logger.log(`  From: ${from}`);
    logger.log(`  To:   ${recipientAddress}`);
    logger.log("");

    const receipt = await sendFundingTransaction({
      amount,
      privateKey: senderKey,
      providerUrl,
      toAddress: recipientAddress,
    });

    logger.log(`Transaction successful!`);
    logger.log(`  TX hash: ${receipt.hash}`);
    logger.log(`  Block:   ${receipt.blockNumber}`);
    logger.log(`  Gas used: ${receipt.gasUsed.toString()}`);
  },
});
