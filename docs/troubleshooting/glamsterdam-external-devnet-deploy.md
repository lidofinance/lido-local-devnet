# Deploying Lido on external Glamsterdam / ePBS devnets (EIP-7825 × EIP-8037)

Covers the self-hosted deploy of the Lido protocol onto a public ethpandaops
Glamsterdam devnet (`stands glamsterdam` → `wallet fund` → `stands glamsterdam-full`).
On a Glamsterdam-fork chain, code-deposit costs are raised (EIP-8037) and per-tx
execution gas is capped at 16M (EIP-7825), with the remainder of `tx.gas_limit`
above 16M funneled into the `state_reservoir` used to pay for code deposit.

> **⚠️ KEY GOTCHA: the Core deploy does NOT resume from the last step.**
> Any failure during Core (e.g. the circuit-breaker step below) means the
> **entire** Core deploy re-runs from scratch on the next attempt (~50 min) —
> `0000-populate-deploy-artifact-from-env.ts` re-initializes the deploy artifact,
> so completed steps are NOT skipped. Therefore: **apply every known gas fix
> BEFORE the first `stands glamsterdam-full` run** so Core completes in one pass.
> See "No incremental resume" below.

There are **two gas footguns**. Apply **both** before the first
`stands glamsterdam-full` run.

## Footgun 1 — DAO factory (hardhat step, `0020-deploy-aragon-env.ts`)

The Aragon DAOFactory family needs `tx.gas_limit ≈ 50M`. This is already wired:
`stands glamsterdam-full` passes `gasLimit: "50000000"` to `DeployLidoContracts`,
which flows into the hardhat deploy as `GAS_LIMIT`.

**EL client must be `nethermind`.** `ethrex` and older `geth` builds wrongly
reject `tx.gas_limit > 2^24` at mempool validation, so the 50M deploy tx never
lands. nethermind implements the EIP-7825/8037 split correctly. Full analysis:
`artifacts/glamsterdam-devnet-4/FINDING-EIP7825-dao-factory.md`.

```
stands glamsterdam --devnet devnet-N \
  --elClient nethermind --elImage ethpandaops/nethermind:glamsterdam-devnet-N \
  --clClient prysm     --clImage ethpandaops/prysm-beacon-chain:glamsterdam-devnet-N \
  --checkpointSyncUrl https://checkpoint-sync.glamsterdam-devnet-N.ethpandaops.io \
  --genesisSSZUrl .../network-configs/devnet-N/metadata/genesis.ssz
```

> nethermind needs `chainspec.json` mounted at `/network-config/chainspec.json`.
> `chain fetch-network-config` downloads it (it is in `METADATA_FILES`); it is
> small enough to ride in the network-config ConfigMap.

## Footgun 2 — circuit-breaker (forge step, `0100-deploy-circuit-breaker.ts`)

### Symptom

`dao-deploy.sh` fails at `0100-deploy-circuit-breaker.ts`. The CircuitBreaker
contract itself deploys, but a following contract-creation tx in the same forge
script fails:

```
CircuitBreaker deployed at: 0xf954b3...
Error: Transaction Failure: 0x...
🚨 Migration failed: forge script script/Deploy.s.sol:Deploy ... --broadcast
```

The failing tx is a `CREATE` with `status 0`, e.g. `gasUsed 1,046,970` against
`gas_limit 1,426,410` — OOG on code deposit.

### Root cause

`0100-deploy-circuit-breaker.ts` builds its own `forgeArgs` and runs
`forge script ... --broadcast` **without a gas limit**. forge auto-estimates
`gas_limit ≈ 1.4M`, which is below the 16M EIP-7825 execution cap, so
`state_reservoir = gas_limit − 16M = 0` → no gas left for code deposit → the
`CREATE` OOGs. The stand's `GAS_LIMIT=50M` only reaches the hardhat steps, not
this forge invocation.

### Fix

Add `--gas-estimate-multiplier 5000` to the `forgeArgs` array in
`0100-deploy-circuit-breaker.ts`, right after `"--broadcast"`:

```ts
const forgeArgs = [
  "forge script script/Deploy.s.sol:Deploy",
  // ...
  "--broadcast",
  "--gas-estimate-multiplier 5000",  // ×50: forge under-estimates → tx.gas ~54M > 16M → state_reservoir covers code deposit
];
```

> **`--gas-limit <N>` does NOT work here** (verified on forge 1.7.1): `forge script`
> ignores it for the broadcast tx and still uses `estimate × multiplier`
> (`isFixedGasLimit=false`). The only lever for broadcast-tx gas is
> `--gas-estimate-multiplier`. circuit-breaker has a single small contract, so a
> blanket ×50 works. For a multi-contract deploy with a wide size range (CSM),
> a single multiplier can't work — see next section.

This step lives in **lidoCore** (cloned at deploy time), not in this repo. The
stand's `GitCheckout { service: "lidoCore", ref: "develop" }` does
`git reset --hard`, so a patch to the in-pod clone is wiped on the next stand
run. For a persistent fix, fork lidoCore and point the stand's `lidoCore` ref at
the fork; otherwise patch the in-pod clone and resume with `lido-core deploy`
directly (not the stand).

## No incremental resume — a late failure costs a full ~50-min Core redeploy

Re-running `lido-core deploy` (or `stands glamsterdam-full`) does **not** resume
from the failed step. `dao-deploy.sh` always starts at
`0000-populate-deploy-artifact-from-env.ts`, which re-initializes the deploy
artifact, so the whole Core deploy (DAO factory, APM, DAO, core contracts, …)
runs again from scratch (~50 min) and emits fresh contract addresses.

