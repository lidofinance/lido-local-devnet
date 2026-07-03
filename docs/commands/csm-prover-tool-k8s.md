`./bin/run.js csm-prover-tool-k8s`
==================================

Build CSM Prover Tool and push to Docker registry

* [`./bin/run.js csm-prover-tool-k8s build`](#binrunjs-csm-prover-tool-k8s-build)
* [`./bin/run.js csm-prover-tool-k8s down`](#binrunjs-csm-prover-tool-k8s-down)
* [`./bin/run.js csm-prover-tool-k8s down-cmv2`](#binrunjs-csm-prover-tool-k8s-down-cmv2)
* [`./bin/run.js csm-prover-tool-k8s up`](#binrunjs-csm-prover-tool-k8s-up)
* [`./bin/run.js csm-prover-tool-k8s up-cmv2`](#binrunjs-csm-prover-tool-k8s-up-cmv2)

## `./bin/run.js csm-prover-tool-k8s build`

Build CSM Prover Tool and push to Docker registry

```
USAGE
  $ ./bin/run.js csm-prover-tool-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build CSM Prover Tool and push to Docker registry
```

## `./bin/run.js csm-prover-tool-k8s down`

Stop CSM Prover Tool in K8s with Helm

```
USAGE
  $ ./bin/run.js csm-prover-tool-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the CSM Prover Tool was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop CSM Prover Tool in K8s with Helm
```

## `./bin/run.js csm-prover-tool-k8s down-cmv2`

Stop CMv2 Prover Tool in K8s with Helm

```
USAGE
  $ ./bin/run.js csm-prover-tool-k8s down-cmv2 [--network <value>] [--force]

FLAGS
  --force            Do not check that the CMv2 Prover Tool was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop CMv2 Prover Tool in K8s with Helm
```

## `./bin/run.js csm-prover-tool-k8s up`

Start CSM Prover Tool on K8s with Helm

```
USAGE
  $ ./bin/run.js csm-prover-tool-k8s up [--network <value>] [--clApiUrls <value>]

FLAGS
  --clApiUrls=<value>  Comma-separated CL API URLs override for prover-tool
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start CSM Prover Tool on K8s with Helm
```

## `./bin/run.js csm-prover-tool-k8s up-cmv2`

Start CMv2 Prover Tool on K8s with Helm

```
USAGE
  $ ./bin/run.js csm-prover-tool-k8s up-cmv2 [--network <value>] [--clApiUrls <value>]

FLAGS
  --clApiUrls=<value>  Comma-separated CL API URLs override for prover-tool
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start CMv2 Prover Tool on K8s with Helm
```
