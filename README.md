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
- **Kurtosis** ([Install Kurtosis](https://www.kurtosistech.com/))  
- **Foundry tools** ([Install Foundry](https://book.getfoundry.sh/getting-started/installation))  
- **Just** ([Install Just](https://github.com/casey/just))  
- **Make** 4+  
- **Kubectl** v1.32.7 (for k8s deployments)
- **Helm** 3.17+ (for k8s deployments) 

---

## Getting Started

Follow these steps to set up the DevNet:

### 1. Start Kurtosis
Kurtosis is required to launch Ethereum nodes:
```sh
kurtosis engine start
```

### 2. Install dependencies
```sh
yarn && yarn build:all
```

### 3. Launch the environment and deploy Lido smart contracts
Below is an example for launching the `pectra` test stand. If you need a different setup, refer to the [test stands documentation](./docs/commands/stands.md).

```sh
./bin/run.js stands pectra --full
```
For contract verification, use the `--verify` flag:
```sh
./bin/run.js stands pectra --full --verify
```
For a full DSM infrastructure deployment, add the `--dsm` flag:
```sh
./bin/run.js stands pectra --full --verify --dsm
```

### 4. Interaction with Voting scripts


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

### 5. Done!
The network, infrastructure, and protocol have been successfully launched.

---

## Stopping the DevNet
To stop the DevNet and remove all services, run:
```sh
./bin/run.js down
```

---

## Running Multiple Environments

To run multiple environments on a single machine, use the `--network <custom-network-name>` flag:
```sh
./bin/run.js stands pectra --full --network test-pectra1
```
> **Note:** The `--network test-pectra1` flag must be used with all subsequent commands to interact with the specified environment.

---

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
