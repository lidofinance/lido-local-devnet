/*
 * verify-state.ts — deterministic, read-only devnet goal-state probe (entry).
 *
 * Single source of truth about whether the bring-up goal is met. Runs with no
 * LLM: a human can run it directly, and the verifier agent shells out to it.
 *
 *   node --loader ts-node/esm tools/bringup-agent/lib/verify-state.ts \
 *     --state <path/to/state.json> [--net <network-name>]
 *   # if ts-node type-checking chokes on the repo tsconfig: prefix TS_NODE_TRANSPILE_ONLY=1
 *
 * state.json IS THE SOURCE OF TRUTH — every endpoint/address is read from it, no
 * CLI overrides, no external fallbacks. A missing key or unreachable endpoint is
 * NOT skipped: it is reported as a finding (a bring-up step did not complete).
 *
 * Modules: io.ts (fetch/kubectl/state helpers), constants.ts, checks/*.ts.
 */

import type { Snapshot } from "./types.js";

import { checkChain } from "./checks/chain.js";
import { checkKapi } from "./checks/kapi.js";
import { checkNodes } from "./checks/nodes.js";
import { checkObservability } from "./checks/observability.js";
import { checkOracles } from "./checks/oracles.js";
import { checkValidators } from "./checks/validators.js";
import { networkName, prevSnapshot, readState, snapshotDir, writeSnapshot } from "./io.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const arg = (k: string): string | undefined => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
  const s = readState(arg("--state") ?? "");
  const net = arg("--net") ?? networkName(s);

  const kapi = await checkKapi(s);
  const [chain, oracles, validators, observability, nodes] = await Promise.all([
    checkChain(s),
    checkOracles(s, net),
    checkValidators(s, kapi.url),
    checkObservability(s),
    checkNodes(s),
  ]);
  const snap: Snapshot = { chain, kapi, net, nodes, observability, oracles, ts: new Date().toISOString(), validators };

  // steady = second confirmation across two snapshots (the only stateful part)
  const dir = snapshotDir(net);
  const prev = prevSnapshot(dir);
  if (prev) {
    snap.chain.finalizing = (snap.chain.finalizedEpoch ?? -1) > (prev.chain?.finalizedEpoch ?? -1);
    for (const [k, t] of Object.entries(snap.oracles.types)) {
      const p = prev.oracles?.types?.[k];
      const progressedOnChain = typeof t.refSlot === "number" && typeof p?.refSlot === "number" && t.refSlot > p.refSlot;
      const sustainedInLogs = t.reportSentInLogs && Boolean(p?.reportSentInLogs);
      t.steadyReport = sustainedInLogs || progressedOnChain; // logs-first, contract confirms
      t.pass = t.upClean && t.steadyReport;
    }
  }

  snap.chain.pass = !snap.chain.isOptimistic && snap.chain.finalizing === true && (snap.chain.peers ?? 0) > 0;

  snap.allGreen = [
    snap.chain.pass,
    snap.kapi.pass,
    snap.validators.pass,
    snap.observability.pass,
    ...Object.values(snap.oracles.types).map((t) => t.pass),
  ].every((x) => x === true);

  // persist so the NEXT run can evaluate "steady across 2 frames"
  writeSnapshot(dir, snap);
  process.stdout.write(`${JSON.stringify(snap, null, 2)}\n`);
}

await main();
