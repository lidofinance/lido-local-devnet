import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

const WalletEntry = z.object({
  privateKey: z.string(),
  publicKey: z.string(),
});

const NamedWalletFileSchema = z.object({
  deployer: WalletEntry,
  secondDeployer: WalletEntry,
  oracle1: WalletEntry,
  oracle2: WalletEntry,
  oracle3: WalletEntry,
  council1: WalletEntry,
  council2: WalletEntry,
});

export type NamedWallet = {
  councils: z.infer<typeof WalletEntry>[];
  oracles: z.infer<typeof WalletEntry>[];
} & z.infer<typeof NamedWalletFileSchema>;

const WALLETS_FILE = "wallets.yml";

export async function readWalletFile(artifactsRoot: string): Promise<NamedWallet | null> {
  const filePath = path.join(artifactsRoot, WALLETS_FILE);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = YAML.parse(raw);
    const validated = NamedWalletFileSchema.parse(parsed);

    return {
      ...validated,
      oracles: [validated.oracle1, validated.oracle2, validated.oracle3],
      councils: [validated.council1, validated.council2],
    };
  } catch {
    return null;
  }
}

export async function writeWalletFile(
  artifactsRoot: string,
  wallet: Omit<NamedWallet, "councils" | "oracles">,
): Promise<void> {
  const filePath = path.join(artifactsRoot, WALLETS_FILE);

  const data = {
    deployer: wallet.deployer,
    secondDeployer: wallet.secondDeployer,
    oracle1: wallet.oracle1,
    oracle2: wallet.oracle2,
    oracle3: wallet.oracle3,
    council1: wallet.council1,
    council2: wallet.council2,
  };

  await fs.writeFile(filePath, YAML.stringify(data), "utf-8");
}
