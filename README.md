# Lido Local DevNet

<img src="https://docs.lido.fi/img/logo.svg" height="90px" align="right" width="90px">

Project for launching DevNet with the Lido protocol locally. The project includes launching a new network, launching a block explorer, and deploying Lido smart contracts.

## Requirements

- Node 20+
- Docker 27+
- docker-compose V2

## Getting Started

To spin up the DevNet, simply enter the following commands:

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
./bin/run.js up-full
```

These commands will launch a new network, including the Blockscout explorer and Dora CL explorer, and deploy protocol smart contracts.

To stop the DevNet, simply enter the command:

```sh
./bin/run.js stop
```

This command will properly delete the state of all services and restart them.

## Available Services

To get the current links to the available services, enter the command:

```sh
./bin/run.js network info
```

This command will provide you with the most up-to-date information on the available network services.