> This contradicts the "State preservation across retries" note in the README,
> which claims steps skip when `deployed-local-devnet.json` is already
> populated. Observed behavior on the `lido-core deploy` path (2026-06,
> glamsterdam-devnet-5) was a full redeploy. Verify before relying on resume.

Consequences:
- Apply **both** gas fixes above **before** the first `stands glamsterdam-full`
  so Core completes in one pass.
- On a public devnet the deployer ETH allocation must cover a full redeploy.
  (glamsterdam-devnet-5 funded the deployer with 100k ETH at genesis, so retries
  were cheap — do not assume this on every devnet; see README caveats.)
- Once Core is fully deployed, `DeployLidoContracts` short-circuits on
  `isLidoDeployed()`, so re-running `stands glamsterdam-full` skips Core and
  continues with CSM / CMv2 / activations / operators / KAPI (~15 min). That is
  the cheap way to finish the stand after fixing Core out-of-band.

## Recommended one-pass procedure

1. Pre-patch lidoCore `0100-deploy-circuit-breaker.ts` (forge `--gas-limit 50000000`),
   persistently (fork + stand ref) if you will re-run the stand.
2. `cli-pod update` (bakes repo + `workspaces/cli-pod/.env` into the image).
3. `stands glamsterdam --devnet devnet-N --elClient nethermind ... --clClient prysm ...`,
   wait for EL + CL sync.
4. `wallet fund` (seeds role accounts from the genesis-funded deployer).
5. `stands glamsterdam-full [--dsm]` — Core (50M everywhere) + CSM + CMv2 +
   activations + operators + KAPI in a single pass.

## CSM (multi-contract forge deploy) — single multiplier can't work; use fixed-gas replay

CSM (`community-staking-module`, `just deploy-csm-live-no-confirm` →
`forge script script/csm/DeployLocalDevNet.s.sol --broadcast -g 200 --legacy`)
deploys ~135 txs (31 CREATE + 104 CALL) in one `vm.startBroadcast()`. Every CREATE
needs `gas_limit > 16M` (EIP-8037 reservoir). But `forge script` only scales gas
by a single `-g` / `--gas-estimate-multiplier`, and the contracts span a wide
estimate range (small libs ~0.4M … CSModule). No single multiplier fits:

- small libs need ≈ ×46 to clear 16M;
- the biggest CREATE × that multiplier blows past the 150M block gas limit.

Symptoms seen: with `-g 200`, forge fires txs without verifying receipts — small
CREATEs silently revert (status 0, reservoir 0) and it later dies with a
misleading `intrinsic gas too low` on a send. Adding `--slow` (forge waits for
each receipt) surfaces the real first failure: `AssetRecovererLib` CREATE,
status 0. Raising `-g` to ×10 makes the big CREATE exceed the block limit → forge
stalls retrying.

(Note: `--legacy` is tx type, not gas limit — irrelevant here.
`FOUNDRY_BLOCK_GAS_LIMIT=1e9` is the simulation block gas, not the broadcast tx gas.)

### Workaround — fixed-gas replay (`tools/replay-forge-plan-fixedgas.cjs`)

forge can't set a per-tx gas floor, so we let forge build the **plan** and send the
txs ourselves with a fixed/floored gas. Works for any forge-script deploy that hits
this wall.

```sh
# In the CSM repo dir, with the deploy env set (RPC_URL, DEPLOYER_PRIVATE_KEY,
# CSM_* addresses, FOUNDRY_PROFILE=deploy, ARTIFACTS_DIR — the same env the
# `csm deploy` command logs via logJson):

# 1. Dry-run forge (NO --broadcast) WITH --sender <deployer> so CREATE addresses
#    are computed for the real deployer at its real nonce (else forge uses its
#    default sender 0x1804…@nonce0 and the plan's baked addresses won't match).
forge script script/csm/DeployLocalDevNet.s.sol:DeployLocalDevNet \
  --sig="run(string)" --force --rpc-url "$RPC_URL" --sender "$DEPLOYER_ADDR" \
  -- $(git rev-parse HEAD)
#    → writes broadcast/DeployLocalDevNet.s.sol/<chainid>/dry-run/run-latest.json

# 2. Replay each tx with fixed gas (floor 50M, cap 145M), sequential, status-checked.
#    Run from a dir whose node_modules has ethers v6 (e.g. the cli-pod /app).
RPC_URL="$RPC_URL" DEPLOYER_PRIVATE_KEY="$PK" \
  node tools/replay-forge-plan-fixedgas.cjs \
  <path>/dry-run/run-latest.json 50000000 145000000
```

`gas_limit = clamp(planGas, 50M, 145M)` → every CREATE gets ≥50M (16M exec cap +
34M reservoir for code deposit), and nothing exceeds the 150M block. Replay is
sequential (one tx per block, ~20-30 min for 135 txs). Constraint: do not let any
other tx use the deployer between the dry-run and the replay, or the CREATE
addresses (`addr(deployer, nonce)`) shift and baked args mismatch.

Verified on glamsterdam-devnet-5: `AssetRecovererLib` (which reverts in the normal
forge deploy) deploys `status=1` under the replay. Proper long-term fix belongs in
the CSM deploy script (per-contract gas / size-grouped forge runs) — file with the
CSM team.
