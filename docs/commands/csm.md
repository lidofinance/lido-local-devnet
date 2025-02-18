`./bin/run.js csm`
==================

Command set for managing CSM, deploying smart contracts, and configuring the environment based on the current network state.

* [`./bin/run.js csm activate`](#binrunjs-csm-activate)
* [`./bin/run.js csm add-operator`](#binrunjs-csm-add-operator)
* [`./bin/run.js csm add-verifier`](#binrunjs-csm-add-verifier)
* [`./bin/run.js csm deploy`](#binrunjs-csm-deploy)
* [`./bin/run.js csm install`](#binrunjs-csm-install)
* [`./bin/run.js csm update-state`](#binrunjs-csm-update-state)

## `./bin/run.js csm activate`

Activates the csm by deploying smart contracts and configuring the environment based on the current network state.

```
USAGE
  $ ./bin/run.js csm activate [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Activates the csm by deploying smart contracts and configuring the environment based on the current network state.
```

## `./bin/run.js csm add-operator`

Adds a new node operator to the CSM module along with validator keys.

```
USAGE
  $ ./bin/run.js csm add-operator --name <value> [--network <value>]

FLAGS
  --name=<value>     (required) Operator name.
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Adds a new node operator to the CSM module along with validator keys.
```

## `./bin/run.js csm add-verifier`

Deploys the CSVerifier smart contract using configured deployment scripts.

```
USAGE
  $ ./bin/run.js csm add-verifier [--network <value>] [--verify]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Verify the smart contract after deployment

DESCRIPTION
  Deploys the CSVerifier smart contract using configured deployment scripts.
```

## `./bin/run.js csm deploy`

Deploys CSM smart contracts using configured deployment scripts.

```
USAGE
  $ ./bin/run.js csm deploy [--network <value>] [--verify]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --verify           Verify smart contracts

DESCRIPTION
  Deploys CSM smart contracts using configured deployment scripts.
```

## `./bin/run.js csm install`

Install and build dependencies in the csm directory

```
USAGE
  $ ./bin/run.js csm install [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Install and build dependencies in the csm directory
```

## `./bin/run.js csm update-state`

Reads the network state file for csm and updates the JSON database accordingly.

```
USAGE
  $ ./bin/run.js csm update-state [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Reads the network state file for csm and updates the JSON database accordingly.
```
