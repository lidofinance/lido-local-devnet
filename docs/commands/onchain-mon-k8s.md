`./bin/run.js onchain-mon-k8s`
==============================

Command set for managing onchain feeder/forwarder in Kubernetes.

* [`./bin/run.js onchain-mon-k8s build`](#binrunjs-onchain-mon-k8s-build)
* [`./bin/run.js onchain-mon-k8s down`](#binrunjs-onchain-mon-k8s-down)
* [`./bin/run.js onchain-mon-k8s up`](#binrunjs-onchain-mon-k8s-up)

## `./bin/run.js onchain-mon-k8s build`

Build Onchain Feeder/Forwarder and push to Docker registry

```
USAGE
  $ ./bin/run.js onchain-mon-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Onchain Feeder/Forwarder and push to Docker registry
```

## `./bin/run.js onchain-mon-k8s down`

Stop Onchain Feeder/Forwarder in K8s with Helm

```
USAGE
  $ ./bin/run.js onchain-mon-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Onchain Feeder/Forwarder was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Onchain Feeder/Forwarder in K8s with Helm
```

## `./bin/run.js onchain-mon-k8s up`

Start Onchain Feeder/Forwarder on K8s with Helm

```
USAGE
  $ ./bin/run.js onchain-mon-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Onchain Feeder/Forwarder on K8s with Helm
```
