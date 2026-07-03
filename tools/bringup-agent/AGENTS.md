# Devnet bring-up agent fleet — constitution

All roles read this file first. This directory is **SELF-CONTAINED**: a fresh AI
with no prior context (no session history, no external/personal vault) can drive
the whole flow from these files alone. Everything operational lives here.

**Reading order (fresh context):** this file → `RUNBOOK.md` (operator flow,
step by step) → `CLUSTERS.md` (env / tunnel-port / kube-context map) →
`agents/<role>.md` as each role is dispatched → `knowledge/saga-eval.jsonl`
(labeled past incidents, the `diagnosis` reference) + `lib/verify-state.ts`
(the read-only goal-state probe). Roles: director / maker / diagnosis /
verifier / plumber / cleaner.

## Goal (definition of done) — machine-verifiable via lib/verify-state.ts

- **chain**: finalizing, `is_optimistic = false`.
- **oracles** (AO / VEBO / CSM / CMv2): each reporter daemon **came up without
  errors** (Running, no CrashLoopBackOff, no fresh traceback) **and is sending
  reports** — read logs-first (submission log line), optionally confirmed
  on-chain — sustained across 2 consecutive probe snapshots. Oracle contract
  internals are the oracle team's responsibility; we verify operation, not audit.
- **KAPI**: `/v1/status` -> 200 plus `/v1/keys`, `/v1/modules`, `/v1/operators`.
- **validators**: `active_ongoing`, attesting, balance not leaking.
- **observability**: dashboard up (`dashboard build` + `dashboard up`), logging
  stack up (`logging up`), Grafana up (`grafana up`) — all serving.
- **status digest**: `chain publish-digest-to-slack` runs and emits the digest
  message to the terminal for a human to post to Slack.

A pod showing `Running` is not enough: a daemon can crash-loop or emit no reports.
Require up-clean AND report-sent, sustained across 2 snapshots. Only the
predicates above count.

## Prerequisites

- **kube-API tunnel** must be up before any cluster access (kubectl / deploys):
  `./bin/run.js ssh tunnel` PLUS the right kube context (`kubectl config
  use-context <cluster>`) — see the repo `README.md` (§ SSH Tunnel / set context)
  and `docs/commands/tunnel.md`. Owned and guarded by the `plumber`, which first
  applies the chosen cluster's env (valset-02/03) to `.env` + `workspaces/cli-pod/.env`
  (then `cli-pod update`) — that sets the SSH target and context. Public-ingress
  checks (chain / KAPI / dashboard / Grafana / validators) still work without it.
- **Devnet spec** must be read before deploying. Ask the human for the current
  spec links (e.g. the ethpandaops devnet notes page and the network-configs
  `metadata` dir on GitHub). Extract chain-id, fork versions, checkpoint-sync
  URL, and genesis before configuring the stand.

## Inputs (ask the human at start)

- **Which cluster** — valset-02 or valset-03? Decides SSH target, kube context,
  ingress domain. The `plumber` applies it to `.env` + `workspaces/cli-pod/.env`.
- Deploy **DSM**? (deposit security: `data-bus` + `dsm-bots-k8s` + `council-k8s`)
- Deploy **DG**? (dual governance: `dg` topic)
- **How many validators** per module?

## Pre-deploy gate (before `lido-core deploy`)

Verify BEFORE deploying — getting either wrong forces a costly CSM/CMv2
HashConsensus redeploy afterward (deploy new HashConsensus + `setConsensusContract`
+ vote, and a convergence cycle):

- **Oracle depth:** an EL serves historical state at the depth a report needs
  (`verify-state.ts` `nodes[]`: `servesOracleDepth`, `window` = `deep`|`archive`).
  A pruned EL (~128 blocks) CANNOT collect a report. If the current pair fails,
  try ANOTHER pair (besu FOREST archive, geth hash+archive via `--suffix`) and
  re-probe — do this BEFORE deploying the protocol, never after.
- **getProof:** the EL serves `eth_getProof` at that depth (`nodes[].servesGetProof`)
  for the CSM prover. geth path scheme does not serve historical proofs → a
  hash-scheme / archive pair is needed (may be a separate proofs pair).
- Oracle HashConsensus **initialEpoch will be set >= checkpoint** — front-loaded,
  never below (it locks once the epoch arrives).
- **Funding:** `wallets.yml` (deployer + named roles) is present at
  `artifacts/<net>/wallets.yml` — source it from 1Password (a copy sits in the
  cli-pod artifacts). Genesis pre-funds the deployer (`0x11…`); then run
  `./bin/run.js wallet fund` (default ~1000 ETH to every named account) BEFORE the
  protocol deploy — Core deploy and oracle ops pay gas from these. (Not needed for
  a bare chain-healthy EL/CL pair.)

## Invariants (never violate)

1. **Cost metric = time + determinism + human attention. Gas ~= 0** on a
   devnet (funded deployer). Do not optimize for gas.
