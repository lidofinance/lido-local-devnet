`./bin/run.js dsm-bots-k8s`
===========================

Build DSM Bot and push to Docker registry

* [`./bin/run.js dsm-bots-k8s build`](#binrunjs-dsm-bots-k8s-build)
* [`./bin/run.js dsm-bots-k8s down`](#binrunjs-dsm-bots-k8s-down)
* [`./bin/run.js dsm-bots-k8s up`](#binrunjs-dsm-bots-k8s-up)

## `./bin/run.js dsm-bots-k8s build`

Build DSM Bot and push to Docker registry

```
USAGE
  $ ./bin/run.js dsm-bots-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build DSM Bot and push to Docker registry
```

## `./bin/run.js dsm-bots-k8s down`

Stop DSM-bots

```
USAGE
  $ ./bin/run.js dsm-bots-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the DSM Bots were already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop DSM-bots
```

## `./bin/run.js dsm-bots-k8s up`

Start DSM bots in K8s

```
USAGE
  $ ./bin/run.js dsm-bots-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start DSM bots in K8s
```
