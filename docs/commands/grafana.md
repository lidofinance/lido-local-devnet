`./bin/run.js grafana`
======================

Command set for managing Grafana dashboards.

* [`./bin/run.js grafana down`](#binrunjs-grafana-down)
* [`./bin/run.js grafana info`](#binrunjs-grafana-info)
* [`./bin/run.js grafana up`](#binrunjs-grafana-up)
* [Access and Authentication](#access-and-authentication)

## `./bin/run.js grafana down`

Stop Grafana in K8s with Helm

```
USAGE
  $ ./bin/run.js grafana down [--network <value>] [--force]

FLAGS
  --force            Do not check that Grafana was already stopped
  --network=<value>  Name of the network

DESCRIPTION
  Stop Grafana in K8s with Helm
```

## `./bin/run.js grafana info`

Retrieves and displays information about Grafana.

```
USAGE
  $ ./bin/run.js grafana info [--network <value>]

FLAGS
  --network=<value>  Name of the network

DESCRIPTION
  Retrieves and displays information about Grafana.
```

## `./bin/run.js grafana up`

Start Grafana with dashboards on K8s

```
USAGE
  $ ./bin/run.js grafana up [--network <value>]

FLAGS
  --network=<value>  Name of the network

DESCRIPTION
  Start Grafana with dashboards on K8s
```

## Access and Authentication

Grafana is exposed through an ingress protected by HTTP Basic Auth.

The credentials are generated once on the first successful `grafana up` for a network and then reused on subsequent `grafana down` / `grafana up` cycles.

The plaintext username and password are stored locally in:

```text
artifacts/<network>/state.json
```

under:

```text
grafana.basicAuth.username
grafana.basicAuth.password
```

You can print the current credentials with:

```sh
./bin/run.js grafana info --network <network>
```

or read the password directly:

```sh
jq -r '.grafana.basicAuth.password' artifacts/<network>/state.json
```

In Kubernetes, the ingress uses the `grafana-basic-auth` Secret in the `kt-<network>-grafana` namespace. That Secret does not keep the plaintext password. It stores an `htpasswd`-style entry with a bcrypt hash.

The public `state.json` published by the dashboard is sanitized and does not include `grafana.basicAuth`.
