`./bin/run.js git`
==================

Switch the Git branch in the specified service.

* [`./bin/run.js git checkout`](#binrunjs-git-checkout)
* [`./bin/run.js git pull`](#binrunjs-git-pull)

## `./bin/run.js git checkout`

Switching the Git branch in the specified service

```
USAGE
  $ ./bin/run.js git checkout --service
    blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots --ref <value>
    [--network <value>]

FLAGS
  --network=<value>   [default: my-devnet] Name of the network
  --ref=<value>       (required) Git branch name or branch:commitHash.
  --service=<option>  (required) Name of one of the existing services.
                      <options:
                      blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots>

DESCRIPTION
  Switching the Git branch in the specified service
```

## `./bin/run.js git pull`

Switching the Git branch in the specified service

```
USAGE
  $ ./bin/run.js git pull --service
    blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots --branch <value>
    [--network <value>]

FLAGS
  --branch=<value>    (required) Git branch name.
  --network=<value>   [default: my-devnet] Name of the network
  --service=<option>  (required) Name of one of the existing services.
                      <options:
                      blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots>

DESCRIPTION
  Switching the Git branch in the specified service
```
