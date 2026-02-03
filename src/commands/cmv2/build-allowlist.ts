import { Params, command } from "@devnet/command";
import { getAddress } from "ethers";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const CMv2BuildAllowlist = command.cli({
  description: "Builds an allowlist file for CMv2 gate tree.",
  params: {
    addresses: Params.string({
      description: "Comma-separated list of addresses to include.",
      required: false,
    }),
    includeDeployer: Params.boolean({
      description: "Include deployer address.",
      required: false,
      default: true,
    }),
    includeSecondDeployer: Params.boolean({
      description: "Include second deployer address.",
      required: false,
      default: false,
    }),
    output: Params.string({
      description: "Output file path.",
      required: false,
      default: "artifacts/merkle/allowlist.json",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { deployer, secondDeployer } = await dre.state.getNamedWallet();
    const collected: string[] = [];

    if (params.includeDeployer) collected.push(deployer.publicKey);
    if (params.includeSecondDeployer) collected.push(secondDeployer.publicKey);

    if (params.addresses) {
      const extra = params.addresses
        .split(",")
        .map((addr) => addr.trim())
        .filter(Boolean);
      collected.push(...extra);
    }

    const unique = new Map<string, string>();
    for (const addr of collected) {
      const normalized = getAddress(addr);
      unique.set(normalized.toLowerCase(), normalized);
    }

    const list = [...unique.values()];
    if (list.length === 0) {
      throw new Error("Allowlist is empty.");
    }

    const outputPath = resolve(params.output);
    mkdirSync(resolve(outputPath, ".."), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(list, null, 2));
    logger.log(`Allowlist written to: ${outputPath}`);
  },
});
