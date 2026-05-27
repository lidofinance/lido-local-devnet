`./bin/run.js vroom-onchain-mon-k8s`
====================================

Command set for managing VROOM onchain monitoring bot in Kubernetes.

* [`./bin/run.js vroom-onchain-mon-k8s build`](#binrunjs-vroom-onchain-mon-k8s-build)
* [`./bin/run.js vroom-onchain-mon-k8s down`](#binrunjs-vroom-onchain-mon-k8s-down)
* [`./bin/run.js vroom-onchain-mon-k8s up`](#binrunjs-vroom-onchain-mon-k8s-up)

## `./bin/run.js vroom-onchain-mon-k8s build`

Build VROOM Onchain Monitoring Bot and push to Docker registry

```
USAGE
  $ ./bin/run.js vroom-onchain-mon-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build VROOM Onchain Monitoring Bot and push to Docker registry
```

## `./bin/run.js vroom-onchain-mon-k8s down`

Stop VROOM Onchain Monitoring Bot in K8s with Helm

```
USAGE
  $ ./bin/run.js vroom-onchain-mon-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the VROOM Onchain Monitoring Bot was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop VROOM Onchain Monitoring Bot in K8s with Helm
```

## `./bin/run.js vroom-onchain-mon-k8s up`

Start VROOM Onchain Monitoring Bot on K8s with Helm

```
USAGE
  $ ./bin/run.js vroom-onchain-mon-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start VROOM Onchain Monitoring Bot on K8s with Helm
```
