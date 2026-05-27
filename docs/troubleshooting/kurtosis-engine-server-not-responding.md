# Kurtosis CLI: `CONTAINER_RUNNING_BUT_SERVER_NOT_RESPONDING`

## Symptom

Any `kurtosis` command in cli-pod (or any environment using
`kubernetes`-type cluster) fails with:

```
Error:  An error occurred running the pre-validation-and-run function
  Caused by: An error occurred creating a new Kurtosis engine client
  Caused by: An error occurred starting the engine with the engine existence guarantor
  Caused by: An error occurred guaranteeing that a Kurtosis engine is running
  Caused by: We couldn't guarantee that a Kurtosis engine is running because we
  found a running engine container whose server isn't responding; because this
  is a strange state, we don't automatically try to correct the problem so
  you'll want to manually restart the server by running 'kurtosis engine restart'
```

Engine pod is healthy:

- `kubectl -n kurtosis-engine-* get pod` → `Running 1/1`
- `ss -tln` inside engine pod → port `9710` (gRPC) is `LISTEN`
- direct gRPC POST to engine via pod IP or service ClusterIP from cli-pod
  → returns gRPC trailers immediately

`kurtosis engine restart` reports success but doesn't fix the symptom.
Restarting in a loop, clearing stale ClusterRoles, recreating engine
namespace, downgrading CLI from 1.15.2 to 1.12.1, switching k8s
cluster — all keep producing the same error.

## Root cause

`kurtosis` CLI **always dials `127.0.0.1:9710`** for the engine and does
NOT do its own port-forward to the engine pod in Kubernetes mode.
From the CLI source
([`engine_manager.go`][engine-manager],
[`host_machine_ip_and_port.go`][host-port]):

```go
// TODO Replace this hacky method of defaulting to localhost:DefaultGrpcPort
// to get connected to the engine
runningEngineIpAndPort := getDefaultKurtosisEngineLocalhostMachineIpAndPort()
```

```go
const localHostIpStr = "127.0.0.1"
```

For **docker** clusters this works because `kurtosis engine start` runs
the engine container with port 9710 mapped to host. For **kubernetes**
clusters there is no such mapping — the CLI relies on something else to
bind `127.0.0.1:9710` to the engine pod.

That "something else" is `kurtosis gateway`. The CLI does NOT start it
implicitly; you have to start it manually (or via the lido-local-devnet
`startKurtosisGateway` extension helper) before any other kurtosis
command. This is true even when the CLI is running inside the cluster.

The `kurtosis engine status` output gives a confusing hint:

```
If you are running Kurtosis in a Kubernetes cluster, and attempting to
access Kurtosis from outside the cluster, consider running `kurtosis
gateway` to open up a local gateway Kurtosis in Kubernetes
```

The "outside the cluster" qualification is misleading — the gateway is
needed **also from inside the cluster** because of the hardcoded
`localhost:9710` lookup.

## Fix

- Make sure `kurtosis gateway` is running in the same process tree
  before any `kurtosis enclave …` / `kurtosis run …` command.
- In lido-local-devnet, `src/commands/kurtosis/extensions/kurtosis.extension.ts`
  exports `startKurtosisGateway(dre)`. It must NOT be skipped for
  in-cluster execution. Earlier versions of the file had an
  `isInCluster()` guard that skipped the gateway; that guard was
  incorrect (the gateway is needed regardless) and has been removed.
- Manual recovery: `nohup kurtosis gateway > /tmp/kgw.log 2>&1 &` inside
  cli-pod before retrying `kurtosis enclave ls`.

## Diagnostics

Quick check that engine itself is reachable (run from cli-pod):

```bash
ENG_NS=$(kubectl get ns | awk '/kurtosis-engine-/{print $1; exit}')
ENG_IP=$(kubectl -n "$ENG_NS" get pod -o jsonpath='{.items[0].status.podIP}')
curl -sv -X POST --http2-prior-knowledge \
  -H 'content-type: application/grpc' \
  "http://$ENG_IP:9710/engine_api.EngineService/GetEngineInfo" 2>&1 | tail -8
```

Expected: `HTTP/2 200`, `content-type: application/grpc`, `grpc-status: 2`
(EOF — request body is empty, but server is alive). If this works but
`kurtosis enclave ls` doesn't — the gateway is missing.

## References

- Investigation log: 2026-05-26 / 2026-05-27 attempts to spin up
  `dg-smoke-1` smoke devnet via cli-pod (~3h debug to land on this).
- Upstream `TODO` in
  [`engine_manager.go`][engine-manager] tracks the localhost
  hardcode — fix at the kurtosis-tech side would let us drop the
  gateway requirement entirely.

[engine-manager]: https://github.com/kurtosis-tech/kurtosis/blob/main/cli/cli/helpers/engine_manager/engine_manager.go
[host-port]: https://github.com/kurtosis-tech/kurtosis/blob/main/cli/cli/helpers/engine_manager/host_machine_ip_and_port.go