2. **Front-load every known fix before the first run.** Core has no incremental
   resume: a mid-run failure resets state and forces a full ~50-min redeploy.
   Load all applicable fixes up front so the first attempt has the best odds.
3. **Autonomy boundary.** Autonomous: pod restart, node-pair swap, moving-tag
   digest bump, branch re-checkout, image rebuild, single-service redeploy.
   Human-gated (recommend, do not execute): protocol redeploy, governance
   (vote / role grant / contract deploy), and deleting stands / namespaces /
   cluster-scoped resources (the `cleaner`'s domain — always confirm keep-vs-delete).
4. **No secrets in escalation, and `wallets.yml` is secret.** Never emit private
   addresses, keys, or local paths in escalations. `wallets.yml` holds the devnet
   funding **private keys** (deployer + named roles) — never commit, print, log,
   or copy it into the repo / vault / escalations. It lives in 1Password (and,
   ephemerally, the cli-pod artifacts).
5. **`converging-wait` is not a failure.** Do not act inside the expected
   convergence window (see diagnosis timing model). Premature action wastes
   time and can undo a convergence that would have completed on its own.
6. **Run build/deploy commands inside cli-pod, not locally.** Long deploys
   (Core, `stands ... -full`, replays) run in pod-tmux so a dropped tunnel or a
   sleeping laptop cannot lose deploy progress (Core has no incremental resume).
   The only local commands are building/compiling THIS project (`yarn build`,
   then `cli-pod update` to bake the new tree into the pod). Network/config
   context lives in `workspaces/cli-pod/.env` (baked into the image via the
   Dockerfile `COPY`), NOT the repo-root `.env`.
7. **state.json is the source of truth.** Read every endpoint and address from
   it — no CLI overrides, no external fallbacks. A missing key or an unreachable
   endpoint is a FINDING (a bring-up step did not complete), not something to
   route around. Absence = signal to investigate. The dashboard is the human
   view of the oracle report slots (browser-rendered from the same state.json
   addresses); point humans there in escalations.
8. **Connection lost => plumber.** If ANY role sees the kube-API is unreachable
   (connection refused / tunnel down), it stops and hands to the `plumber`. It
   does NOT diagnose or work around it — a dropped tunnel is a prerequisite
   failure, not a bring-up fault. Never route it to `diagnosis`.

## Logging (two layers — both feed `diagnosis`'s prior-run archive)

Everything is journaled so a run can be replayed and debugged after the fact.

- **A. Command output** → `artifacts/<net>/NN-<step>.log` (numbered, timestamped).
  Run every deploy / omnibus / replay / probe through `dlog.sh` (ships in this
  dir): `dlog.sh NN-step.log {pod|local} <cmd>` captures full output + `exit=<rc>`.
  Do NOT trust the exit code alone (some commands exit 0 on failure) — the log has
  the real output. Never delete these; they are the evidence for upstream reports.
- **B. Agent action trace** (optional; default-on for unattended runs) →
  `artifacts/<net>/agent-trace.jsonl`. After each meaningful action or decision,
  every role appends ONE line:
  `{"ts","role","phase","action","detail","result","logref?"}` — e.g.
  `{"role":"diagnosis","action":"classify","detail":"lighthouse SSZ invalid","result":"image-tag-drift -> fork-aware image","logref":"14-cl.log"}`.
  This is the replayable trace of the fleet's LOGIC (who did what, why, in what
  order), separate from raw command output — for debugging the orchestration.
  **The `director`'s trace is MANDATORY** (it is the run's decision spine — see
  director.md); leaf roles append when tracing is on.

## Roster

- `director`  — orchestrator / main loop. Owns the goal graph and escalation.
- `maker`     — executor. Brings up one component idempotently.
- `diagnosis` — fault classifier. Failure signal -> class + remediation + ETA.
- `verifier`  — independent goal-state verdict via `lib/verify-state.ts`.
- `plumber`   — guards the kube-API tunnel (prerequisite for cluster access); detects when it is down and helps the human (re)establish it.
- `cleaner`   — inventories leftovers from previous devnets, confirms keep/delete with the human, removes only what is approved (destroys; never builds).

## Shared references

- `knowledge/` — bring-up checklist (operational playbook) and the labeled
  incident corpus (`saga-eval.jsonl`) used to calibrate `diagnosis`.
- `CLUSTERS.md` — env / tunnel-port / kube-context / ingress mapping. Names do
  NOT line up (valset-02 = context `tooling-holesky-sandbox-0`); match by tunnel
  port. A missing context is not created by the tunnel — escalate for kubeconfig.
- `artifacts/<net>/` — accumulated per-run logs + `FINDING-*.md` notes from
  prior attempts (this and past nets): an optional, richer knowledge source for
  `diagnosis`. Every run appends to it; notable incidents get distilled into
  `saga-eval.jsonl`.
- `state.json` — source of ingress URLs and contract addresses for the stand.
