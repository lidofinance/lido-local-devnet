# Lido Local DevNet

<img src="https://docs.lido.fi/img/logo.svg" height="90px" align="right" width="90px">

Project for launching DevNet with the Lido protocol locally. The project includes launching a new network, launching a block explorer, and deploying Lido smart contracts.

## Getting Started

> [!WARNING]
> The project is currently under development, automatic deployment of smart contracts has not yet been implemented.

To launch the environment, simply enter the command:

```sh
./scripts/start.sh
```

This command will launch a new network and Blockscout.

To restart the network, simply enter the command:

```sh
./scripts/restart.sh
```

This command will properly delete the state of all services and restart them.

## Available Services

- Execution Layer: http://localhost:8545
- Consensus Layer: http://localhost:3500
- Blockscout: http://localhost:3080