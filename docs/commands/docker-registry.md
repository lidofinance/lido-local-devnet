`./bin/run.js docker-registry`
==============================

Down Docker registry in k8s

* [`./bin/run.js docker-registry down`](#binrunjs-docker-registry-down)
* [`./bin/run.js docker-registry info`](#binrunjs-docker-registry-info)
* [`./bin/run.js docker-registry push-pull-secret-to-k8s`](#binrunjs-docker-registry-push-pull-secret-to-k8s)
* [`./bin/run.js docker-registry up`](#binrunjs-docker-registry-up)

## `./bin/run.js docker-registry down`

Down Docker registry in k8s

```
USAGE
  $ ./bin/run.js docker-registry down [--network <value>] [--force]

FLAGS
  --force            Do not check that the registry was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Down Docker registry in k8s
```

## `./bin/run.js docker-registry info`

Retrieves and displays information about the docker registry service.

```
USAGE
  $ ./bin/run.js docker-registry info [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Retrieves and displays information about the docker registry service.
```

## `./bin/run.js docker-registry push-pull-secret-to-k8s`

Push pull secret to k8s

```
USAGE
  $ ./bin/run.js docker-registry push-pull-secret-to-k8s [--network <value>] [--namespace <value>]

FLAGS
  --namespace=<value>  Namespace to use
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Push pull secret to k8s
```

## `./bin/run.js docker-registry up`

Start Docker registry in k8s

```
USAGE
  $ ./bin/run.js docker-registry up [--network <value>] [--force]

FLAGS
  --force            Do not check that the registry was already deployed
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Docker registry in k8s
```
