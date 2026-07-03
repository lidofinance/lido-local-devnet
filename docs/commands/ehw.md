`./bin/run.js ehw`
==================

Command set for managing Ethereum Head Watcher in Kubernetes.

* [`./bin/run.js ehw build`](#binrunjs-ehw-build)
* [`./bin/run.js ehw down`](#binrunjs-ehw-down)
* [`./bin/run.js ehw up`](#binrunjs-ehw-up)

## `./bin/run.js ehw build`

Build Ethereum Head Watcher and push to Docker registry

```
USAGE
  $ ./bin/run.js ehw build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Ethereum Head Watcher and push to Docker registry
```

## `./bin/run.js ehw down`

Stop Ethereum Head Watcher in K8s with Helm

```
USAGE
  $ ./bin/run.js ehw down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Ethereum Head Watcher was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Ethereum Head Watcher in K8s with Helm
```

## `./bin/run.js ehw up`

Start Ethereum Head Watcher on K8s with Helm

```
USAGE
  $ ./bin/run.js ehw up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Ethereum Head Watcher on K8s with Helm
```
