`./bin/run.js no-widget-backend`
================================

Build NO Widget Backend and push to Docker registry

* [`./bin/run.js no-widget-backend build`](#binrunjs-no-widget-backend-build)
* [`./bin/run.js no-widget-backend down`](#binrunjs-no-widget-backend-down)
* [`./bin/run.js no-widget-backend up`](#binrunjs-no-widget-backend-up)

## `./bin/run.js no-widget-backend build`

Build NO Widget Backend and push to Docker registry

```
USAGE
  $ ./bin/run.js no-widget-backend build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build NO Widget Backend and push to Docker registry
```

## `./bin/run.js no-widget-backend down`

Stop NO Widget Backend in K8s with Helm

```
USAGE
  $ ./bin/run.js no-widget-backend down [--network <value>] [--force]

FLAGS
  --force            Do not check that the NO Widget Backend was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop NO Widget Backend in K8s with Helm
```

## `./bin/run.js no-widget-backend up`

Start NO Widget Backend in K8s with Helm

```
USAGE
  $ ./bin/run.js no-widget-backend up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start NO Widget Backend in K8s with Helm
```
