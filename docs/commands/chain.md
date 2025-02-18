`./bin/run.js chain`
====================

Command set for managing EL (Execution) and CL (Consensus) nodes.

* [`./bin/run.js chain artifacts`](#binrunjs-chain-artifacts)
* [`./bin/run.js chain down`](#binrunjs-chain-down)
* [`./bin/run.js chain fork`](#binrunjs-chain-fork)
* [`./bin/run.js chain info`](#binrunjs-chain-info)
* [`./bin/run.js chain up`](#binrunjs-chain-up)
* [`./bin/run.js chain update`](#binrunjs-chain-update)

## `./bin/run.js chain artifacts`

Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.

```
USAGE
  $ ./bin/run.js chain artifacts [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.
```

## `./bin/run.js chain down`

Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.

```
USAGE
  $ ./bin/run.js chain down [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.
```

## `./bin/run.js chain fork`

Start Anvil in fork mode connected to a specified Ethereum node

```
USAGE
  $ ./bin/run.js chain fork [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Start Anvil in fork mode connected to a specified Ethereum node
```

## `./bin/run.js chain info`

Retrieves and displays information about the Kurtosis enclave.

```
USAGE
  $ ./bin/run.js chain info [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Retrieves and displays information about the Kurtosis enclave.
```

## `./bin/run.js chain up`

Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.

```
USAGE
  $ ./bin/run.js chain up [--network <value>] [--preset <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   Kurtosis config name.

DESCRIPTION
  Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.
```

## `./bin/run.js chain update`

Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the local JSON database.

```
USAGE
  $ ./bin/run.js chain update [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the
  local JSON database.
```
