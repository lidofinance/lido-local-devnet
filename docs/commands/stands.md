`./bin/run.js stands`
=====================

A collection of ready-made environments for testing.

* [`./bin/run.js stands pectra`](#binrunjs-stands-pectra)
* [`./bin/run.js stands pectra-only-chain`](#binrunjs-stands-pectra-only-chain)
* [`./bin/run.js stands pectra-only-contracts`](#binrunjs-stands-pectra-only-contracts)
* [`./bin/run.js stands pectra-tw`](#binrunjs-stands-pectra-tw)
* [`./bin/run.js stands fusaka`](#binrunjs-stands-fusaka)
* [`./bin/run.js stands fusaka-zk-test`](#binrunjs-stands-fusaka-zk-test)
* [`./bin/run.js stands csm-v2`](#binrunjs-stands-csm-v2)
* [`./bin/run.js stands hoodi-self-hosted`](#binrunjs-stands-hoodi-self-hosted)
* [`./bin/run.js stands srv3-cmv2-devnet`](#binrunjs-stands-srv3-cmv2-devnet)

## `./bin/run.js stands pectra`

Base Pectra test stand.

```
USAGE
  $ ./bin/run.js stands pectra [--network <value>] [--verify] [--dsm] [--preset <value>]

FLAGS
  --dsm              Use full DSM setup.
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   [default: pectra-stable] Kurtosis preset name
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Base Pectra test stand.
```

## `./bin/run.js stands pectra-only-chain`

Sets up a Pectra blockchain environment without deploying contracts.

```
USAGE
  $ ./bin/run.js stands pectra-only-chain [--network <value>] [--preset <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   [default: pectra-stable] Kurtosis preset name

DESCRIPTION
  Sets up a Pectra blockchain environment without deploying contracts.
```

## `./bin/run.js stands pectra-only-contracts`

Pectra contracts only with protocol smart contracts.

```
USAGE
  $ ./bin/run.js stands pectra-only-contracts [--network <value>] [--verify] [--dsm] [--preset <value>]

FLAGS
  --dsm              Use full DSM setup.
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   [default: pectra-stable] Kurtosis preset name
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Pectra contracts only with protocol smart contracts.
```

## `./bin/run.js stands pectra-tw`

Triggerable Withdrawals test stand.

```
USAGE
  $ ./bin/run.js stands pectra-tw [--network <value>] [--verify] [--dsm] [--preset <value>]

FLAGS
  --dsm              Use full DSM setup.
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   [default: pectra-stable] Kurtosis preset name
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Triggerable Withdrawals test stand.
```

## `./bin/run.js stands fusaka`

Base Fusaka test stand.

```
USAGE
  $ ./bin/run.js stands fusaka [--network <value>] [--verify] [--dsm] [--preset <value>]

FLAGS
  --dsm              Use full DSM setup.
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   [default: fusaka-devnet2] Kurtosis preset name
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Base Fusaka test stand.
```

## `./bin/run.js stands fusaka-zk-test`

Fusaka ZK Test test stand.

```
USAGE
  $ ./bin/run.js stands fusaka-zk-test [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Fusaka ZK Test test stand.
```

## `./bin/run.js stands csm-v2`

CSM v2 on Pectra stand.

```
USAGE
  $ ./bin/run.js stands csm-v2 [--network <value>] [--full] [--verify] [--dsm]

FLAGS
  --dsm              Use full DSM setup.
  --full             Deploy full CSM v2 infrastructure.
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  CSM v2 on Pectra stand.
```

## `./bin/run.js stands hoodi-self-hosted`

Hoodi self-hosted stand: deploys EL/CL nodes and starts KAPI.

```
USAGE
  $ ./bin/run.js stands hoodi-self-hosted [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Deploys self-hosted geth + lighthouse nodes on the Hoodi testnet
  and starts KAPI. Uses the self-hosted node source mode.

  See config.hoodi.example.yml for a complete Hoodi configuration.
```

## `./bin/run.js stands srv3-cmv2-devnet`

Staking Router V3 with CMv2 Devnet1.

```
USAGE
  $ ./bin/run.js stands srv3-cmv2-devnet [--network <value>] [--verify] [--dsm] [--preset <value>] [--ehw]

FLAGS
  --dsm              Use full DSM setup.
  --ehw              Deploy Ethereum Head Watcher.
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   [default: srv3-devnet] Kurtosis preset name
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Staking Router V3 with CMv2 Devnet1.
```
