`./bin/run.js validator`
========================

Command set for managing Validator, finding available keys in the state, adding them, and restarting it.

* [`./bin/run.js validator add`](#binrunjs-validator-add)
* [`./bin/run.js validator keys generate`](#binrunjs-validator-keys-generate)
* [`./bin/run.js validator keys test-generate`](#binrunjs-validator-keys-test-generate)
* [`./bin/run.js validator list`](#binrunjs-validator-list)
* [`./bin/run.js validator remove`](#binrunjs-validator-remove)
* [`./bin/run.js validator restart`](#binrunjs-validator-restart)
* [`./bin/run.js validator voluntary-exit`](#binrunjs-validator-voluntary-exit)

## `./bin/run.js validator add`

Finds available keys in the state, adds them to the validator, and restarts it.

```
USAGE
  $ ./bin/run.js validator add [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Finds available keys in the state, adds them to the validator, and restarts it.
```

## `./bin/run.js validator keys generate`

Create deposit keys for vanilla validators in the DevNet configuration.

```
USAGE
  $ ./bin/run.js validator keys generate [--network <value>] [--wc <value>] [--validators <value>]

FLAGS
  --network=<value>     [default: my-devnet] Name of the network
  --validators=<value>  [default: 30] Number of validator keys to generate.
  --wc=<value>          Custom withdrawal credentials (optional).

DESCRIPTION
  Create deposit keys for vanilla validators in the DevNet configuration.
```

## `./bin/run.js validator keys test-generate`

Install dependencies in the lido-core directory

```
USAGE
  $ ./bin/run.js validator keys test-generate [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Install dependencies in the lido-core directory
```

## `./bin/run.js validator list`

Lists all validator keystores in the system

```
USAGE
  $ ./bin/run.js validator list [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Lists all validator keystores in the system
```

## `./bin/run.js validator remove`

Removes a specified validator key from the validator and restarts it.

```
USAGE
  $ ./bin/run.js validator remove --key <value> [--network <value>]

FLAGS
  --key=<value>      (required) Key to remove
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Removes a specified validator key from the validator and restarts it.
```

## `./bin/run.js validator restart`

Restarts the Teku validator client.

```
USAGE
  $ ./bin/run.js validator restart [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Restarts the Teku validator client.
```

## `./bin/run.js validator voluntary-exit`

Performs voluntary exit of a validator from the Lido protocol.

```
USAGE
  $ ./bin/run.js validator voluntary-exit --mtype <value> --index <value> [--network <value>]

FLAGS
  --index=<value>    (required) Index of the validator to exit.
  --mtype=<value>    (required) Type of mnemonic to use.
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Performs voluntary exit of a validator from the Lido protocol.
```
