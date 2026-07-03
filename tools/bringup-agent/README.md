# Devnet bring-up agent fleet (design skeleton)

Goal-directed agent system that brings a Lido deployment on a public devnet
(devnet-7+) to a verifiable end-state with minimal human attention. Built to
cover on-call gaps and reduce the bus factor: one person no longer has to
babysit a multi-hour bring-up by hand.

This is **not** an interval loop that re-runs one command. It is a
goal-directed system: there is a machine-verifiable target, several strategies
lead to it, and when strategies are exhausted it escalates to a human.

## Status

Design skeleton. The only near-runnable piece is `lib/verify-state.ts` (the
deterministic, read-only state probe). The `agents/*.md` files are subagent
definitions (prompts); they need to be wired into a runner before they "run".

## Layout

```
tools/bringup-agent/
├── AGENTS.md              # constitution: goal + roster + invariants (all roles read this)
├── agents/
│   ├── director.md        # orchestrator (owns the goal graph + escalation policy)
│   ├── maker.md           # executor (brings up one component idempotently)
│   ├── diagnosis.md       # fault classifier (failure -> class + remediation)
│   └── verifier.md        # independent goal-state check (separate from maker)
├── lib/
│   ├── verify-state.ts    # entry: read-only state probe (human- and agent-runnable)
│   ├── io.ts              # fetch / kubectl / state helpers
│   ├── constants.ts       # thresholds + signal tokens
│   ├── types.ts           # shared types
│   └── checks/            # chain · oracles · kapi · validators · observability
└── knowledge/
    ├── README.md          # what the knowledge base is + saga-eval format
    └── saga-eval.jsonl    # labeled incident corpus (classifier eval set)
```

## Roles

| Role     | Owns                                              | Cannot                          |
|----------|---------------------------------------------------|---------------------------------|
| director | goal graph, attempt budget, escalation policy     | touch infra / read raw logs     |
| maker    | idempotent bring-up of one component              | decide what to do on failure    |
| diagnosis| classify failure -> class + remediation + ETA     | execute human-gated remediations|
| verifier | independent goal-state verdict (via verify-state) | bring up or fix anything        |

## Cost model

Metric = **wall-clock time + determinism + human attention**. Gas is ~free on a
devnet (funded deployer), so it is dropped from the cost function entirely.

## Autonomy boundary

- **Autonomous:** pod restart, node-pair swap, moving-tag digest bump,
  branch re-checkout, image rebuild, single-**service** redeploy.
- **Human-gated (diagnosis recommends, does not execute):** **protocol**
  redeploy (`lido-core deploy` — orphans the whole downstream stand, hours),
  governance (omnibus / on-chain vote / role grant — irreversible, shared state).

## Run form / architecture

Target form is a **deterministic orchestrator** (control flow in code) with
**agent leaves** for judgment — not a model-driven main loop.

```
routine tick (scheduled trigger; survives laptop sleep / restart)
  └─ orchestrator = "code": goal graph, attempt budgets, timing waits, routing, escalation
       ├─ runs steps ── existing CLI in cli-pod:
       │                 stands ...-full · lido-core · csm/cmv2 · oracles-k8s ·
       │                 kapi-k8s · dashboard/grafana/logging · chain publish-digest-to-slack
       ├─ verify     ── lib/verify-state.ts  (via the verifier agent)
       └─ on failure ── diagnosis agent -> class -> retry-alternative / wait / escalate
```

- **"Code" is a supervisor layer ABOVE the existing CLI, not a deploy rewrite.**
  `stands ...-full` and friends are the happy-path **hands**: they run the deploy
  sequence and **die on failure**. The orchestrator is the **brain stem** — it
  adds verify / classify / retry / wait / escalate, i.e. the layer a human did by
  hand throughout the devnet-4/5/6 bring-ups.
- **Judgment lives only at the leaves** (`diagnosis`, `verifier`). Control flow
  is code, not model discretion — this is what enforces attempt budgets, prevents
  runaway 50-min redeploys, and honors timing waits.
- **Per-component granularity** (Core / CSM / CMv2 / KAPI / operators / VC / DSM /
  oracles / observability) so it can verify and recover **between** steps.
  `stands ...-full` is used for the parts that just work.
- **Driver = routine tick**, because a bring-up spans hours-to-days with long
  waits (overnight oracle convergence, CSM lookback ~2.5 h, besu backward-sync
  ~1 h). Waits happen **between** ticks, never inside a live `await`; progress
  persists (`state.json` + a progress file + `artifacts/`) across sleep/restart.
- **The `agents/*.md` main-loop is a throwaway prototype** — use it to validate
  the agent prompts and `verify-state.ts` under human supervision (stage 2
  below), then move the control flow into deterministic code.
- **Caveat:** a one-shot background Workflow is not a multi-hour daemon. A heavy
  step = drop the deploy into cli-pod/pod-tmux and **return**; wait until the
  next tick. A single phase (e.g. "bring up Core") may be one Workflow run, but
  the top-level driver is the state-accumulating routine.

Build order: `verify-state.ts` (wire RPC/kubectl) -> `diagnosis` (calibrate on
`saga-eval.jsonl`) -> main-loop prototype -> deterministic orchestrator + routine.

## How to run

### 0. Prerequisite — kube-API tunnel

Bring the tunnel up in a terminal (from the repo); nothing reaches the cluster
without it:

```
./bin/run.js ssh tunnel
```

Build/deploy commands run **inside cli-pod** (long steps in pod-tmux) so a
dropped tunnel or sleeping laptop cannot lose deploy progress — only this
project's own compile runs locally (`yarn build` + `cli-pod update`). Network
config lives in `workspaces/cli-pod/.env`, not the repo-root `.env`.

Before any protocol deploy the agent also reads the devnet spec (ask a human for
the current links) and collects inputs: deploy DSM? deploy DG? how many
validators? See `AGENTS.md`.

### 1. The probe (start here — real, safe, reusable)

Read-only. A human can run it too; the verifier agent shells out to it.

```
node --loader ts-node/esm tools/bringup-agent/lib/verify-state.ts --state <path/to/state.json> --net <net>
```

Prints a JSON snapshot of chain / oracles / KAPI / validators against the goal
predicates, and writes a timestamped snapshot under `artifacts/<net>/` so that
"steady for 2 frames" can be evaluated by comparing consecutive snapshots.

### 2. Interactive (validate while a human is present)

The `agents/*.md` files follow the Claude Code subagent format (frontmatter:
`name`, `description`, `tools`). To make them dispatchable via the Agent tool,
expose them to Claude Code (e.g. symlink into `.claude/agents/`). Then, from a
Claude Code session in this repo, drive `director`:

> bring up <devnet-name>

director loops: ask `verifier` which goals are unmet -> dispatch `maker` on the
next unmet goal -> on failure hand logs to `diagnosis` -> route by class
(auto-retry with an alternative strategy, or escalate). Do this at least once
with a human watching before trusting it unattended.

### 3. Unattended (vacation / coverage)

Runs on a coverage laptop that has the live access (kube-API tunnel, cli-pod,
SSH, Docker, repo clones) — the agents cannot reach the cluster without it.
Schedule a routine that fires `director` periodically (or once, self-pacing);
director checks goal-state, advances safe steps, and escalates to chat with a
self-contained brief when it hits a human-gated or unknown situation.

**Escalation output must be actionable by any on-call engineer**: self-contained,
concrete next step, no private addresses/paths/keys.
