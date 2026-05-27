`./bin/run.js kurtosis`
=======================

Undeploy Kurtosis K8s Ingress for Dora

* [`./bin/run.js kurtosis dora down`](#binrunjs-kurtosis-dora-down)
* [`./bin/run.js kurtosis dora info`](#binrunjs-kurtosis-dora-info)
* [`./bin/run.js kurtosis dora up`](#binrunjs-kurtosis-dora-up)
* [`./bin/run.js kurtosis download-artifacts`](#binrunjs-kurtosis-download-artifacts)
* [`./bin/run.js kurtosis get-cluster-info`](#binrunjs-kurtosis-get-cluster-info)
* [`./bin/run.js kurtosis nodes ingress-down`](#binrunjs-kurtosis-nodes-ingress-down)
* [`./bin/run.js kurtosis nodes ingress-up`](#binrunjs-kurtosis-nodes-ingress-up)
* [`./bin/run.js kurtosis restart-service`](#binrunjs-kurtosis-restart-service)
* [`./bin/run.js kurtosis run-package`](#binrunjs-kurtosis-run-package)
* [`./bin/run.js kurtosis stop-package`](#binrunjs-kurtosis-stop-package)

## `./bin/run.js kurtosis dora down`

Undeploy Kurtosis K8s Ingress for Dora

```
USAGE
  $ ./bin/run.js kurtosis dora down [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Undeploy Kurtosis K8s Ingress for Dora
```

## `./bin/run.js kurtosis dora info`

Retrieves and displays information about the Dora.

```
USAGE
  $ ./bin/run.js kurtosis dora info [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Retrieves and displays information about the Dora.
```

## `./bin/run.js kurtosis dora up`

Deploy Kurtosis K8s Ingress for Dora

```
USAGE
  $ ./bin/run.js kurtosis dora up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Deploy Kurtosis K8s Ingress for Dora
```

## `./bin/run.js kurtosis download-artifacts`

Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.

```
USAGE
  $ ./bin/run.js kurtosis download-artifacts [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.
```

## `./bin/run.js kurtosis get-cluster-info`

Get the Kurtosis cluster type

```
USAGE
  $ ./bin/run.js kurtosis get-cluster-info [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Get the Kurtosis cluster type
```

## `./bin/run.js kurtosis nodes ingress-down`

Un-Deploy Kurtosis K8s Ingress for EL, CL and VC

```
USAGE
  $ ./bin/run.js kurtosis nodes ingress-down [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Un-Deploy Kurtosis K8s Ingress for EL, CL and VC
```

## `./bin/run.js kurtosis nodes ingress-up`

Deploy Kurtosis K8s Ingress(es) for EL, CL and VC

```
USAGE
  $ ./bin/run.js kurtosis nodes ingress-up [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Deploy Kurtosis K8s Ingress(es) for EL, CL and VC
```

## `./bin/run.js kurtosis restart-service`

Update a specific service in kurtosis enclave

```
USAGE
  $ ./bin/run.js kurtosis restart-service [--network <value>] [--service <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')
  --service=<value>  Kurtosis Service

DESCRIPTION
  Update a specific service in kurtosis enclave
```

## `./bin/run.js kurtosis run-package`

Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.

```
USAGE
  $ ./bin/run.js kurtosis run-package [--network <value>] [--preset <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')
  --preset=<value>   [default: pectra-devnet4] Kurtosis config name.

DESCRIPTION
  Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.
```

## `./bin/run.js kurtosis stop-package`

Destroys the Kurtosis enclave

```
USAGE
  $ ./bin/run.js kurtosis stop-package [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Destroys the Kurtosis enclave
```
