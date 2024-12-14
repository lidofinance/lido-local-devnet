# Lido Local DevNet

<img src="https://docs.lido.fi/img/logo.svg" height="90px" align="right" width="90px">

Project for launching DevNet with the Lido protocol locally. The project includes launching a new network, launching a block explorer, and deploying Lido smart contracts.

## Requirements

* Node 20+
* Docker 27+
* docker-compose V2

## Getting Started

> [!WARNING]
> The project is currently under development, automatic deployment of smart contracts has not yet been implemented.


To spin up the DevNet, simply enter the command:

```sh
git submodule init
```

```sh
git submodule update
```

```sh
yarn
```

```sh
./gradlew start
```

This command will launch a new network, Blockscout explorer and Dora CL explorer.

To restart the DevNet, simply enter the command:

```sh
./gradlew restart
```

To stop the DevNet, simply enter the command:

```sh
./gradlew stop
```

This command will properly delete the state of all services and restart them.

## Available Services

- Execution Layer: http://localhost:8545
- Consensus Layer: http://localhost:3500
- Blockscout: http://localhost:3080
- Dora: http://localhost:3070
