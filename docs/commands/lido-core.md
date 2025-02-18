`./bin/run.js lido-core`
========================

Command set for managing Lido-Core protocol, deploying smart contracts, and configuring the environment based on the current network state.

* [`./bin/run.js lido-core activate`](#binrunjs-lido-core-activate)
* [`./bin/run.js lido-core add-keys`](#binrunjs-lido-core-add-keys)
* [`./bin/run.js lido-core add-operator`](#binrunjs-lido-core-add-operator)
* [`./bin/run.js lido-core deploy`](#binrunjs-lido-core-deploy)
* [`./bin/run.js lido-core deploy-tw`](#binrunjs-lido-core-deploy-tw)
* [`./bin/run.js lido-core deposit`](#binrunjs-lido-core-deposit)
* [`./bin/run.js lido-core install`](#binrunjs-lido-core-install)
* [`./bin/run.js lido-core keys generate`](#binrunjs-lido-core-keys-generate)
* [`./bin/run.js lido-core keys use`](#binrunjs-lido-core-keys-use)
* [`./bin/run.js lido-core prepare-repository`](#binrunjs-lido-core-prepare-repository)
* [`./bin/run.js lido-core replace-dsm`](#binrunjs-lido-core-replace-dsm)
* [`./bin/run.js lido-core set-staking-limit`](#binrunjs-lido-core-set-staking-limit)
* [`./bin/run.js lido-core update-state`](#binrunjs-lido-core-update-state)
* [`./bin/run.js lido-core verify`](#binrunjs-lido-core-verify)

## `./bin/run.js lido-core activate`

Activates the lido-core protocol by deploying smart contracts and configuring the environment based on the current network state.

```
USAGE
  $ ./bin/run.js lido-core activate [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Activates the lido-core protocol by deploying smart contracts and configuring the environment based on the current
  network state.
```

## `./bin/run.js lido-core add-keys`

Adds validator keys for an existing node operator to the Lido protocol.

```
USAGE
  $ ./bin/run.js lido-core add-keys --id <value> --name <value> [--network <value>]

FLAGS
  --id=<value>       (required) Operator ID.
  --name=<value>     (required) Operator name.
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Adds validator keys for an existing node operator to the Lido protocol.
```

## `./bin/run.js lido-core add-operator`

Adds a new node operator to the Lido protocol.

```
USAGE
  $ ./bin/run.js lido-core add-operator --name <value> [--network <value>]

FLAGS
  --name=<value>     (required) Operator name.
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Adds a new node operator to the Lido protocol.
```

## `./bin/run.js lido-core deploy`

Deploys lido-core smart contracts using configured deployment scripts.

```
USAGE
  $ ./bin/run.js lido-core deploy --verify [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --verify           (required) Verify smart contracts

DESCRIPTION
  Deploys lido-core smart contracts using configured deployment scripts.
```

## `./bin/run.js lido-core deploy-tw`

Deploys lido-core smart contracts using configured deployment scripts.

```
USAGE
  $ ./bin/run.js lido-core deploy-tw [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Deploys lido-core smart contracts using configured deployment scripts.
```

## `./bin/run.js lido-core deposit`

Handles deposits to the Lido protocol.

```
USAGE
  $ ./bin/run.js lido-core deposit --id <value> [--network <value>] [--deposits <value>] [--dsm]

FLAGS
  --deposits=<value>  [default: 30] Number of deposits.
  --dsm               Use full DSM setup.
  --id=<value>        (required) Module ID.
  --network=<value>   [default: my-devnet] Name of the network

DESCRIPTION
  Handles deposits to the Lido protocol.
```

## `./bin/run.js lido-core install`

Install dependencies in the lido-core directory

```
USAGE
  $ ./bin/run.js lido-core install [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Install dependencies in the lido-core directory
```

## `./bin/run.js lido-core keys generate`

Create deposit keys for Lido validators in the DevNet configuration.

```
USAGE
  $ ./bin/run.js lido-core keys generate [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Create deposit keys for Lido validators in the DevNet configuration.
```

## `./bin/run.js lido-core keys use`

Finds previously unused validator keys and saves them under the specified name in the lido-cli service.

```
USAGE
  $ ./bin/run.js lido-core keys use --name <value> [--network <value>]

FLAGS
  --name=<value>     (required) The name under which the unused validator keys will be saved.
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Finds previously unused validator keys and saves them under the specified name in the lido-cli service.
```

## `./bin/run.js lido-core prepare-repository`

Prepare lido core repository.

```
USAGE
  $ ./bin/run.js lido-core prepare-repository [--network <value>] [--vesting <value>] [--voteDuration <value>]
    [--objectionPhaseDuration <value>]

FLAGS
  --network=<value>                 [default: my-devnet] Name of the network
  --objectionPhaseDuration=<value>  [default: 5] Objection phase duration
  --vesting=<value>                 [default: 820000000000000000000000] Vesting LDO amount
  --voteDuration=<value>            [default: 60] Voting duration

DESCRIPTION
  Prepare lido core repository.
```

## `./bin/run.js lido-core replace-dsm`

Replaces the DSM with an EOA.

```
USAGE
  $ ./bin/run.js lido-core replace-dsm [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Replaces the DSM with an EOA.
```

## `./bin/run.js lido-core set-staking-limit`

Increases the staking limit for a node operator in the Lido protocol.

```
USAGE
  $ ./bin/run.js lido-core set-staking-limit --limit <value> --operatorId <value> [--network <value>]

FLAGS
  --limit=<value>       (required) Staking limit.
  --network=<value>     [default: my-devnet] Name of the network
  --operatorId=<value>  (required) Operator ID.

DESCRIPTION
  Increases the staking limit for a node operator in the Lido protocol.
```

## `./bin/run.js lido-core update-state`

Reads the network state file for lido-core and updates the JSON database accordingly.

```
USAGE
  $ ./bin/run.js lido-core update-state [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Reads the network state file for lido-core and updates the JSON database accordingly.
```

## `./bin/run.js lido-core verify`

Verify deployed lido-core contracts

```
USAGE
  $ ./bin/run.js lido-core verify [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Verify deployed lido-core contracts
```
