# Lido Local DevNet

<img src="https://docs.lido.fi/img/logo.svg" height="90px" align="right" width="90px">


Lido Local DevNet is a powerful tool for deploying and testing the Lido protocol in a local Ethereum network. It provides a streamlined process for launching Ethereum nodes, block explorers, Lido smart contracts, Lido oracles, and essential tooling.

- **Run Ethereum + Lido locally** – Deploy and test the full Lido protocol on your machine.
- **One-command setup** – Spin up a complete test environment with a single command.
- **Multi-node support** – Test the protocol on all available Ethereum node implementations.
- **Highly customizable deployment** – Fine-tune deployment parameters to fit specific testing needs.
- **Modular execution** – The project is structured as a set of commands, allowing you to rerun any step independently.
- **Multiple parallel environments** – Run several test networks on the same machine to validate different scenarios.
- **Git branch-aware deployment** – Deploy and execute scripts and from different Git branches, simulating real-world deployment workflows.
- **Integrated tooling** – Built-in support for block explorers, oracles, and auxiliary services to streamline testing.
- **Seamless debugging** – Restart individual services or redeploy specific components without affecting the entire setup.

---

## Requirements

- **Node.js** >=20,<23 ([Install Node.js](https://nodejs.org/))
- **npm** ([Install npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))
- **Docker** 27+ ([Install Docker](https://www.docker.com/))  
- **Docker Compose** V2 ([Install Docker Compose](https://docs.docker.com/compose/))  
- **Kurtosis 1.11.1+** ([Install Kurtosis](https://www.kurtosistech.com/))  
- **Foundry tools** ([Install Foundry](https://book.getfoundry.sh/getting-started/installation))  
- **Just** ([Install Just](https://github.com/casey/just))  
- **Make** 4+  (Install Make - Linux: `sudo apt-get install build-essential`)
- **Kubectl** v1.30.+ (for k8s deployments) ([Install Kubectl](https://kubernetes.io/docs/tasks/tools/))`
- **Helm** 3.12+ (for k8s deployments) ([Install Helm](https://helm.sh/docs/intro/install/))`

---

## Getting Started (with k8s integration)

Original docs are located in `https://docs.kurtosis.com/k8s/`

### 1. Install dependencies
```sh
yarn && yarn build:all
```

### 2. Create `.env` file and fill it with the required values
```sh
cp .env.sample .env
```

### 3. (Optional) Turn on SSH Tunnel to the machine with k8s cluster
```sh
./bin/run.js ssh tunnel
```

### 4. Set the current context to the k8s cluster (if you have multiple clusters)

Contexts can be found by running: `kubectl config get-contexts`

```sh
kubectl config use-context <cluster context> # or whatever your k8s context is
```

### 5. Ensure that you are connected to the k8s cluster

The cluster can be accessible via SSH Tunnel.

```sh
kubectl cluster-info
```

### 6. Change kurtosis config to work with the k8s cluster

Update once your kurtosis config at `echo $(kurtosis config path)` location

```yaml
config-version: 6
should-send-metrics: false
kurtosis-clusters:
  docker:
    type: "docker"
  cloud:
    type: "kubernetes"
    config:
      kubernetes-cluster-name: "<cluster name from kubectl>" # change the cluster name if needed
      storage-class: "ssd-hostpath"
      enclave-size-in-megabytes: 256
```

### 7. Point kurtosis to the cluster
```sh
# tell kurtosis to work with k8s cluster
kurtosis cluster set cloud # or whatever your kurtosis cluster is
```

### 8. Start Kurtosis
Kurtosis is required to launch Ethereum nodes
```sh
kurtosis engine start
```

### 9. Launch the environment and deploy Lido smart contracts
Below is an example for launching the `fusaka` test stand. 
If you need a different setup, refer to the [test stands documentation](./docs/commands/stands.md).

```sh
./bin/run.js stands <stand-name>  # (fusaka) or any other test stand name
```
For contract verification, use the `--verify` flag:
```sh
./bin/run.js stands <stand-name> --verify
```
For a full DSM infrastructure deployment, add the `--dsm` flag:
```sh
./bin/run.js stands <stand-name> --verify --dsm
```

### 10. (Optional) Interaction with Voting scripts 

Since voting scripts require Python and Brownie, install the necessary dependencies:
```sh
./bin/run.js voting install
```
If errors occur, install any missing modules as prompted.

Next, add an account. Brownie does not automatically fetch account settings, but a console interface simplifies automation. Run the following command and enter the private key displayed in the logs:
```sh
./bin/run.js voting add-account
```

After adding an account, proceed with the voting process. See the [voting documentation](./docs/commands/voting.md) for more details. Below is an example for transitioning the protocol to the Pectra hard fork. If you need a different setup, refer to the documentation.

**Before Pectra:**
```sh
./bin/run.js voting enact-before-pectra
```

**After Pectra:**
```sh
./bin/run.js voting enact-after-pectra
```

### 11. Done!
The network, infrastructure, and protocol have been successfully launched.

---

## Stopping the DevNet
To stop the DevNet and remove all services, run:
```sh
./bin/run.js down
```

---

## Node Source Modes

The devnet supports three modes for how EL/CL nodes are provided:

### 1. Kurtosis (default)

Full local devnet with Kurtosis-managed nodes. This is the legacy mode.

```sh
./bin/run.js chain up                          # default, same as kurtosis
./bin/run.js chain up --mode kurtosis          # explicit
./bin/run.js chain up --mode kurtosis --preset fusaka-devnet2
```

### 2. Self-Hosted

Deploy your own EL/CL nodes in Kubernetes using Helm charts (`lido-el-node`, `lido-cl-node`). Useful for running on real testnets (Hoodi, Holesky) or custom ethpandaops devnets.

```sh
# Deploy nodes on Hoodi
./bin/run.js chain up --mode self-hosted --network hoodi --elClient geth --clClient lighthouse
```

#### Custom ethpandaops devnets

For custom devnets (e.g., ethpandaops ePBS/Fusaka devnets), you need to:

1. **Download network config** from the ethpandaops GitHub:
```sh
./bin/run.js chain fetch-network-config --repo epbs-devnets --devnet devnet-0
```
This downloads `genesis.json`, `config.yaml`, `genesis.ssz`, `enodes.txt`, `bootstrap_nodes.yaml` into `artifacts/<stand>/network-config/`.

2. **Deploy with custom Docker images** and genesis.ssz URL (for large genesis files that exceed the 1MB K8s ConfigMap limit):
```sh
./bin/run.js chain up --mode self-hosted \
  --network epbs-devnet-0 \
  --elClient geth --clClient prysm \
  --elImage ethpandaops/geth:epbs-devnet-0 \
  --clImage ethpandaops/prysm-beacon-chain:epbs-devnet-0-sync \
  --genesisSSZUrl https://raw.githubusercontent.com/ethpandaops/epbs-devnets/master/network-configs/devnet-0/metadata/genesis.ssz
```

**Self-hosted flags:**

| Flag | Description |
|------|-------------|
| `--elClient` | EL client: `geth` (default) or `reth` |
| `--clClient` | CL client: `lighthouse`, `prysm`, or `teku` |
| `--elImage` | Custom Docker image for EL (e.g., `ethpandaops/geth:epbs-devnet-0`) |
| `--clImage` | Custom Docker image for CL (e.g., `ethpandaops/prysm-beacon-chain:epbs-devnet-0-sync`) |
| `--genesisSSZUrl` | URL to download genesis.ssz (for files >1MB, downloaded via init container) |
| `--checkpointSyncUrl` | Checkpoint sync URL for the CL client |

**Notes on custom devnets:**
- Bootnodes are automatically read from `enodes.txt` (EL) and `bootstrap_nodes.yaml` (CL) in the network-config directory
- For custom networks, geth uses `--syncmode=full` (not snap) to enable sequential block processing
- For ePBS devnets, use **Prysm** with the `-sync` tag instead of Lighthouse (Lighthouse has a known sync stall at the Gloas fork boundary)
- Lighthouse requires `--epochs-per-migration=99999` for ePBS networks (added automatically)

### 3. External

Attach to already running external nodes without launching anything.

```sh
./bin/run.js chain up --mode external --el-url http://my-el:8545 --cl-url http://my-cl:5052
./bin/run.js chain up --mode external --el-url http://my-el:8545 --cl-url http://my-cl:5052 --el-ws-url ws://my-el:8546
```

### Wallet Management

For self-hosted and external modes, wallets can be managed via `wallets.yml`:

```yaml
# artifacts/<stand>/wallets.yml
deployer:
  privateKey: "0x..."
  publicKey: "0x..."
oracle1:
  privateKey: "0x..."
  publicKey: "0x..."
# ... etc.
```

Sync wallets from/to K8s ConfigMap:
```sh
./bin/run.js chain wallet-sync-from-k8s-configmap
./bin/run.js chain wallet-sync-to-k8s-configmap
```

Sync state from/to K8s ConfigMap:
```sh
./bin/run.js chain state-sync-from-k8s-configmap
./bin/run.js chain state-sync-to-k8s-configmap
```

### Hoodi Example

See `config.hoodi.example.yml` for a complete Hoodi testnet configuration with real contract addresses from [docs.lido.fi](https://docs.lido.fi/deployed-contracts/hoodi).

```sh
# Quick start with the Hoodi stand
./bin/run.js stands hoodi-self-hosted

# Or step by step:
./bin/run.js chain up --mode self-hosted --network hoodi
./bin/run.js kapi-k8s up
```

---

## Running Multiple Environments

To run multiple devnets on a single cluster, change the `DEVNET_NAME=<another_devnet>` variable in `.env` file.
If `DEVNET_NAME` is empty, root deploy commands such as `stands ...` or `chain up` will auto-generate a readable name and save it to `.env`.
You can still override the name manually with `--network <name>`; that flag also works for service build/rebuild commands.
All the commands will be executed in the context of the current devnet.
---

## DevNet info
To get the latest information on available services, run:
```sh
./bin/run.js chain info
```

## Available Services
To get the latest information on available services, run:
```sh
./bin/run.js config
```

---

## Available Commands
This repository provides a high-level interface for managing DevNet. However, if you need to restart a specific service or deployment step, refer to the [command documentation](./docs/commands/README.md).

---

## Architecture

For a comprehensive understanding of the project architecture, including the command system, services, state management, and how to extend the project, please refer to the [Architecture Guide](./ARCHITECTURE.md).

---

## Developing Your Own Commands  

If you want to start developing your own commands, read the [short guide on the core API](./docs/developer/README.md). For a deeper understanding of the architecture and design patterns, see the [Architecture Guide](./ARCHITECTURE.md).

---
