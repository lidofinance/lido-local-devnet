`./bin/run.js dashboard`
========================

Command set for managing the DevNet Dashboard web UI.

* [`./bin/run.js dashboard build`](#binrunjs-dashboard-build)
* [`./bin/run.js dashboard down`](#binrunjs-dashboard-down)
* [`./bin/run.js dashboard up`](#binrunjs-dashboard-up)

## `./bin/run.js dashboard build`

Build Dashboard: collect data and push Docker image

```
USAGE
  $ ./bin/run.js dashboard build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Dashboard: collect data and push Docker image
```

## `./bin/run.js dashboard down`

Stop Dashboard in K8s with Helm

```
USAGE
  $ ./bin/run.js dashboard down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Dashboard was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Dashboard in K8s with Helm
```

## `./bin/run.js dashboard up`

Start Dashboard in K8s with Helm

```
USAGE
  $ ./bin/run.js dashboard up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Dashboard in K8s with Helm
```
