`./bin/run.js mev-monitoring-k8s`
=================================

Build MEV Monitoring and push to Docker registry

* [`./bin/run.js mev-monitoring-k8s build`](#binrunjs-mev-monitoring-k8s-build)
* [`./bin/run.js mev-monitoring-k8s down`](#binrunjs-mev-monitoring-k8s-down)
* [`./bin/run.js mev-monitoring-k8s up`](#binrunjs-mev-monitoring-k8s-up)

## `./bin/run.js mev-monitoring-k8s build`

Build MEV Monitoring and push to Docker registry

```
USAGE
  $ ./bin/run.js mev-monitoring-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build MEV Monitoring and push to Docker registry
```

## `./bin/run.js mev-monitoring-k8s down`

Stop MEV Monitoring on K8s

```
USAGE
  $ ./bin/run.js mev-monitoring-k8s down [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop MEV Monitoring on K8s
```

## `./bin/run.js mev-monitoring-k8s up`

Start MEV Monitoring on K8s with Helm

```
USAGE
  $ ./bin/run.js mev-monitoring-k8s up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start MEV Monitoring on K8s with Helm
```
