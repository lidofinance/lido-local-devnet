`./bin/run.js service`
======================

Service-level helpers: install dependencies and rebuild a service end-to-end.

* [`./bin/run.js service install-deps`](#binrunjs-service-install-deps)
* [`./bin/run.js service rebuild`](#binrunjs-service-rebuild)

## `./bin/run.js service install-deps`

Install dependencies for a service using its configured package manager.
The actual command (`yarn`, `npm install`, `poetry install`, …) comes from the
service config in the repo.

```
USAGE
  $ ./bin/run.js service install-deps --service <option> [--network <value>]

FLAGS
  --network=<value>   [default: my-devnet] Name of the network
  --service=<option>  (required) Service name (e.g. oracle, kapi, csm)

DESCRIPTION
  Install dependencies for a service using its configured package manager.
```

## `./bin/run.js service rebuild`

Rebuild a service end-to-end: checkout the requested ref, install dependencies,
build the docker image, and redeploy. Used to roll a service to a new branch or
commit without manually chaining `git checkout`, `*:build`, `*:down`, `*:up`.

```
USAGE
  $ ./bin/run.js service rebuild --service <option> --ref <value>
    [--skipDeploy] [--network <value>]

FLAGS
  --network=<value>   [default: my-devnet] Name of the network
  --ref=<value>       (required) Git branch, tag, or commit hash
                      (also accepts `branch:commitHash`).
  --service=<option>  (required) Service name (e.g. oracle, kapi, csm).
  --skipDeploy        Skip build and deploy steps (only checkout + install deps).

DESCRIPTION
  Rebuild a service end-to-end: checkout branch, install deps, build image and
  redeploy.
```

### Behavior notes

- Under the hood this calls [`git checkout`](./git.md#binrunjs-git-checkout),
  so the same rules apply: existing local branches are fast-forwarded to
  `origin/<branch>` and **local commits in `artifacts/<network>/<service>`
  are discarded**. Treat that working copy as a deployable mirror of origin,
  not as a place for local development.
- After checkout the service config's `k8sTopic` drives `*:build`, `*:down`,
  `*:up`. If `k8sTopic` is not set for the service, build/up are skipped and
  only checkout + deps install runs.
- `oracle` is special-cased: the command routes through `oracle:build-multi`
  and `oracle:down --keepDb` so the performance DB survives the redeploy and
  all three role-specific images (accounting, ejector, csm) are rebuilt.
- `--skipDeploy` is handy when you only need to refresh sources and deps
  without touching k8s.
