`./bin/run.js no-widget`
========================

Build NO Widget and push to Docker registry

* [`./bin/run.js no-widget build`](#binrunjs-no-widget-build)
* [`./bin/run.js no-widget down`](#binrunjs-no-widget-down)
* [`./bin/run.js no-widget up`](#binrunjs-no-widget-up)

## `./bin/run.js no-widget build`

Build NO Widget and push to Docker registry

```
USAGE
  $ ./bin/run.js no-widget build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build NO Widget and push to Docker registry
```

## `./bin/run.js no-widget down`

Stop NO Widget in K8s with Helm

```
USAGE
  $ ./bin/run.js no-widget down [--network <value>] [--force]

FLAGS
  --force            Do not check that the NO Widget was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop NO Widget in K8s with Helm
```

## `./bin/run.js no-widget up`

Start NO Widget in K8s with Helm

```
USAGE
  $ ./bin/run.js no-widget up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start NO Widget in K8s with Helm
```
