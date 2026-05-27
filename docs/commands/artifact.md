`./bin/run.js artifact`
=======================

Archive network artifacts excluding node_modules

* [`./bin/run.js artifact dump`](#binrunjs-artifact-dump)
* [`./bin/run.js artifact restore`](#binrunjs-artifact-restore)

## `./bin/run.js artifact dump`

Archive network artifacts excluding node_modules

```
USAGE
  $ ./bin/run.js artifact dump [--network <value>] [--output <value>]

FLAGS
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')
  --output=<value>   Output path for the archive (default: ./{network-name}.tar.gz)

DESCRIPTION
  Archive network artifacts excluding node_modules
```

## `./bin/run.js artifact restore`

Restore network artifacts from archive and install dependencies

```
USAGE
  $ ./bin/run.js artifact restore [--network <value>] [--archive <value>] [--skipInstall]

FLAGS
  --archive=<value>  Path to the archive file (default: ./{network-name}.tar.gz)
  --network=<value>  [default: main-with-easytrack] Name of the network (default: 'main-with-easytrack')
  --skipInstall      Skip installing dependencies

DESCRIPTION
  Restore network artifacts from archive and install dependencies
```
