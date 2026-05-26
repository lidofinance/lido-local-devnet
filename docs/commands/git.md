`./bin/run.js git`
==================

Switch the Git branch in the specified service.

* [`./bin/run.js git checkout`](#binrunjs-git-checkout)
* [`./bin/run.js git pull`](#binrunjs-git-pull)

## `./bin/run.js git checkout`

Switching the Git branch in the specified service

```
USAGE
  $ ./bin/run.js git checkout --service
    blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots --ref <value>
    [--network <value>]

FLAGS
  --network=<value>   [default: my-devnet] Name of the network
  --ref=<value>       (required) Git branch name or branch:commitHash.
  --service=<option>  (required) Name of one of the existing services.
                      <options:
                      blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots>

DESCRIPTION
  Switching the Git branch in the specified service
```

### Behavior notes

`git checkout` mirrors the working copy under `artifacts/<network>/<service>` to
the latest state of the requested ref:

- runs `git fetch origin --prune`;
- if there are uncommitted changes — wipes them with `git reset --hard && git clean -fd`;
- checks out the branch and fast-forwards it to `origin/<branch>` via
  `git reset --hard origin/<branch>`. **Local commits in this clone are
  discarded** — the working copy is treated as a deployable mirror of origin,
  not a place for local development.
- if `--ref` is `branch:<commitHash>`, the branch is fast-forwarded first and
  then the working copy is detached at the given commit.

This means `git checkout` (and `service rebuild`, which calls it) always pulls
the latest commits from origin for an existing local branch — older versions of
the command did not do that and could silently rebuild against stale code.

## `./bin/run.js git pull`

Retrieve changes from a Git branch in a specified service.

```
USAGE
  $ ./bin/run.js git pull --service
    blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots --branch <value>
    [--network <value>]

FLAGS
  --branch=<value>    (required) Git branch name.
  --network=<value>   [default: my-devnet] Name of the network
  --service=<option>  (required) Name of one of the existing services.
                      <options:
                      blockscout|lidoCore|lidoCLI|kurtosis|csm|kapi|oracle|voting|assertoor|council|dataBus|dsmBots>

DESCRIPTION
  Retrieve changes from a Git branch in a specified service.
```
