// oracle goal (OPERATIONAL, not a contract audit): each reporter daemon came up
// without errors AND is sending reports. LOGS-FIRST (daemon logs), then a single
// view call per oracle (getLastProcessingRefSlot) on the state.json address as a
// second confirmation — the same data the dashboard renders in-browser.

import { Contract, JsonRpcProvider } from "ethers";

import type { AddrNode, KubePodList, OracleTypeResult, OraclesResult, PodInfo, StateJson } from "../types.js";

import { ERROR_TOKENS, LOG_TAIL, ORACLE_ABI, ORACLE_TYPES, REPORT_SENT_TOKENS } from "../constants.js";
import { addrOf, get, kube } from "../io.js";

export async function checkOracles(s: StateJson, net: null | string): Promise<OraclesResult> {
  const ns = `kt-${net}-oracles`;

  const podsRes = kube(["get", "pods", "-n", ns, "-o", "json"]);
  // Distinguish "can't reach the cluster" (tunnel down) from "no oracle pods".
  if (podsRes.unreachable) {
    return { missing: "kube-API unreachable — tunnel down? run ./bin/run.js ssh tunnel", namespace: ns, pass: false, types: {}, unreachable: true };
  }

  if (!podsRes.ok) return { missing: "kubectl failed listing pods", namespace: ns, pass: false, types: {} };
  let list: KubePodList | null = null;
  try {
    list = JSON.parse(podsRes.stdout) as KubePodList;
  } catch {
    list = null;
  }

  if (!list?.items?.length) return { missing: "no oracle pods in namespace (oracles not deployed?)", namespace: ns, pass: false, types: {} };
  const { items } = list;

  let provider: JsonRpcProvider | null = null;
  try {
    provider = new JsonRpcProvider(s.chain?.elPublic);
  } catch {
    provider = null; // logs-only; contract-second is optional
  }

  const entries = await Promise.all(
    ORACLE_TYPES.map(async (t): Promise<[string, OracleTypeResult]> => {
      const pods: PodInfo[] = items
        .filter((p) => {
          const n = p.metadata?.name ?? "";
          return ORACLE_TYPES.find((x) => n.startsWith(x.prefix))?.key === t.key;
        })
        .map((p) => {
          const cs = p.status?.containerStatuses ?? [];
          const logs = kube(["logs", "-n", ns, p.metadata?.name ?? "", "--tail", String(LOG_TAIL)]).stdout;
          return {
            crashloop: cs.some((c) => c.state?.waiting?.reason === "CrashLoopBackOff"),
            logError: ERROR_TOKENS.some((tok) => logs.includes(tok)),
            name: p.metadata?.name ?? "",
            phase: p.status?.phase,
            reportSentInLogs: REPORT_SENT_TOKENS.some((tok) => logs.includes(tok)),
            restarts: cs.reduce((a, c) => a + (c.restartCount ?? 0), 0),
          };
        });

      const addr = addrOf(get(s, t.addrPath) as AddrNode);
      let refSlot: null | number = null;
      if (provider && addr) {
        try {
          refSlot = Number(await new Contract(addr, ORACLE_ABI, provider).getLastProcessingRefSlot());
        } catch {
          refSlot = null; // contract-second is optional; logs stay primary
        }
      }

      return [t.key, {
        addr,
        pass: null, // set by the entry via snapshot diff
        pods,
        refSlot, // CONTRACT-SECOND
        reportSentInLogs: pods.some((p) => p.reportSentInLogs), // LOGS-FIRST
        steadyReport: null,
        upClean: pods.length > 0 && pods.every((p) => p.phase === "Running" && !p.crashloop && !p.logError),
      }];
    }),
  );

  return { namespace: ns, types: Object.fromEntries(entries) };
}
