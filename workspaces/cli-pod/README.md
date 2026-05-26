# CLI Pod

Docker image and k8s deployment for the lido-local-devnet CLI. This pod runs in each team's cluster and executes stand deployments, service rebuilds, and other CLI commands.

## What's inside

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22 | CLI runtime |
| Yarn | 4.2.2 | Package manager |
| kubectl | 1.31 | K8s deployments |
| Helm | 3.x | Chart deployments |
| Docker CLI | latest | Image builds (via host socket) |
| Kurtosis | latest | Ethereum chain setup |
| Foundry | latest | Smart contract tools (forge, cast) |
| Just | latest | Command runner (CSM, CMv2) |
| Python 3 | bookworm | Voting scripts, Easy Track |
| Git | bookworm | Repository operations |

## Quick Start

Recommended — via CLI commands:

```bash
# First time — deploys cli-pod to the cluster
./bin/run.js cli-pod up

# Check it works
./bin/run.js cli-pod verify
```

Or via Makefile directly:

```bash
cd workspaces/cli-pod
make setup
make verify
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `./bin/run.js cli-pod up` | Deploy (build + push + secrets + apply) |
| `./bin/run.js cli-pod update` | Rebuild image + restart pod |
| `./bin/run.js cli-pod down` | Remove from cluster |
| `./bin/run.js cli-pod status` | Show pod status |
| `./bin/run.js cli-pod shell` | Open interactive shell in pod |
| `./bin/run.js cli-pod logs` | Tail pod logs |
| `./bin/run.js cli-pod verify` | Verify all tools work |

All commands accept `--namespace` (default: `core-devnets-sandbox`).

## Makefile Targets

Same as CLI commands, but via `make` directly:

| Target | Description |
|--------|-------------|
| `make setup` | Full first-time setup |
| `make update` | Rebuild image + restart pod |
| `make teardown` | Remove everything |
| `make build` / `push` / `build-push` | Docker image operations |
| `make deploy` / `restart` | Kubernetes operations |
| `make status` / `shell` / `logs` / `verify` | Daily use |

## Configuration

Override via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REGISTRY_HOSTNAME` | `container-registry.valset-02.testnet.fi` | Docker registry |
| `CLI_REPO_PATH` | `../..` | Path to CLI source (build context) |
| `NAMESPACE` | `default` | K8s namespace for cli-pod |
| `GITHUB_TOKEN` | — | Required for `create-secrets` |

## Updating after CLI changes

When lido-local-devnet gets new features:

```bash
cd /path/to/lido-local-devnet
git pull
./bin/run.js cli-pod update
```

This rebuilds the Docker image, pushes it, and restarts the pod.

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Docker image with all CLI dependencies |
| `k8s-deployment.yaml` | Kubernetes deployment, PVC, secrets |
| `Makefile` | Build/deploy/manage automation |
