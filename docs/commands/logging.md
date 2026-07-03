`./bin/run.js logging`
======================

Command set for managing centralized logging (Loki + Promtail).

* [`./bin/run.js logging down`](#binrunjs-logging-down)
* [`./bin/run.js logging up`](#binrunjs-logging-up)

## `./bin/run.js logging down`

Stop Logging in K8s with Helm

```
USAGE
  $ ./bin/run.js logging down [--network <value>] [--force]

FLAGS
  --force            Do not check that Logging was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Logging in K8s with Helm
```

## `./bin/run.js logging up`

Start Logging (Loki + Promtail) on K8s with Helm

```
USAGE
  $ ./bin/run.js logging up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Logging (Loki + Promtail) on K8s with Helm
```
