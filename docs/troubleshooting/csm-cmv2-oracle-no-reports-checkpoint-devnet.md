# CSM / CMv2 oracle never reports on a checkpoint-synced devnet

## Symptom

- Dashboard "Oracle Members (CSM)" (and CMv2) shows every member `Last Reported Slot: never`; `CSFeeOracle.getLastProcessingRefSlot() == 0`.
- The `oracle-performance-collector` pod is in `CrashLoopBackOff`, looping on:
  `[ConsensusClient] ... eth/v2/debug/beacon/states/<old slot> [404] State not found`.
- The oracle daemons (`csm-*`, `cm-*`) are healthy: they reach `Calculate blockstamp for report` then stop at
  `check_report_range_availability: Performance data range for report is not available yet`.

AccountingOracle and VEBO are unaffected — they have their own HashConsensus, they report (so their demand floor is recent), and they are not coupled to the performance collector.

## Root cause

The performance collector's epoch demand `floor = consensus.initialEpoch − epochsPerFrame`. While the oracle has
never reported (`lastProcessingRefSlot == 0`) the floor stays pinned there. On a checkpoint-synced devnet with
backfill disabled, that floor is **before the checkpoint**, so the collector requests beacon states for
pre-checkpoint slots and gets `404` — the data does not exist anywhere on the network:

- checkpoint-synced nodes keep only ~`MIN_EPOCHS_FOR_DATA_COLUMN_SIDECARS_REQUESTS` epochs below their checkpoint and prune the rest;
- public ethpandaops beacon nodes also return `404` for old slots;
- an archive lighthouse (`--reconstruct-historic-states --genesis-backfill --disable-backfill-rate-limiting`)
  backfills only as deep as peers still serve (observed stall ~1 frame-set below the checkpoint) and never reaches genesis — there are no peers with the data.

So the collector can never fill the demand, `duties` stays empty, and the oracle never reports. Waiting makes it
worse: the floor is fixed while the available history window slides forward, widening the gap.

## Fix — set a reachable initialEpoch at setup (preferred)

When bringing up CSM / CMv2 on a checkpoint-synced devnet, set the oracle HashConsensus `initialEpoch` to an epoch
the node can actually reach (i.e. `>=` the checkpoint epoch) — do not leave an early default from the CSM deploy.
In the CMv2/CSM start omnibus the value passed to `updateInitialEpoch(...)` should be derived dynamically (the
current epoch at setup time, or the checkpoint epoch), not a hardcoded early epoch.

## Why it cannot be fixed in place afterwards

`HashConsensus.updateInitialEpoch` reverts with `InitialEpochAlreadyArrived` once `currentEpoch >= initialEpoch`,
so the epoch is locked the moment it arrives. `setFrameConfig` only changes frame length / fast-lane, not the
initial epoch. The only retrofit is heavy:

1. deploy a **fresh** `HashConsensus` (its constructor sets `initialEpoch = farFutureEpoch`, so
   `updateInitialEpoch(nearFutureEpoch)` succeeds on the new instance);
2. `oracle.setConsensusContract(newHashConsensus)` (`MANAGE_CONSENSUS_CONTRACT_ROLE`, passes because
   `lastProcessingRefSlot == 0`);
3. re-add members + quorum on the new consensus.

That is a contract deployment plus a multi-call governance bundle per oracle — cheaper to get `initialEpoch` right
at setup.
