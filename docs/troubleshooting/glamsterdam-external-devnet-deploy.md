# Deploying Lido on external Glamsterdam / ePBS devnets (EIP-7825 × EIP-8037)

Covers the self-hosted deploy of the Lido protocol onto a public ethpandaops
Glamsterdam devnet (`stands glamsterdam` → `wallet fund` → `stands glamsterdam-full`).
On a Glamsterdam-fork chain, code-deposit costs are raised (EIP-8037) and per-tx
execution gas is capped at 16M (EIP-7825), with the remainder of `tx.gas_limit`
above 16M funneled into the `state_reservoir` used to pay for code deposit.

There are **two gas footguns**. Apply **both** before the first
`stands glamsterdam-full` run — see "No incremental resume" below for why a
late failure is expensive.

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

Add `--gas-limit 50000000` (any value > 16M; 50M leaves `state_reservoir ≈ 34M`)
to the `forgeArgs` array in `0100-deploy-circuit-breaker.ts`, right after
`"--broadcast"`:

```ts
const forgeArgs = [
  "forge script script/Deploy.s.sol:Deploy",
  // ...
  "--broadcast",
  "--gas-limit 50000000",   // EIP-8037: forge under-estimates → state_reservoir=0 → code-deposit OOG
];
```

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
