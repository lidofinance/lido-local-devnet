# Devnet Management Guide

Quick reference for creating, destroying, and configuring devnets.

## Devnet Lifecycle

### Create

```bash
./bin/run.js stands <stand_name> [--dsm] [--verify] [--ehw] 2>&1 | tee deploy-<name>.log
```

| Flag       | Description                                              |
|------------|----------------------------------------------------------|
| `--dsm`    | Full DSM setup (data-bus, council, depositor/pause/unvetter bots) |
| `--verify` | Verify contracts in blockscout                           |
| `--ehw`    | Run Ethereum Head Watcher                                |

### Destroy

```bash
# Option 1: Via CLI (set .env DEVNET_NAME first)
./bin/run.js down --force

# Option 2: Manual (if CLI fails, e.g. on repo clone errors during DRE init)
kurtosis engine restart         # if engine is stuck
kurtosis gateway &              # if running in k8s
kurtosis enclave rm -f <devnet-name>
kubectl get ns | grep "kt-<devnet-name>"
kubectl delete ns <ns1> <ns2> ...
```

> **Note:** After manual destroy, check for stale ClusterRole/ClusterRoleBinding resources
> (e.g. `promtail-promtail`) that are cluster-scoped and won't be deleted with the namespace.

## Configuration

### Key files

| File | Purpose |
|------|---------|
| `.env` | `DEVNET_NAME`, cluster config, ingress hostnames, docker registry creds |
| `.env.sample` | Template with all available variables |
| `src/commands/stands/*.ts` | Stand definitions (deployment scenarios) |
| `artifacts/<devnet-name>/` | Cloned repos, `state.json`, generated keys |

### Branch configuration

Branches are configured in **three places** (in order of priority):

1. **Stand file** (`src/commands/stands/*.ts`) — via `GitCheckout` calls before service Up commands. **This is the preferred place** for per-deployment branch overrides.
2. **Build files** (`src/commands/<service>-k8s/build.ts`) — some services (dsm-bots, council) have hardcoded `GitCheckout` refs that **override the stand checkout during build**.
3. **Service configs** (`packages/services/src/embedded/*.ts`) — default branch for initial repo clone only.

> **Important:** If you change a branch in the stand, also update the corresponding `build.ts` hardcoded ref (if one exists), otherwise the build will override the stand's checkout.

### Adding a new env var to a service

1. Add to the env dict in `src/commands/<service>-k8s/up.ts`
2. Add `--set lido-app.env.variables.VAR_NAME="${VAR_NAME}"` to `workspaces/<service>/Makefile` (in `HELM_CHART_VALUES_OVERRIDES`)
3. Add default `VAR_NAME ?=` in Makefile variables section
4. If the service needs state from another service, add the extension to the `extensions` array (e.g., `kapiK8sExtension`)

## Deployment Order (srv3-cmv2-devnet stand)

```
1. Chain (kurtosis)
2. Lido Core contracts
3. CSM contracts
4. CMv2 contracts
5. LidoCLI install
6. Activate protocol + modules (Lido Core, CSM, CMv2)
7. Replace DSM with EOA (if --dsm is false)
8. Add operators + keys (NOR, CSM, CMv2)
9. KAPI (keys-api)
10. EHW (optional, --ehw)
11. Oracles (build multi + deploy)
12. DSM block (if --dsm):
    a. Data-bus deploy
    b. Council daemon
    c. DSM bots (depositor, pauser, unvetter)
13. Chain info
```

> **Idempotency warning:** Steps are NOT guaranteed to be idempotent. If the stand fails after core contracts are deployed, do NOT restart the full stand. Instead, run only the failed/remaining commands individually.

## Service Reference

### KAPI (keys-api)

| Item | Location |
|------|----------|
| Up command | `src/commands/kapi-k8s/up.ts` |
| Build | `src/commands/kapi-k8s/build.ts` (no hardcoded GitCheckout) |
| Helm values | `helm/lido/lido-kapi/values.yaml` |
| Makefile | `workspaces/kapi/Makefile` |

Key env vars (set from state in `up.ts`):
- `LIDO_LOCATOR_DEVNET_ADDRESS` — `state.getLido().locator`
- `CURATED_MODULE_DEVNET_ADDRESS`, `CSM_MODULE_DEVNET_ADDRESS`, `STAKING_ROUTER_DEVNET_ADDRESS`
- `PROVIDERS_URLS` (EL), `CL_API_URLS` (CL) — `state.getChain()`

### Council (lido-council-daemon)

| Item | Location |
|------|----------|
| Up command | `src/commands/council-k8s/up.ts` |
| Build | `src/commands/council-k8s/build.ts` (**has hardcoded ref**) |
| Helm values | `helm/lido/lido-council/values.yaml` |
| Makefile | `workspaces/council/Makefile` |

Key env vars: `KEYS_API_HOST`, `KEYS_API_PORT`, `LOCATOR_DEVNET_ADDRESS`, `EVM_CHAIN_DATA_BUS_ADDRESS`
Depends on: chain, lido, CSM, KAPI

> **Devnet support:** Council needs chainId in `bls.constants.ts`, `deposits-registry.constants.ts`, `signing-keys-registry.constants.ts`, and `messages.constants.ts`. If using a feature branch, merge with `feat/devnet` to get chain support.

### DSM Bots (depositor-bot)

| Item | Location |
|------|----------|
| Up command | `src/commands/dsm-bots-k8s/up.ts` |
| Build | `src/commands/dsm-bots-k8s/build.ts` (**has hardcoded ref**) |
| Helm values | `helm/lido/lido-dsm-bot/values.yaml` |
| Makefile | `workspaces/dsm-bots/Makefile` |

