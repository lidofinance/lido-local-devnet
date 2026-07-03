`./bin/run.js kapi-k8s`
=======================

Build Keys API and push to Docker registry

* [`./bin/run.js kapi-k8s build`](#binrunjs-kapi-k8s-build)
* [`./bin/run.js kapi-k8s down`](#binrunjs-kapi-k8s-down)
* [`./bin/run.js kapi-k8s up`](#binrunjs-kapi-k8s-up)

## `./bin/run.js kapi-k8s build`

Build Keys API and push to Docker registry

```
USAGE
  $ ./bin/run.js kapi-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Keys API and push to Docker registry
```

## `./bin/run.js kapi-k8s down`

Stop Keys API in K8s with Helm

```
USAGE
  $ ./bin/run.js kapi-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Keys API was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Keys API in K8s with Helm
```

## `./bin/run.js kapi-k8s up`

Start Keys API on K8s with Helm

```
USAGE
  $ ./bin/run.js kapi-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Keys API on K8s with Helm
```
