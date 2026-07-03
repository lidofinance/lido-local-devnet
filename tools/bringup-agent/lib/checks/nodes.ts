// Node-capability probe (read-only, PRE-DEPLOY gate for oracles). Oracles read
// the state at the block of the PREVIOUS report — a pruned EL (~128 blocks)
// cannot collect a report. CSM prover needs eth_getProof at that depth (geth path
// scheme does not serve historical proofs; use hash scheme / archive). If a pair
// fails these, try ANOTHER pair (besu FOREST archive, geth hash+archive) BEFORE
// deploying the protocol — a wrong node choice means a costly HashConsensus redeploy.

import { JsonRpcProvider } from "ethers";

import type { NodeCapability, StateJson } from "../types.js";

import { ORACLE_LOOKBACK_BLOCKS } from "../constants.js";

const ZERO = "0x0000000000000000000000000000000000000000";
const hex = (n: number) => `0x${n.toString(16)}`;

async function stateAvailable(p: JsonRpcProvider, block: number): Promise<boolean> {
  if (block < 1) return false;
  try { await p.getBalance(ZERO, block); return true; } catch { return false; }
}

async function getProofAvailable(p: JsonRpcProvider, block: number): Promise<boolean> {
  if (block < 1) return false;
  try { await p.send("eth_getProof", [ZERO, [], hex(block)]); return true; } catch { return false; }
}

function blank(el: string): NodeCapability {
  return {
    el, getProofDeep: false, headBlock: null, servesGetProof: false, servesOracleDepth: false,
    stateArchive: false, stateDeep: false, stateRecent: false, window: "unknown",
  };
}

async function probeEl(el: string): Promise<NodeCapability> {
  let provider: JsonRpcProvider | null = null;
  try { provider = new JsonRpcProvider(el); } catch { provider = null; }
  let head: null | number = null;
  if (provider) { try { head = await provider.getBlockNumber(); } catch { head = null; } }
  if (!provider || head === null) return blank(el);

  const deep = head - ORACLE_LOOKBACK_BLOCKS;
  const [stateRecent, stateDeep, stateArchive, getProofDeep] = await Promise.all([
    stateAvailable(provider, head - 64),
    stateAvailable(provider, deep),
    stateAvailable(provider, 1),
    getProofAvailable(provider, deep),
  ]);
  const window = stateArchive ? "archive" : stateDeep ? "deep" : stateRecent ? "pruned" : "unknown";
  return {
    el, getProofDeep, headBlock: head, servesGetProof: getProofDeep, servesOracleDepth: stateDeep,
    stateArchive, stateDeep, stateRecent, window,
  };
}

export async function checkNodes(s: StateJson): Promise<NodeCapability[]> {
  const raw = [s.chain?.elPublic, ...(s.nodesIngress?.el ?? []).map((n) => n.publicIngressUrl)].filter(Boolean);
  const els = [...new Set(raw)] as string[]; // dedup; runtime values are all strings
  return Promise.all(els.map((el) => probeEl(el)));
}
