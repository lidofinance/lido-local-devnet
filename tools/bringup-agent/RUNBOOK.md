# Operator runbook — bring up a devnet with the agent fleet

For the on-call / covering engineer. This is **stage-2 (human-supervised)**: you
drive the `director` interactively and confirm the destructive / human-gated
steps. The autonomous (routine-driven) form is not wired yet — see the decision
doc. Read `AGENTS.md` first; the roles are `director` / `maker` / `diagnosis` /
`verifier` / `plumber` / `cleaner`.

## 0. Prerequisites (once)

- Repo cloned; `yarn install`; Docker running (for `cli-pod update`).
- `kubectl` with both cluster contexts in your kubeconfig.
- SSH access to the cluster host (the tunnel uses your key).
- ts-node available (repo dep) to run the probe.

## 1. Inputs — decide up front

- **Cluster:** valset-02 or valset-03? (sets SSH target, kube context, ingress domain)
- **Network:** which chain the nodes join — a known net (`holesky`/`hoodi`) or a
  custom devnet name (e.g. `glamsterdam-devnet-6`). Custom needs a network-config.
- Full bring-up only: deploy DSM? deploy DG? how many validators?

## 2. Drive the fleet (via Claude Code in the repo)

A fresh AI has NONE of any prior run's context — everything it needs is in this
directory (`tools/bringup-agent/`); it does not need session history or any
personal vault. Bootstrap it explicitly. In Claude Code opened in the repo:

> Read tools/bringup-agent/AGENTS.md, RUNBOOK.md and CLUSTERS.md. Act as the
> `director` (its behaviour is in agents/director.md; dispatch the other roles by
> reading agents/<role>.md). Goal: chain-healthy — a live EL/CL pair on <cluster>
> syncing <network>. Drive plumber → cleaner → maker → verifier per the runbook;
> confirm any destructive or human-gated step with me before doing it.

No special wiring is needed for this supervised mode — a single AI reading the
role files IS the fleet. The director then runs the loop: `plumber` (connection)
→ `cleaner` (clean slate) → `maker` (bring up) → `verifier` (goal check) →
`diagnosis` on any failure. You approve destructive / human-gated steps. The steps
below are exactly what it runs — you (or the AI) can also run them by hand.

## 3. Plumber — connection (prerequisite)

```
# select the cluster env (back up the current one first — it is reversible)
cp .env .env.valset-03            # if current .env is valset-03
cp .env.valset-02 .env            # apply the target cluster
kubectl config use-context <K8S_KUBECTL_DEFAULT_CONTEXT from that .env>
./bin/run.js ssh tunnel &         # keep it running; needs your SSH auth
kubectl cluster-info --request-timeout=5s   # must respond
```
Which context? **Match by tunnel port, not name** — the one whose server is
`127.0.0.1:<SSH_TUNNEL_LOCAL_PORT>` (see `CLUSTERS.md`: valset-02 = context
`tooling-holesky-sandbox-0` @ 16443, valset-03 = `valset-sandbox3-cluster` @ 16444).
If no context maps to your port, get the kubeconfig entry from the cluster admin
first — the tunnel does not create it.

If any command later says the kube-API is unreachable / connection refused → the
tunnel dropped → re-run `ssh tunnel` (it has no keep-alive yet). Only build/deploy
`in cli-pod` needs `workspaces/cli-pod/.env` + `cli-pod update`; local `chain
self-hosted-up` does not.

## 4. Cleaner — clear leftovers (confirm before deleting)

```
kubectl get ns                    # kt-* stands; which are stale?
kubectl get clusterrole,clusterrolebinding | grep promtail   # orphaned -> breaks `logging up`
```
Delete only what you confirm: `kubectl delete ns kt-<old-devnet> ...`. Watch for
orphaned cluster-scoped resources and stale PVCs from a previous devnet.

## 5. Maker — bring up a node pair

