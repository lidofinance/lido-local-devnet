import { Params, command } from "@devnet/command";
import {
  generateKeysFromMnemonic,
  generateMnemonicAndKeys,
  readWalletFile,
  writeWalletFile,
} from "@devnet/state";
import { DevNetError } from "@devnet/utils";
import { Mnemonic } from "ethers";

import { getNamedEntries } from "./wallet.helpers.js";

export const WalletCreate = command.isomorphic({
  description: "Generate a new wallet (mnemonic + named accounts) and save to wallets.yml.",
  params: {
    force: Params.boolean({
      default: false,
      description: "Overwrite existing wallets.yml if it exists.",
    }),
    mnemonic: Params.string({
      description: "Use an existing mnemonic instead of generating a new one.",
    }),
  },
  async handler({ dre: { logger, state }, params }) {
    const { artifactsRoot } = state;

    // Check if wallet already exists
    if (!params.force) {
      const existing = await readWalletFile(artifactsRoot);
      if (existing) {
        logger.log("Wallet already exists (use --force to overwrite):");
        logWallet(logger, existing);

        return;
      }
    }

    // Generate or derive keys
    let mnemonic: string;
    let keys: { privateKey: string; publicKey: string }[];

    if (params.mnemonic) {
      if (!Mnemonic.isValidMnemonic(params.mnemonic)) {
        throw new DevNetError("Invalid mnemonic provided.");
      }

      mnemonic = params.mnemonic;
      keys = generateKeysFromMnemonic(mnemonic, 20);
    } else {
      const result = generateMnemonicAndKeys(20);
      mnemonic = result.mnemonic;
      keys = result.keys;
    }

    // Map keys to named roles (same convention as state.getNamedWallet)
    const namedWallet = {
      council1: keys[5]!,
      council2: keys[6]!,
      deployer: keys[0]!,
      oracle1: keys[2]!,
      oracle2: keys[3]!,
      oracle3: keys[4]!,
      secondDeployer: keys[1]!,
    };

    // Save to wallets.yml
    await writeWalletFile(artifactsRoot, namedWallet);

    logger.log("Wallet created successfully!");
    logger.log("");
    logger.log(`Mnemonic: ${mnemonic}`);
    logger.log("(Save this mnemonic securely - it can recover all accounts)");
    logger.log("");

    logWallet(logger, namedWallet);
  },
});

function logWallet(
  logger: { log: (msg: string) => void },
  wallet: Parameters<typeof getNamedEntries>[0],
) {
  const entries = getNamedEntries(wallet);

  for (const [role, account] of entries) {
    logger.log(`  ${role.padEnd(16)} ${account.publicKey}`);
  }
}
