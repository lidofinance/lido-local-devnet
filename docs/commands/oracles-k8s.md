`./bin/run.js oracles-k8s`
==========================

Build Oracle and push to Docker registry

* [`./bin/run.js oracles-k8s build`](#binrunjs-oracles-k8s-build)
* [`./bin/run.js oracles-k8s build-multi`](#binrunjs-oracles-k8s-build-multi)
* [`./bin/run.js oracles-k8s down`](#binrunjs-oracles-k8s-down)
* [`./bin/run.js oracles-k8s up`](#binrunjs-oracles-k8s-up)

## `./bin/run.js oracles-k8s build`

Build Oracle and push to Docker registry

```
USAGE
  $ ./bin/run.js oracles-k8s build [--network <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build Oracle and push to Docker registry
```

## `./bin/run.js oracles-k8s build-multi`

Build and push oracle images from multiple branches

```
USAGE
  $ ./bin/run.js oracles-k8s build-multi [--network <value>] [--accountingBranch <value>] [--accountingTag <value>]
    [--ejectorBranch <value>] [--ejectorTag <value>] [--csmBranch <value>] [--csmTag <value>] [--image <value>]
    [--fetch] [--keepWorktrees]

FLAGS
  --accountingBranch=<value>  [default: feat/srv3-accounting] Branch for Accounting Oracle image
  --accountingTag=<value>     Tag for Accounting Oracle image
  --csmBranch=<value>         [default: feat/csm-cm-changes] Branch for CSM/CM/Performance Oracle image
  --csmTag=<value>            Tag for CSM/CM/Performance Oracle image
  --ejectorBranch=<value>     [default: feat/srv3-vebo-upgrade] Branch for Ejector (VEBO) Oracle image
  --ejectorTag=<value>        Tag for Ejector (VEBO) Oracle image
  --fetch                     Fetch latest refs before building
  --image=<value>             [default: lido/oracle] Oracle image name
  --keepWorktrees             Keep git worktrees after build
  --network=<value>           [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Build and push oracle images from multiple branches
```

## `./bin/run.js oracles-k8s down`

Stop Oracle(s) in K8s with Helm

```
USAGE
  $ ./bin/run.js oracles-k8s down [--network <value>] [--force] [--keepDb]

FLAGS
  --force            Do not check that the Oracles was already stopped
  --keepDb           Keep oracle-performance-db release, the namespace, and Kubo (preserves performance DB data across
                     redeploys)
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')

DESCRIPTION
  Stop Oracle(s) in K8s with Helm
```

## `./bin/run.js oracles-k8s up`

Start Oracle(s) in K8s with Helm

```
USAGE
  $ ./bin/run.js oracles-k8s up [--network <value>] [--image <value>] [--registryHostname <value>] [--tag <value>]
    [--accountingImage <value>] [--accountingTag <value>] [--csmImage <value>] [--csmTag <value>] [--consensusClientUris
    <value>] [--performanceConsensusClientUri <value>] [--ejectorImage <value>] [--ejectorTag <value>] [--build]
    [--releaseSuffix <value>]

FLAGS
  --accountingImage=<value>                Accounting oracle image name override
  --accountingTag=<value>                  Accounting oracle image tag override
  --build                                  Build oracle image from git repo instead of tag
  --consensusClientUris=<value>            Comma-separated consensus client URIs for oracles (round-robin)
  --csmImage=<value>                       CSM oracle image name override (csm/cm/performance)
  --csmTag=<value>                         CSM oracle image tag override (csm/cm/performance)
  --ejectorImage=<value>                   Ejector (VEBO) oracle image name override
  --ejectorTag=<value>                     Ejector (VEBO) oracle image tag override
  --image=<value>                          [default: lidofinance/oracle] Oracle image name
  --network=<value>                        [default: main-with-easytrack] Name of the network (default:
                                           'main-with-easytrack')
  --performanceConsensusClientUri=<value>  Consensus client URI override for performance-collector
  --registryHostname=<value>               Docker registry hostname override
  --releaseSuffix=<value>                  Suffix to append to helm release names (e.g. '-v8') for deploying parallel
                                           oracle sets. When set, performance-* and oracle-cm-* are skipped (they stay
                                           on the un-suffixed primary set).
  --tag=<value>                            [default: 6.0.1] Oracle image tag

DESCRIPTION
  Start Oracle(s) in K8s with Helm
```
