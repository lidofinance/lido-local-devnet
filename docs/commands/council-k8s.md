`./bin/run.js council-k8s`
==========================

Build Council and push to Docker registry

* [`./bin/run.js council-k8s build`](#binrunjs-council-k8s-build)
* [`./bin/run.js council-k8s down`](#binrunjs-council-k8s-down)
* [`./bin/run.js council-k8s up`](#binrunjs-council-k8s-up)

## `./bin/run.js council-k8s build`

Build Council and push to Docker registry

```
USAGE
  $ ./bin/run.js council-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Council and push to Docker registry
```

## `./bin/run.js council-k8s down`

Stop Council(s) in K8s

```
USAGE
  $ ./bin/run.js council-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Council(s) was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Council(s) in K8s
```

## `./bin/run.js council-k8s up`

Start Council(s) in K8s

```
USAGE
  $ ./bin/run.js council-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Council(s) in K8s
```
