`./bin/run.js kubo-k8s`
=======================

Build Kubo (IPFS) and push to Docker registry

* [`./bin/run.js kubo-k8s build`](#binrunjs-kubo-k8s-build)
* [`./bin/run.js kubo-k8s down`](#binrunjs-kubo-k8s-down)
* [`./bin/run.js kubo-k8s up`](#binrunjs-kubo-k8s-up)

## `./bin/run.js kubo-k8s build`

Build Kubo (IPFS) and push to Docker registry

```
USAGE
  $ ./bin/run.js kubo-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Kubo (IPFS) and push to Docker registry
```

## `./bin/run.js kubo-k8s down`

Stop Kubo in K8s with Helm

```
USAGE
  $ ./bin/run.js kubo-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Kubo was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Kubo in K8s with Helm
```

## `./bin/run.js kubo-k8s up`

Start Kubo on K8s with Helm

```
USAGE
  $ ./bin/run.js kubo-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Kubo on K8s with Helm
```
