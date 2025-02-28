# `./bin/run.js stands`

A collection of ready-made environments for testing.

- [`./bin/run.js stands pectra`](#binrunjs-stands-pectra)
- [`./bin/run.js stands pectra-tw`](#binrunjs-stands-pectra-tw)
- [`./bin/run.js stands pectra-vaults`](#binrunjs-stands-pectra-vaults)

> [!NOTE]
> After adding new stand, you need to re-build the project.
>
> ```sh
> yarn build:all
> ```

## `./bin/run.js stands pectra`

Base Pectra test stand.

```
USAGE
  $ ./bin/run.js stands pectra [--network <value>] [--full] [--verify] [--dsm]

FLAGS
  --dsm              Use full DSM setup.
  --full             Deploys all smart contracts, not just initializes the network.
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Base Pectra test stand.
```

## `./bin/run.js stands pectra-tw`

Triggerable Withdrawals test stand.

```
USAGE
  $ ./bin/run.js stands pectra-tw [--network <value>] [--full] [--verify] [--dsm]

FLAGS
  --dsm              Use full DSM setup.
  --full             Deploys all smart contracts, not just initializes the network.
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Enables verification of smart contracts during deployment.

DESCRIPTION
  Triggerable Withdrawals test stand.
```
