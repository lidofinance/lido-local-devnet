`./bin/run.js cli-pod`
======================

Remove CLI pod from the cluster

* [`./bin/run.js cli-pod down`](#binrunjs-cli-pod-down)
* [`./bin/run.js cli-pod logs`](#binrunjs-cli-pod-logs)
* [`./bin/run.js cli-pod shell`](#binrunjs-cli-pod-shell)
* [`./bin/run.js cli-pod status`](#binrunjs-cli-pod-status)
* [`./bin/run.js cli-pod up`](#binrunjs-cli-pod-up)
* [`./bin/run.js cli-pod update`](#binrunjs-cli-pod-update)
* [`./bin/run.js cli-pod verify`](#binrunjs-cli-pod-verify)

## `./bin/run.js cli-pod down`

Remove CLI pod from the cluster

```
USAGE
  $ ./bin/run.js cli-pod down [--network <value>] [--namespace <value>]

FLAGS
  --namespace=<value>  [default: core-devnets-sandbox] Kubernetes namespace for cli-pod
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Remove CLI pod from the cluster
```

## `./bin/run.js cli-pod logs`

Tail CLI pod logs

```
USAGE
  $ ./bin/run.js cli-pod logs [--network <value>] [--namespace <value>]

FLAGS
  --namespace=<value>  [default: core-devnets-sandbox] Kubernetes namespace for cli-pod
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Tail CLI pod logs
```

## `./bin/run.js cli-pod shell`

Open an interactive shell inside the CLI pod

```
USAGE
  $ ./bin/run.js cli-pod shell [--network <value>] [--namespace <value>]

FLAGS
  --namespace=<value>  [default: core-devnets-sandbox] Kubernetes namespace for cli-pod
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Open an interactive shell inside the CLI pod
```

## `./bin/run.js cli-pod status`

Show CLI pod status in the cluster

```
USAGE
  $ ./bin/run.js cli-pod status [--network <value>] [--namespace <value>]

FLAGS
  --namespace=<value>  [default: core-devnets-sandbox] Kubernetes namespace for cli-pod
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Show CLI pod status in the cluster
```

## `./bin/run.js cli-pod up`

Deploy CLI pod to the cluster (build + push + create secrets + deploy)

```
USAGE
  $ ./bin/run.js cli-pod up [--network <value>] [--githubToken <value>] [--namespace <value>]
    [--registryUsername <value>] [--registryPassword <value>]

FLAGS
  --githubToken=<value>       GitHub token (stored as k8s secret; optional for public repos)
  --namespace=<value>         [default: core-devnets-sandbox] Kubernetes namespace for cli-pod
  --network=<value>           [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')
  --registryPassword=<value>  Docker registry password
  --registryUsername=<value>  Docker registry username

DESCRIPTION
  Deploy CLI pod to the cluster (build + push + create secrets + deploy)
```

## `./bin/run.js cli-pod update`

Rebuild CLI pod image and restart the deployment (after CLI changes)

```
USAGE
  $ ./bin/run.js cli-pod update [--network <value>] [--namespace <value>]

FLAGS
  --namespace=<value>  [default: core-devnets-sandbox] Kubernetes namespace for cli-pod
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Rebuild CLI pod image and restart the deployment (after CLI changes)
```

## `./bin/run.js cli-pod verify`

Check that all tools work correctly inside the CLI pod

```
USAGE
  $ ./bin/run.js cli-pod verify [--network <value>] [--namespace <value>]

FLAGS
  --namespace=<value>  [default: core-devnets-sandbox] Kubernetes namespace for cli-pod
  --network=<value>    [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Check that all tools work correctly inside the CLI pod
```
