`./bin/run.js k8s`
==================

Checks connectivity to the k8s cluster

* [`./bin/run.js k8s ping`](#binrunjs-k8s-ping)
* [`./bin/run.js k8s set-default-context`](#binrunjs-k8s-set-default-context)

## `./bin/run.js k8s ping`

Checks connectivity to the k8s cluster

```
USAGE
  $ ./bin/run.js k8s ping [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Checks connectivity to the k8s cluster
```

## `./bin/run.js k8s set-default-context`

Set k8s default cluster context

```
USAGE
  $ ./bin/run.js k8s set-default-context --context <value> [--network <value>]

FLAGS
  --context=<value>  (required) K8s context
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Set k8s default cluster context
```
