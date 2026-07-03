# Clusters — env / tunnel / kube-context / ingress mapping

The names do NOT line up: the env-file label ("valset-02") ≠ the kube-context
name ("tooling-holesky-sandbox-0") ≠ the ingress domain ("valset-02.testnet.fi").
Do not match by name — **match by tunnel port**.

## Verified mapping (2026-07-03)

| env file            | SSH host        | tunnel local port | kube-context               | context server       | ingress domain          |
|---------------------|-----------------|-------------------|----------------------------|----------------------|-------------------------|
| `.env` (valset-03)  | 185.44.207.149  | 16444             | `valset-sandbox3-cluster`  | `127.0.0.1:16444`    | `*.valset-03.testnet.fi`|
| `.env.valset-02`    | 34.88.253.71    | 16443             | `tooling-holesky-sandbox-0`| `127.0.0.1:16443`    | `*.valset-02.testnet.fi`|

## The identity rule

A kube-context belongs to the cluster you tunnel to **iff its server port equals
the env's `SSH_TUNNEL_LOCAL_PORT`**:

```
kubectl config view -o json | ...   # context.server == https://127.0.0.1:<SSH_TUNNEL_LOCAL_PORT>
```

So "which context is valset-02?" → the one whose server is `127.0.0.1:16443`
(here `tooling-holesky-sandbox-0`), NOT one named "valset-02". A context named for
the env label may not exist at all — that is expected, not a blocker.

## Gotchas

- **The tunnel does NOT create the kube-context.** It only forwards the port. The
  context must already be in your kubeconfig. If the target context is missing,
  the `plumber` escalates: obtain the kubeconfig entry from the cluster admin /
  the valset setup — you cannot proceed without it.
- **A context only works while its matching tunnel is up** (server is
  `127.0.0.1:<port>`). Tunnel down → `connection refused` on that port → plumber.
- **`.env.valset-02` ships a stale `DEVNET_NAME` (glamsterdam-devnet-4)** — a
  leftover default. `chain self-hosted-up` names the stand/namespace by
  `--network`, so the stale value mostly does not matter, but do not trust it.
- The env-file value `K8S_KUBECTL_DEFAULT_CONTEXT` should equal the port-matched
  context. Verify it rather than assuming.
