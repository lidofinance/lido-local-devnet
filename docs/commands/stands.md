`./bin/run.js stands`
=====================

A collection of ready-made environments for testing.

* [`./bin/run.js stands pectra`](#binrunjs-stands-pectra)
* [`./bin/run.js stands pectra-only-contracts`](#binrunjs-stands-pectra-only-contracts)
* [`./bin/run.js stands pectra-tw`](#binrunjs-stands-pectra-tw)

## `./bin/run.js stands pectra`

Base Pectra test stand.

```
USAGE
  $ ./bin/run.js stands pectra [--network <value>] [--verify] [--dsm]

FLAGS
  --dsm              Use full DSM setup.
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Base Pectra test stand.
```

## `./bin/run.js stands pectra-only-contracts`

Pectra contracts only with protocol smart contracts.

```
USAGE
  $ ./bin/run.js stands pectra-only-contracts [--network <value>] [--verify] [--dsm]

FLAGS
  --dsm              Use full DSM setup.
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Pectra contracts only with protocol smart contracts.
```

## `./bin/run.js stands pectra-tw`

Triggerable Withdrawals test stand.

```
USAGE
  $ ./bin/run.js stands pectra-tw [--network <value>] [--verify] [--dsm]

FLAGS
  --dsm              Use full DSM setup.
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Triggerable Withdrawals test stand.
```