For a custom devnet, fetch its config from ethpandaops FIRST (into
`artifacts/<network>/network-config/`) — the stand name follows `--network`, not
`DEVNET_NAME`:
```
BASE=https://raw.githubusercontent.com/ethpandaops/glamsterdam-devnets/master/network-configs/devnet-6/metadata
DIR=artifacts/glamsterdam-devnet-6/network-config; mkdir -p "$DIR"
for f in genesis.json genesis.ssz config.yaml chainspec.json bootstrap_nodes.txt bootstrap_nodes.yaml enodes.txt deposit_contract.txt deposit_contract_block.txt; do
  curl -s -o "$DIR/$f" "$BASE/$f"; done   # genesis.ssz must be present locally too
```
Deploy the pair with the **fork-aware ethpandaops images** (the chart defaults are
stock and too old for glamsterdam):
```
./bin/run.js chain self-hosted-up \
  --network glamsterdam-devnet-6 \
  --checkpointSyncUrl https://checkpoint-sync.glamsterdam-devnet-6.ethpandaops.io \
  --genesisSSZUrl $BASE/genesis.ssz \
  --elImage ethpandaops/geth:glamsterdam-devnet-6 \
  --clImage ethpandaops/lighthouse:glamsterdam-devnet-6
# aux pair (don't touch a primary): add --suffix 2
```
**Do not trust the exit code** — `self-hosted-up` exits 0 even on failure. Read
the output and verify pods.

**Funding (for the PROTOCOL step later — not needed for a bare pair):** the
deploy and oracle ops pay gas from `wallets.yml` (deployer + named roles). Put it
at `artifacts/<net>/wallets.yml` from **1Password** (a copy also sits in the
cli-pod artifacts); genesis pre-funds the deployer (`0x11…`); then
`./bin/run.js wallet fund` distributes ~1000 ETH to each account. Never print or
commit `wallets.yml` — it holds private keys.

## 6. Verifier — goal-state

```
kubectl get pods -n kt-<network>            # EL/CL Running, then 1/1 when synced
node --loader ts-node/esm tools/bringup-agent/lib/verify-state.ts \
  --state artifacts/<network>/state.json --net <network>
```
Or read the dashboard (it shows the same, incl. oracle report slots) once up.

## 7. When it fails — diagnosis, and when to STOP

`diagnosis` classifies (see `diagnosis.md`, calibrated on `knowledge/saga-eval.jsonl`).
Rule out cheap autonomous causes first:
- **image-tag-drift** — pod `imageID` behind the current moving tag; `pullPolicy`
  is `IfNotPresent`, so a cached digest may be stale → `--elImage/--clImage` to the
  current tag, or set `Always` + rollout, or pin a digest.
- **wrong-branch** — a tool/service on a stale ref → re-checkout + rebuild.
- **stale PVC** — a client image swapped over a PVC init'd by another build (e.g.
  CL/EL disagree on the fork) → wipe the ns/PVC and redeploy clean.
- **converging-wait** — sync/checkpoint still inside its window → wait, don't act.
- **oracle-depth-insufficient** — before any PROTOCOL deploy, probe `nodes[]`
  (verify-state): the oracle EL must serve deep historical state AND `eth_getProof`
  at depth. A pruned pair can't collect a report → bring up an archive pair (besu
  FOREST / geth hash+archive via `--suffix`) and re-probe FIRST. Not relevant for a
  bare chain-healthy pair; it gates the step where oracles/Core come in.

**STOP and ask a human** (do NOT retry infra): `upstream-code-bug` /
`version-mismatch` (a code fault or oracle↔contract version skew — flag the owning
team), and `governance-gate` (roles/members/limits — needs an on-chain vote).
Escalate with the evidence (stack trace, mismatched selector/type), self-contained.

## 8. When done / handing back

Restore the previous cluster: `cp .env.valset-03 .env` + `kubectl config
use-context valset-sandbox3-cluster`. Leave or tear down the test stand as agreed.
