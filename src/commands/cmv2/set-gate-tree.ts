import { Params, command } from "@devnet/command";
import { AbiCoder, Contract, JsonRpcProvider, Wallet, concat, getAddress, keccak256 } from "ethers";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

import { cmv2Extension } from "./extensions/cmv2.extension.js";

type MerkleProofs = Record<string, string[]>;

const readAddresses = (filePath: string): string[] => {
  const ext = extname(filePath).toLowerCase();
  const raw = readFileSync(filePath, "utf8").trim();

  if (ext === ".json") {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as string[];
    if (data && typeof data === "object") return Object.keys(data);
  }

  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const [addr] = line.split(",");
    if (addr && addr.trim()) out.push(addr.trim());
  }

  return out;
};

const toBytes = (hex: string) => Buffer.from(hex.slice(2), "hex");

const compareHex = (a: string, b: string) => Buffer.compare(toBytes(a), toBytes(b));

const buildTree = (addresses: string[]) => {
  const coder = AbiCoder.defaultAbiCoder();
  const leaves = addresses.map((addr) => {
    const encoded = coder.encode(["address"], [addr]);
    const leaf = keccak256(keccak256(encoded));
    return { addr, leaf };
  });

  leaves.sort((a, b) => compareHex(a.leaf, b.leaf));

  const leafHashes = leaves.map((l) => l.leaf);
  if (leafHashes.length === 0) {
    throw new Error("No valid addresses provided.");
  }

  const treeSize = 2 * leafHashes.length - 1;
  const tree = new Array<string>(treeSize);
  for (const [i, leafHash] of leafHashes.entries()) {
    tree[treeSize - 1 - i] = leafHash;
  }

  const nodeHash = (a: string, b: string) => {
    const [x, y] = compareHex(a, b) <= 0 ? [a, b] : [b, a];
    return keccak256(concat([x, y]));
  };

  for (let i = treeSize - 1 - leafHashes.length; i >= 0; i -= 1) {
    const left = tree[2 * i + 1];
    const right = tree[2 * i + 2];
    tree[i] = nodeHash(left, right);
  }

  const proofs: MerkleProofs = {};
  for (const [i, leaf] of leaves.entries()) {
    let idx = treeSize - 1 - i;
    const proof: string[] = [];
    while (idx > 0) {
      const sibling = idx - ((-1) ** (idx % 2));
      proof.push(tree[sibling]);
      idx = Math.floor((idx - 1) / 2);
    }

    proofs[leaf.addr.toLowerCase()] = proof;
  }

  return { root: tree[0], proofs, tree, leaves };
};

const gateAbi = [
  "function setTreeParams(bytes32 _treeRoot, string _treeCid) external",
];

export const CMv2SetGateTree = command.cli({
  description: "Builds a Merkle tree for allowlisted operators and updates curated/vetted gate.",
  params: {
    input: Params.string({
      description: "Path to CSV/JSON with addresses.",
    }),
    outputDir: Params.string({
      description: "Directory to write merkle-tree.json and merkle-proofs.json.",
      required: false,
    }),
    treeCid: Params.string({
      description: "Tree CID to store onchain.",
      required: false,
      default: "devnet-allowlist",
    }),
    gate: Params.string({
      description: "Override gate address (curated/vetted).",
      required: false,
    }),
    setRoot: Params.boolean({
      description: "Call setTreeParams on gate with built root.",
      required: false,
      default: false,
    }),
    vote: Params.boolean({
      description: "Use vote (via lidoCLI) to set tree root instead of direct call.",
      required: false,
      default: false,
    }),
  },
  extensions: [cmv2Extension],
  async handler({ params, dre, dre: { logger } }) {
    const { input, outputDir, treeCid, gate, setRoot, vote } = params;
    if (!input) {
      throw new Error("input is required");
    }
    const addressesRaw = readAddresses(input);

    const unique = new Map<string, string>();
    for (const addr of addressesRaw) {
      const normalized = getAddress(addr);
      unique.set(normalized.toLowerCase(), normalized);
    }

    const addresses = [...unique.values()];
    const { root, proofs, tree } = buildTree(addresses);

    const outDir = resolve(outputDir ?? "artifacts/merkle");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/addresses.json`, JSON.stringify(addresses, null, 2));
    writeFileSync(`${outDir}/merkle-tree.json`, JSON.stringify({ root, tree }, null, 2));
    writeFileSync(`${outDir}/merkle-proofs.json`, JSON.stringify(proofs, null, 2));

    logger.log(`Merkle root: ${root}`);
    logger.log(`Proofs written to: ${outDir}`);

    if (!setRoot) return;

    const cmv2State = await dre.state.getCMv2();
    const gateAddress =
      gate ?? (cmv2State.curatedGate === "0x0000000000000000000000000000000000000000"
        ? cmv2State.vettedGate
        : cmv2State.curatedGate);

    if (!gateAddress || gateAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("Gate address is not configured (curated/vetted).");
    }

    if (vote) {
      logger.log(`Creating vote to set tree root on gate ${gateAddress} with cid "${treeCid}"...`);
      await dre.services.lidoCLI.sh`./run.sh cmv2 set-gate-tree-vote --root ${root} --cid ${treeCid} --gate ${gateAddress}`;
      return;
    }

    const { elPublic } = await dre.state.getChain();
    const { deployer } = await dre.state.getNamedWallet();
    const provider = new JsonRpcProvider(elPublic);
    const wallet = new Wallet(deployer.privateKey, provider);
    const gateContract = new Contract(gateAddress, gateAbi, wallet);

    logger.log(`Setting tree root on gate ${gateAddress} with cid "${treeCid}"...`);
    const tx = await gateContract.setTreeParams(root, treeCid);
    await tx.wait();
    logger.log(`Tree root set. Tx: ${tx.hash}`);
  },
});
