`./bin/run.js evm`
==================

Build Ethereum Validators Monitoring and push to Docker registry

* [`./bin/run.js evm build`](#binrunjs-evm-build)
* [`./bin/run.js evm down`](#binrunjs-evm-down)
* [`./bin/run.js evm up`](#binrunjs-evm-up)

## `./bin/run.js evm build`

Build Ethereum Validators Monitoring and push to Docker registry

```
USAGE
  $ ./bin/run.js evm build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Ethereum Validators Monitoring and push to Docker registry
```

## `./bin/run.js evm down`

Stop Ethereum Validators Monitoring in K8s with Helm

```
USAGE
  $ ./bin/run.js evm down [--network <value>] [--force]

FLAGS
  --force            Do not check that the Ethereum Validators Monitoring was already stopped
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Ethereum Validators Monitoring in K8s with Helm
```

## `./bin/run.js evm up`

Start Ethereum Validators Monitoring on K8s with Helm

```
USAGE
  $ ./bin/run.js evm up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Start Ethereum Validators Monitoring on K8s with Helm
```
