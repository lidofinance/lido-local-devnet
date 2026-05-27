`./bin/run.js late-prover-bot-k8s`
==================================

Build Late Prover Bot and push to Docker registry

* [`./bin/run.js late-prover-bot-k8s build`](#binrunjs-late-prover-bot-k8s-build)
* [`./bin/run.js late-prover-bot-k8s down`](#binrunjs-late-prover-bot-k8s-down)
* [`./bin/run.js late-prover-bot-k8s up`](#binrunjs-late-prover-bot-k8s-up)

## `./bin/run.js late-prover-bot-k8s build`

Build Late Prover Bot and push to Docker registry

```
USAGE
  $ ./bin/run.js late-prover-bot-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Late Prover Bot and push to Docker registry
```

## `./bin/run.js late-prover-bot-k8s down`

Stop Late Prover Bot in K8s with Helm

```
USAGE
  $ ./bin/run.js late-prover-bot-k8s down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Late Prover Bot was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Late Prover Bot in K8s with Helm
```

## `./bin/run.js late-prover-bot-k8s up`

Start Late Prover Bot on K8s with Helm

```
USAGE
  $ ./bin/run.js late-prover-bot-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Late Prover Bot on K8s with Helm
```
