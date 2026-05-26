# RFC: DevNet Self-Service Platform

## Problem Statement

Currently, when developers need to deploy or update a devnet, the workflow is:

1. Developer pushes a fix to a branch
2. Developer asks the DevNet engineer to rebuild and redeploy the service
3. DevNet engineer manually runs CLI commands: clone/pull → build image → push to registry → rollout restart
4. Developer waits for confirmation

This creates a **bottleneck on one person** and slows down the development cycle. Developers cannot self-serve even for routine redeploys. Teams cannot manage their own devnets independently.

## Proposed Solution

A **self-service platform** where each team gets their own K8s cluster with pre-installed tooling. Teams manage devnets through **GitOps** (stand configs in a Git repo) and **GitHub Actions** (trigger deployments). The VROOM team provides the CLI tooling, stand templates, and an AI-readable command specification.

### Core User Flows

**Create a new devnet (AI-assisted):**
```
1. Developer opens team repo in Claude / Codex
2. Describes what they need: "devnet for testing oracle fix, branch fix/my-bug, 50 validators"
3. AI reads commands.yaml spec + existing templates
4. AI generates stands/my-devnet.yaml
5. Developer reviews, commits, pushes
6. GitHub Action deploys the devnet
```

**Create a new devnet (manual):**
```
1. Developer copies a template from templates/ to stands/
2. Customizes branches, parameters
3. Pushes to repo (or triggers GitHub Action manually)
4. GitHub Action executes CLI in the team's cluster
5. Devnet is running, visible in K8s Dashboard
```

**Rebuild a service after a fix:**
```
1. Developer goes to GitHub Actions
2. Selects "Rebuild Service"
3. Picks devnet + service + branch
4. Action rebuilds and redeploys
5. Logs visible in GitHub Actions UI
```

**Debug / manual intervention:**
```
kubectl exec -it cli-pod -- bash
./bin/run.js oracle build
./bin/run.js oracle up
```

## Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────┐
│                      GitHub                           │
│                                                       │
│  lidofinance/team-<name>-devnets/  (per-team repo)   │
│  ├── commands.yaml           (AI spec, from VROOM)    │
│  ├── templates/              (provided by VROOM)      │
│  │   ├── pectra-basic.yaml                            │
│  │   ├── pectra-with-dsm.yaml                         │
│  │   └── full-stack.yaml                              │
│  ├── stands/                 (team's devnets)         │
│  │   ├── devnet-1.yaml                                │
│  │   └── devnet-2.yaml                                │
│  └── .github/workflows/                               │
│      └── devnet.yaml         (GitHub Action)          │
│                                                       │
│  Triggers:                                            │
│  - workflow_dispatch (manual — pick stand + action)    │
│  - on push to stands/ (automatic)                     │
└──────────┬───────────────────────────────────────────┘
           │ GitHub Action → kubectl exec
           ▼
┌──────────────────────────────────────────────────────┐
│          Team K8s Cluster (minikube / managed)        │
│                                                       │
│  ┌─────────────────────────────┐                      │
│  │  CLI Pod (always running)   │                      │
│  │                             │                      │
│  │  lido-local-devnet repo     │ ← GitHub Action      │
│  │  + GitHub token             │   triggers commands  │
│  │  + BuildKit (rootless)      │                      │
│  │  + registry credentials     │ ← Team can also      │
│  │                             │   kubectl exec       │
│  │  ./bin/run.js ...           │   for manual work    │
│  └─────────────────────────────┘                      │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ K8s Dashboard │  │ Prometheus + │                   │
│  │              │  │ Grafana      │                   │
│  │ - pods       │  │              │                   │
│  │ - services   │  │ - CPU/mem    │                   │
│  │ - logs       │  │ - alerts     │                   │
│  └──────────────┘  └──────────────┘                   │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ devnet-1 │ │ devnet-2 │ │ devnet-3 │              │
│  │namespace │ │namespace │ │namespace │              │
│  └──────────┘ └──────────┘ └──────────┘              │
└──────────────────────────────────────────────────────┘
```

### Components

**1. Per-team Git repository**

- Stand configs in YAML — declarative devnet definitions
- `commands.yaml` — AI-readable specification of all CLI commands (maintained by VROOM)
- GitHub Actions workflows — trigger deploy/rebuild/destroy
- Templates provided and maintained by VROOM team
- Teams own their stand configs, can customize freely

**2. CLI Pod (lido-local-devnet)**

- Always-running pod in the team's cluster
- Contains the full CLI tooling, GitHub token, registry credentials
- **YAML runner** — parses stand YAML and executes steps sequentially via CLI commands
- BuildKit (rootless) for Docker image builds
- Entrypoint for both GitHub Actions and manual kubectl exec

**3. K8s Dashboard**

- Official Kubernetes Dashboard for cluster overview
- Teams see their devnets (namespaces), pod status, resource usage, logs
- No custom UI development needed

**4. Prometheus + Grafana (optional)**

- Resource monitoring — CPU, memory, disk per devnet
- Alerts for idle devnets ("devnet-2 has been running for 7 days with no activity")
- Helps teams take responsibility for their resource usage

### Three Ways to Manage Devnets

| | **AI-assisted** (recommended) | **GitHub Actions** (primary) | **kubectl exec** (fallback) |
|---|------|---------------|-------------|
| **Who** | Any developer with Claude/Codex | Any developer with repo access | Team member with kubeconfig |
| **When** | Creating new stands, complex configs | Running existing stands, rebuilds | Debugging, non-standard situations |
| **How** | AI reads `commands.yaml` + templates, generates YAML | Manual trigger in GitHub UI | Shell into CLI pod |
| **Logs** | N/A (generates config only) | GitHub Actions UI | Terminal |
| **Audit** | Git commit history | GitHub Action logs | Manual |

## AI-First Stand Generation

### Concept

Every developer already has access to AI coding assistants (Claude, Codex). Instead of building a custom UI or chatbot, we provide a well-structured **command specification** (`commands.yaml`) that any AI agent can read to generate valid stand configs.

### Repository Structure

```
team-csm-devnets/
├── commands.yaml              # AI-readable spec of all CLI commands (from VROOM)
├── templates/
│   ├── pectra-basic.yaml      # basic Pectra devnet
│   ├── pectra-with-dsm.yaml   # Pectra + full DSM setup
│   └── full-stack.yaml        # everything enabled
├── stands/                    # team's active devnets
│   ├── devnet-1.yaml
│   └── devnet-2.yaml
└── .github/workflows/
    └── devnet.yaml
```

### commands.yaml — AI Specification

This file describes all available CLI commands with parameters, types, defaults, and AI hints. It serves as an API reference that AI agents can use to generate valid stand configurations.

```yaml
# commands.yaml — maintained by VROOM team, synced to all team repos
version: "1.0"

description: |
  Specification of all lido-local-devnet CLI commands.
  Used by AI agents to generate stand YAML configs.

# Dynamic value syntax: ${{ expression }}
# Available contexts:
#   ${{ services.<name>.config.constants.<KEY> }} — service config values
#   ${{ network.name }} — current network name

ordering_rules:
  - "git/checkout must come before any command that uses that service"
  - "chain/kurtosis-up must be the first non-checkout step"
  - "lido-core/deploy before lido-core/activate"
  - "csm/deploy before csm/activate"
  - "lido-core/keys/generate before lido-core/keys/use"
  - "lido-core/add-operator before lido-core/add-keys"
  - "kapi-k8s/up before oracles-k8s/up"
  - "data-bus/deploy before council-k8s/up and dsm-bots-k8s/up"
  - "validator/add after all deposits"
  - "chain/info is always the last step"

commands:
  git/checkout:
    description: "Switch a service repository to a specific branch or tag"
    ai_hint: "Ask user which branch they need if they're testing a specific fix"
    params:
      service:
        type: string
        required: true
        enum: [lidoCore, csm, cmv2, oracle, kapi, council, dsmBots,
               easyTrack, lidoCLI, vroomOnchainMon]
      ref:
        type: string
        required: true
        description: "Git branch, tag, or commit hash"

  chain/kurtosis-up:
    description: "Initialize Ethereum network using Kurtosis"
    ai_hint: "Default preset works for most cases. Change only for specific EL/CL clients"
    params:
      preset:
        type: string
        default: pectra-stable
        enum: [pectra-stable, srv3-devnet, csm-v2, fusaka-devnet2]

  lido-core/deploy:
    description: "Deploy Lido Core smart contracts"
    ai_hint: |
      Most params have sensible defaults for devnet.
      Only ask user about voteDuration if they need faster/slower governance.
    params:
      verify:
        type: boolean
        default: false
      voteDuration:
        type: number
        default: 60
        description: "Governance vote duration in slots. 60=fast testing, 300=realistic"
      gasMaxFee:
        type: string
        default: ${{ services.lidoCore.config.constants.GAS_MAX_FEE }}
      gasPriorityFee:
        type: string
        default: ${{ services.lidoCore.config.constants.GAS_PRIORITY_FEE }}
      gasLimit:
        type: string
        default: "16000000"
      configFile:
        type: string
        default: ${{ services.lidoCore.config.constants.NETWORK_STATE_DEFAULTS_FILE }}
      normalizedClRewardPerEpoch:
        type: number
        default: 64
      normalizedClRewardMistakeRateBp:
        type: number
        default: 1000
      rebaseCheckNearestEpochDistance:
        type: number
        default: 1
      rebaseCheckDistantEpochDistance:
        type: number
        default: 2
      validatorDelayedTimeoutInSlots:
        type: number
        default: 7200
      validatorDelinquentTimeoutInSlots:
        type: number
        default: 28800
      nodeOperatorNetworkPenetrationThresholdBp:
        type: number
        default: 100
      predictionDurationInSlots:
        type: number
        default: 50400
      finalizationMaxNegativeRebaseEpochShift:
        type: number
        default: 1350
      exitEventsLookbackWindowInSlots:
        type: number
        default: 7200

  csm/deploy:
    description: "Deploy Community Staking Module contracts"
    ai_hint: "Usually deployed right after lido-core. No special config needed for most cases"
    params:
      verify:
        type: boolean
        default: false

  lido-core/activate:
    description: "Activate Lido Core protocol after contract deployment"
    ai_hint: "Always required after lido-core/deploy. No params needed"

  csm/activate:
    description: "Activate CSM module in Lido protocol"
    ai_hint: "Default params work for testing. Adjust stakeShareLimitBP if testing stake limits"
    params:
      stakeShareLimitBP:
        type: number
        default: 2000
        description: "Max share of total stake for CSM (basis points)"
      priorityExitShareThresholdBP:
        type: number
        default: 2500
      maxDepositsPerBlock:
        type: number
        default: 30
        description: "30 for normal, 100 for stress testing"

  lido-core/replace-dsm:
    description: "Replace DSM with an EOA for simplified testing"
    ai_hint: "Use for devnets without full DSM. Skip if devnet has council + dsm-bots"

  lido-core/keys/generate:
    description: "Generate validator keys for an operator"
    params:
      validators:
        type: number
        default: 30
      wcType:
        type: string
        default: "0x01"
        enum: ["0x01", "0x02"]

  lido-core/keys/use:
    description: "Allocate generated keys to a named operator"
    params:
      name:
        type: string
        required: true
      wcType:
        type: string
        default: "0x01"

  lido-core/add-operator:
    description: "Register a node operator in curated module (NOR)"
    params:
      name:
        type: string
        required: true

  lido-core/add-keys:
    description: "Add generated keys to a registered operator"
    params:
      name:
        type: string
        required: true
      id:
        type: number
        required: true
        description: "Operator ID in the module"

  lido-core/set-staking-limit:
    description: "Set max validators for a curated operator"
    params:
      operatorId:
        type: number
        required: true
      limit:
        type: number
        required: true

  lido-core/add-new-operator:
    description: "Add operator with keys and deposit in one step"
    ai_hint: "Shortcut combining add-operator + keys + deposit. Prefer for simplicity"
    params:
      operatorId:
        type: number
        required: true
      stakingModuleId:
        type: number
        required: true
      depositCount:
        type: number
        required: true

  csm/add-operator:
    description: "Add CSM operator with pre-generated keys"
    params:
      name:
        type: string
        required: true

  lido-core/deposit:
    description: "Make staking deposit to a module"
    ai_hint: "id=1 is NOR module, id=3 is CSM module"
    params:
      id:
        type: number
        required: true
        description: "Staking module ID (1=NOR, 3=CSM)"
      deposits:
        type: number
        default: 30
      amount:
        type: number
        default: 10000
      dsm:
        type: boolean
        default: false

  kapi-k8s/up:
    description: "Deploy Keys API service to Kubernetes"
    ai_hint: "Required for oracle and most other services"

  oracles-k8s/up:
    description: "Deploy Oracle service to Kubernetes"
    ai_hint: "Core service. Ask user about branch if they're testing oracle changes"
    params:
      image:
        type: string
        default: lidofinance/oracle
      tag:
        type: string
        default: ""
      build:
        type: boolean
        default: true

  council-k8s/up:
    description: "Deploy Council daemon service"
    ai_hint: "Only needed with full DSM setup"

  dsm-bots-k8s/up:
    description: "Deploy DSM bots service"
    ai_hint: "Only needed with full DSM setup"

  data-bus/deploy:
    description: "Deploy Data Bus contracts"
    ai_hint: "Required for DSM bots and council daemon"

  evm/up:
    description: "Deploy Ethereum Validators Monitoring"
    ai_hint: "Heavy service. Only suggest if user specifically needs validator monitoring"

  grafana/up:
    description: "Deploy Grafana dashboards"
    ai_hint: "Useful for debugging, not required for basic testing"

  dashboard/up:
    description: "Deploy devnet dashboard (read-only status page)"

  onchain-mon-k8s/up:
    description: "Deploy on-chain monitoring (feeder + forwarder)"

  vroom-onchain-mon-k8s/up:
    description: "Deploy VROOM on-chain monitoring bots"

  validator/add:
    description: "Add generated validator keys to the validator client"
    ai_hint: "Always run after all deposits, before chain/info"

  chain/info:
    description: "Display chain connection info and endpoints"
    ai_hint: "Always the final step"
```

### Stand YAML Format

Stands are ordered lists of CLI commands with parameters. Dynamic values use `${{ }}` syntax.

```yaml
# stands/devnet-1.yaml
name: oracle-testing
description: "Devnet for testing oracle accounting fix"

steps:
  # Phase 1: Git checkouts
  - command: git/checkout
    params:
      service: lidoCore
      ref: develop

  - command: git/checkout
    params:
      service: csm
      ref: main

  # Phase 2: Chain
  - command: chain/kurtosis-up
    params:
      preset: pectra-stable

  # Phase 3: Contracts
  - command: lido-core/deploy
    params:
      verify: false
      voteDuration: 60
      gasMaxFee: ${{ services.lidoCore.config.constants.GAS_MAX_FEE }}
      gasPriorityFee: ${{ services.lidoCore.config.constants.GAS_PRIORITY_FEE }}
      gasLimit: "16000000"
      configFile: ${{ services.lidoCore.config.constants.NETWORK_STATE_DEFAULTS_FILE }}

  - command: csm/deploy

  - command: lido-core/activate

  - command: csm/activate
    params:
      stakeShareLimitBP: 2000
      priorityExitShareThresholdBP: 2500
      maxDepositsPerBlock: 30

  - command: lido-core/replace-dsm

  # Phase 4: Operators + Keys (NOR)
  - command: lido-core/keys/generate
    params:
      validators: 50
      wcType: "0x01"

  - command: lido-core/keys/use
    params:
      name: devnet_nor_1
      wcType: "0x01"

  - command: lido-core/add-operator
    params:
      name: devnet_nor_1

  - command: lido-core/add-keys
    params:
      name: devnet_nor_1
      id: 0

  - command: lido-core/set-staking-limit
    params:
      operatorId: 0
      limit: 50

  # Phase 4: Operators + Keys (CSM)
  - command: lido-core/keys/generate
    params:
      validators: 50
      wcType: "0x01"

  - command: lido-core/keys/use
    params:
      name: devnet_csm_1
      wcType: "0x01"

  - command: csm/add-operator
    params:
      name: devnet_csm_1

  # Phase 5: Services
  - command: kapi-k8s/up

  - command: oracles-k8s/up
    params:
      image: lidofinance/oracle
      tag: ""
      build: true

  # Phase 6: Deposits + Validators
  - command: lido-core/deposit
    params:
      id: 1
      deposits: 50
      amount: 10000

  - command: lido-core/deposit
    params:
      id: 3
      deposits: 50
      amount: 10000

  - command: validator/add

  - command: chain/info
```

### AI Interaction Example

```
Developer: I need a devnet to test my oracle fix on branch fix/oracle-accounting-bug.
           50 validators, no DSM, with Grafana for debugging.

AI (reads commands.yaml + templates/pectra-basic.yaml):

   I'll create a stand based on pectra-basic template with these changes:
   - Oracle branch: fix/oracle-accounting-bug
   - 50 validators instead of 30
   - Grafana enabled
   - No DSM (using EOA replacement)

   Generated: stands/oracle-accounting-test.yaml

   The stand includes 22 steps:
   1. Git checkouts (lidoCore:develop, csm:main)
   2. Chain setup (pectra-stable preset)
   3. Contract deployment (Lido Core + CSM)
   4. Protocol activation
   5. 1 NOR operator + 1 CSM operator (50 validators each)
   6. Services: KAPI, Oracle (build from fix/oracle-accounting-bug), Grafana
   7. Deposits + validator setup

   Want me to commit and push?
```

### GitHub Actions

Two separate workflows — one for deploying a full stand, one for rebuilding a single service.

**Deploy Stand** (`deploy-stand.yaml`):

```yaml
name: Deploy Stand

on:
  workflow_dispatch:
    inputs:
      stand:
        description: 'Stand config file'
        type: choice
        options:
          - stands/devnet-1.yaml
          - stands/devnet-2.yaml

jobs:
  deploy:
    runs-on: self-hosted  # runner in the same K8s cluster
    steps:
      - name: Deploy stand
        run: |
          kubectl exec cli-pod -- ./bin/run.js stand run ${{ inputs.stand }}
```

**Rebuild Service** (`rebuild-service.yaml`):

```yaml
name: Rebuild Service

on:
  workflow_dispatch:
    inputs:
      service:
        description: 'Service to rebuild'
        type: choice
        options:
          - oracle
          - kapi
          - council-daemon
          - dsm-bots
          - evm
          - dashboard
          - onchain-mon
          - vroom-onchain-mon
      branch:
        description: 'Branch to deploy'
        type: string
        required: true

jobs:
  rebuild:
    runs-on: self-hosted
    steps:
      - name: Checkout service branch
        run: |
          kubectl exec cli-pod -- ./bin/run.js git checkout \
            --service ${{ inputs.service }} \
            --ref ${{ inputs.branch }}

      - name: Build image
        run: |
          kubectl exec cli-pod -- ./bin/run.js ${{ inputs.service }} build

      - name: Deploy to K8s
        run: |
          kubectl exec cli-pod -- ./bin/run.js ${{ inputs.service }} up
```

### GitHub → K8s Connectivity

GitHub Actions needs access to the team's K8s cluster to execute `kubectl exec`. The recommended approach is a **self-hosted runner** deployed as a pod in the same cluster.

```
┌──────────────────────────────────────────────────┐
│          Team K8s Cluster                         │
│                                                   │
│  ┌─────────────────┐     ┌─────────────────────┐ │
│  │  GitHub Actions  │     │  CLI Pod            │ │
│  │  Runner Pod      │────▶│                     │ │
│  │                  │     │  ./bin/run.js ...    │ │
│  │  - polls GitHub  │     │                     │ │
│  │  - runs jobs     │     └─────────────────────┘ │
│  │  - has kubectl   │                             │
│  └─────────────────┘                              │
└──────────────────────────────────────────────────┘
```

**How it works:**
1. Runner pod is deployed in the cluster via [Actions Runner Controller (ARC)](https://github.com/actions/actions-runner-controller)
2. Runner polls GitHub for new workflow runs
3. When triggered, runner executes `kubectl exec` into the CLI pod
4. All traffic stays inside the cluster — no need to expose K8s API externally

**Installation:**
```bash
helm install arc actions-runner-controller/gha-runner-scale-set-controller
helm install runner actions-runner-controller/gha-runner-scale-set \
  --set githubConfigUrl="https://github.com/lidofinance/team-<name>-devnets" \
  --set githubConfigSecret.github_token="<PAT>"
```

### Service Rebuild Flow

The most common operation — developer pushed a fix to a service branch and needs it deployed on the devnet.

**Example: developer fixed a bug in oracle, branch `fix/oracle-accounting-bug`**

**Option A: GitHub Action (recommended)**

```
1. Developer goes to Actions → "Devnet Management"
2. Selects:
   - stand: stands/devnet-1.yaml
   - action: rebuild-service
   - service: oracle
   - branch: fix/oracle-accounting-bug
3. Action runs in CLI pod:
   git/checkout → oracles-k8s/build → oracles-k8s/up
4. Oracle pod restarts with the new image
5. Logs visible in GitHub Actions
```

**Option B: Update stand YAML and push**

```yaml
# Change branch in stands/devnet-1.yaml
- command: git/checkout
  params:
    service: oracle
    ref: fix/oracle-accounting-bug  # was: master
```

Push triggers the GitHub Action automatically — only the changed service gets rebuilt.

**Option C: kubectl exec (manual)**

```bash
kubectl exec -it cli-pod -- bash
./bin/run.js git checkout --service oracle --ref fix/oracle-accounting-bug
./bin/run.js oracle build
./bin/run.js oracle up
```

See the **Rebuild Service** GitHub Action workflow above for the full YAML.

### Build Pipeline Flow

```
GitHub Action trigger
  │
  ▼
kubectl exec into CLI Pod
  │
  ▼
CLI YAML runner parses stand config
  │
  ▼
Executes steps sequentially:
  clone/pull repo ← (GitHub token from k8s secret)
  BuildKit build  ← (rootless, no privileged needed)
  push to registry ← (registry credentials from k8s secret)
  deploy to k8s   ← (in-cluster access)
  │
  ▼
Logs visible in GitHub Actions UI
```

## Infrastructure Model

### Phase 1: Sandbox with Minikube

```
┌─────────────────────────────────┐
│  Team Sandbox Machine (GCP VM)  │
│                                 │
│  minikube                       │
│  ├── cli-pod                    │
│  ├── k8s-dashboard              │
│  ├── devnet-1 namespace         │
│  └── devnet-2 namespace         │
└─────────────────────────────────┘
```

- Each team gets a GCP VM with minikube
- Simple, cheap, fully isolated
- Team manages their own resources

### Phase 2: Managed K8s (future)

```
┌─────────────────────────────────┐
│  Team GKE Cluster               │
│  (managed by DevOps)            │
│                                 │
│  Node pool (auto-scaling)       │
│  ├── cli-pod                    │
│  ├── k8s-dashboard              │
│  ├── prometheus + grafana       │
│  ├── devnet-1 namespace         │
│  ├── devnet-2 namespace         │
│  └── devnet-N namespace         │
└─────────────────────────────────┘
```

- DevOps manages the cluster
- Auto-scaling node pools
- ResourceQuotas per team/namespace

## GitHub Access Requirements

The CLI Pod requires **read-only** access to clone the following `lidofinance` repositories. No write access is needed.

| # | Repository | Purpose |
|---|-----------|---------|
| 1 | [lidofinance/core](https://github.com/lidofinance/core) | Lido protocol core smart contracts |
| 2 | [lidofinance/lido-oracle](https://github.com/lidofinance/lido-oracle) | Oracle services |
| 3 | [lidofinance/lido-cli](https://github.com/lidofinance/lido-cli) | CLI utilities for deployment |
| 4 | [lidofinance/scripts](https://github.com/lidofinance/scripts) | Voting and deployment scripts |
| 5 | [lidofinance/community-staking-module](https://github.com/lidofinance/community-staking-module) | CSM / CMv2 contracts |
| 6 | [lidofinance/csm-prover-tool](https://github.com/lidofinance/csm-prover-tool) | CSM proof generation |
| 7 | [lidofinance/lido-keys-api](https://github.com/lidofinance/lido-keys-api) | Keys API (KAPI) |
| 8 | [lidofinance/lido-council-daemon](https://github.com/lidofinance/lido-council-daemon) | Council daemon |
| 9 | [lidofinance/depositor-bot](https://github.com/lidofinance/depositor-bot) | DSM bots |
| 10 | [lidofinance/late-prover-bot](https://github.com/lidofinance/late-prover-bot) | Late block prover bot |
| 11 | [lidofinance/ethereum-validators-monitoring](https://github.com/lidofinance/ethereum-validators-monitoring) | Validators monitoring (EVM) |
| 12 | [lidofinance/lido-mev-monitoring](https://github.com/lidofinance/lido-mev-monitoring) | MEV monitoring |
| 13 | [lidofinance/ethereum-head-watcher](https://github.com/lidofinance/ethereum-head-watcher) | Ethereum head state watcher |
| 14 | [lidofinance/onchain-mon](https://github.com/lidofinance/onchain-mon) | On-chain monitoring |
| 15 | [lidofinance/valset-onchain-mon-bots](https://github.com/lidofinance/valset-onchain-mon-bots) | VROOM on-chain monitoring |
| 16 | [lidofinance/node-operators-widget](https://github.com/lidofinance/node-operators-widget) | NO widget UI |
| 17 | [lidofinance/node-operators-widget-backend-ts](https://github.com/lidofinance/node-operators-widget-backend-ts) | NO widget backend |
| 18 | [lidofinance/data-bus](https://github.com/lidofinance/data-bus) | Data bus contracts |
| 19 | [lidofinance/ethereum-package](https://github.com/lidofinance/ethereum-package) | Kurtosis Ethereum package |

**Total: 19 repositories, all under `lidofinance` org.**

**Required permissions:** Read-only (clone/pull). Recommended approach — **GitHub App** scoped to `lidofinance` org with `contents: read` permission on these repositories.

## Requirements from DevOps

| Requirement | Purpose | Priority |
|-------------|---------|----------|
| GCP VM per team (Phase 1) | Host minikube cluster | Must have |
| GitHub token (GitHub App preferred) | Clone service repositories | Must have |
| Docker registry credentials | Push built images | Must have |
| BuildKit rootless support | Build images without privileged mode | Must have |
| GitHub Actions self-hosted runner (ARC) | Runner pod in cluster to trigger CLI commands | Must have |
| GitHub PAT for runner registration | Connect runner to team's GitHub repo | Must have |
| K8s Dashboard installed | Cluster visibility for teams | Must have |
| Persistent volume (~10Gi) | Cache git repos and build layers | Nice to have |
| Prometheus + Grafana | Resource monitoring and idle alerts | Nice to have |

## Security

- **GitHub repo access** controls who can trigger deployments (no separate auth layer needed)
- **kubectl access** for manual intervention — distributed per team
- **All secrets** stored as K8s Secrets, never in code
- **BuildKit rootless** — no privileged containers
- **GitHub access** — read-only, scoped to specific repositories listed above
- **Audit log** — GitHub Actions provides automatic audit trail for all deployments

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Stand configs | YAML in Git (AI-generated or manual) |
| AI specification | commands.yaml (maintained by VROOM) |
| Stand generation | Claude / Codex (developer's own AI agent) |
| CI/CD trigger | GitHub Actions |
| CLI tooling | lido-local-devnet (Node.js) + YAML runner |
| Build engine | BuildKit (rootless) |
| Cluster dashboard | Kubernetes Dashboard |
| Monitoring | Prometheus + Grafana |
| Runtime | Kubernetes (minikube → GKE) |

## Implementation Plan

| Task | Description | Effort |
|------|-------------|--------|
| **YAML runner** | New CLI command `./bin/run.js stand run <file.yaml>` — parses YAML, maps commands to handlers, executes steps sequentially, resolves `${{ }}` expressions | 3-5 days |
| **commands.yaml** | Document all CLI commands with params, types, defaults, ai_hints | 2-3 days |
| **Templates** | Convert existing `.ts` stands to YAML templates | 1-2 days |
| **GitHub Action** | Workflow for deploy/rebuild/destroy | 1 day |
| **CLI Pod Helm chart** | Pod spec with BuildKit, secrets, persistent volume | 1-2 days |

## Impact

**Before:** Developer → asks DevNet engineer → engineer runs CLI → Developer waits

**After:** Developer → asks AI → AI generates YAML → push → deployed

- **Removes single-person bottleneck** for routine service rebuilds and devnet management
- **Reduces turnaround** from "whenever the engineer is available" to minutes
- **Self-service** for teams — each team owns their devnets end-to-end
- **AI-native** — developers use their existing AI tools, no new UI to learn
- **Resource accountability** — teams see and manage their own cluster resources
- **Audit trail** — Git history + GitHub Actions logs provide full deployment history
- **Scalable** — adding a new team = new VM + new repo, no shared infrastructure conflicts

## Emergency Access

Every team member with kubeconfig can `kubectl exec` into the CLI pod and run commands manually. This ensures devnet recovery is never blocked by CI/CD availability.

## Milestones

| Phase | Scope |
|-------|-------|
| **Phase 1** | YAML runner, commands.yaml, templates, GitHub Action, CLI Pod on minikube |
| **Phase 2** | K8s Dashboard, Prometheus + Grafana, idle devnet alerts |
| **Phase 3** | Migration to managed GKE, auto-scaling, cross-team shared infrastructure |
