import { HDNodeWallet, Mnemonic } from "ethers";
import { randomBytes } from "node:crypto";

type GeneratedWallet = {
  privateKey: string;
  publicKey: string;
}[];

/**
 * Generates a set of private and public keys (addresses) based on a mnemonic phrase.
 * @param mnemonic - The mnemonic phrase to generate keys from.
 * @param count - The number of keys to generate.
 * @returns An array of objects containing private keys and addresses.
 */
export function generateKeysFromMnemonic(
  mnemonic: string,
  count: number,
): GeneratedWallet {
  // Validate the mnemonic
  if (!Mnemonic.isValidMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic provided.");
  }

  const hdNode = HDNodeWallet.fromPhrase(mnemonic);

  const keys = [];
  for (let i = 0; i < count; i++) {
    const derivedWallet = hdNode.deriveChild(i);
    keys.push({
      privateKey: derivedWallet.privateKey,
      publicKey: derivedWallet.address,
    });
  }

  return keys;
}

/**
 * Generates a new mnemonic and derives keys from it.
 * @param count - The number of keys to generate.
 * @returns An object containing the mnemonic and an array of keys (private keys and addresses).
 */
export function generateMnemonicAndKeys(count: number = 1): {
  keys: { privateKey: string; publicKey: string }[];
  mnemonic: string;
} {
  const entropy = randomBytes(16); // Generates 16 bytes of entropy for a 12-word mnemonic
  const mnemonic = Mnemonic.entropyToPhrase(entropy);
  const keys = generateKeysFromMnemonic(mnemonic, count);
  return { keys, mnemonic };
}

let generatedWallet: GeneratedWallet;

export const generateKeysFromMnemonicOnce = (
  mnemonic: string,
  count: number,
) => {
  if (generatedWallet) return generatedWallet;

  generatedWallet = generateKeysFromMnemonic(mnemonic, count);
  return generatedWallet;
};