Key env vars: `WEB3_RPC_ENDPOINTS`, `LIDO_LOCATOR`, `DEPOSIT_CONTRACT`, `KEYS_API_URLS`, `CL_API_URLS`, `ONCHAIN_TRANSPORT_ADDRESS`
Deploys 3 helm releases: `depositor-bot`, `pause-bot`, `unvetter-bot`
Depends on: chain, lido, CSM, KAPI

> **Devnet support:** Like council, feature branches may need merge with `feat/devnet`.

### Oracles

| Item | Location |
|------|----------|
| Up command | `src/commands/oracles-k8s/up.ts` |
| Build multi | `src/commands/oracles-k8s/build-multi.ts` |
| Helm values | `helm/lido/lido-oracle/values.yaml` |
| Makefile | `workspaces/oracle/Makefile` |

Built with per-module branches (accounting, ejector, csm). When using a single branch for all modules:

```bash
# Build all modules from same branch
./bin/run.js oracles-k8s build-multi \
  --accountingBranch <branch> --accountingTag kt-<devnet>-ao \
  --ejectorBranch <branch> --ejectorTag kt-<devnet>-vebo \
  --csmBranch <branch> --csmTag kt-<devnet>-csm \
  --image lido/oracle --fetch --keepWorktrees

# Deploy
REGISTRY=$(grep DOCKER_REGISTRY_EXTERNAL_HOSTNAME .env | cut -d= -f2)
./bin/run.js oracles-k8s up \
  --image lido/oracle --tag kt-<devnet>-csm \
  --accountingTag kt-<devnet>-ao \
  --ejectorTag kt-<devnet>-vebo \
  --csmTag kt-<devnet>-csm \
  --registryHostname $REGISTRY
```

Deploys 11 helm releases: accounting (x2), ejector (x2), csm (x2), cm (x2), performance-collector, performance-web, performance-db.

Key env vars: `KEYS_API_URI`, `CONSENSUS_CLIENT_URI`, `LIDO_LOCATOR_ADDRESS`, `CSM_MODULE_ADDRESS`

### Kubo (IPFS)

| Item | Location |
|------|----------|
| Up command | `src/commands/kubo-k8s/up.ts` |
| Helm values | `helm/lido/lido-kubo/values.yaml` |

> **Known issue:** Kubo init container runs as root and creates `/data/ipfs/config`, but the main container runs as `ipfs` (UID 1000). The helm chart includes a `chown -R 1000:100 /data/ipfs` init command to fix permissions.

## K8s Naming Conventions

| Entity | Pattern | Example |
|--------|---------|---------|
| Chain namespace | `kt-{DEVNET_NAME}` | `kt-srv3-cmv2-devnet3` |
| Service namespace | `kt-{DEVNET_NAME}-{service}` | `kt-srv3-cmv2-devnet3-kapi` |
| Helm release | `lido-{service}-{n}` | `lido-kapi-1` |
| Service DNS | `{release}.{namespace}.svc.cluster.local:{port}` | `lido-kapi-1.kt-srv3-cmv2-devnet3-kapi.svc.cluster.local:3000` |
| Ingress | `{service}.{DEVNET_NAME}.valset-03.testnet.fi` | `keys-api.srv3-cmv2-devnet3.valset-03.testnet.fi` |

## Post-deploy

### Publish digest to Slack
```bash
./bin/run.js chain publish-digest-to-slack
```
Collects chain endpoints, service branches/commits from artifacts, refreshes dashboard ConfigMap, and posts digest to Slack via `SLACK_WEBHOOK_URL`.

### Deploy dashboard + logging
```bash
./bin/run.js dashboard up
./bin/run.js logging up
./bin/run.js grafana down --force && ./bin/run.js grafana up  # redeploy to add Loki datasource
```

> **Note:** Loki default memory limit is 512Mi which may cause OOMKilled. Increase to 1Gi in `helm/vendor/loki/values.yaml` if needed.

> **Note:** Promtail uses cluster-scoped ClusterRole. If a previous devnet's logging wasn't cleaned up, `logging up` will fail. Delete stale resources: `kubectl delete clusterrole promtail-promtail && kubectl delete clusterrolebinding promtail-promtail`

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `kurtosis gateway` fails at stand start | Gateway already running from previous session | `pkill -f "kurtosis gateway"` then retry |
| `./bin/run.js down` fails with repo clone error | DRE init tries to clone all service repos | Use manual destroy (kurtosis + kubectl) |
| Council: "Chain X is not supported" | Feature branch missing devnet chainId support | Merge with `feat/devnet` |
| DSM bots: missing `deposit_security_module` | Feature branch missing DSM contract bindings | Merge with `feat/devnet` |
| Kubo: "permission denied" on `/data/ipfs/config` | Init runs as root, main container as UID 1000 | `chown` in initCommands (already fixed in helm chart) |
| Loki OOMKilled | Default 512Mi memory limit too low | Increase to 1Gi in `helm/vendor/loki/values.yaml` |
| Promtail install fails (ClusterRole exists) | Stale ClusterRole from previous devnet | Delete ClusterRole/Binding manually |
| Oracle: `ModuleNotFoundError` | Missing dependency in `pyproject.toml` | Add missing package, rebuild |
| `yarn install` fails in artifacts | `node_modules` not installed after clone | `cd artifacts/<devnet>/<service> && yarn install` |

## Build

After changing any `.ts` file, **always run `yarn build`** before executing commands.
