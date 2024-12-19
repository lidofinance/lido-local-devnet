# Lido Local DevNet

<img src="https://docs.lido.fi/img/logo.svg" height="90px" align="right" width="90px">

Project for launching DevNet with the Lido protocol locally. The project includes launching a new network, launching a block explorer, and deploying Lido smart contracts.

### Requirements

- **Node** 20+ (https://nodejs.org/)
- **Docker** 27+ (https://www.docker.com/)
- **Docker-compose** V2 (https://docs.docker.com/compose/)
- **Kurtosis** (https://www.kurtosistech.com/)
- **Foundry tools**: [Get Started with Foundry](https://book.getfoundry.sh/getting-started/installation)
- **Just**: [Just on GitHub](https://github.com/casey/just)

### Getting Started

To spin up the DevNet, simply follow these commands:

1. **Start the Kurtosis instance** - This is necessary for launching Ethereum nodes:
   ```sh
   kurtosis engine start
   ```

2. **Install project dependencies**:
   ```sh
   yarn
   ```

3. **Install subdependencies of the project**:
   ```sh
   ./bin/run.js install
   ```

4. **To launch the environment and immediately deploy the protocol's smart contracts**:
   ```sh
   ./bin/run.js up --full
   ```
   Or you can use the command with the optional `--verify` flag to deploy smart contracts with verification on the block explorer
   ```sh
   ./bin/run.js up --full --verify
   ```
> ***If you use this command, proceed directly to step 7.***
5. **Alternatively, you can raise the environment without smart contracts**:
   ```sh
   ./bin/run.js up
   ```

6. **And then deploy the smart contracts separately**:
   ```sh
   ./bin/run.js onchain lido deploy
   ```
    ```sh
   ./bin/run.js onchain csm deploy
   ```

7. **After deploying the smart contracts, it is necessary to activate the protocol**:
   - This command will finalize the setup of oracles and DSM and then activate the protocol; this command requires confirmation:
   ```sh
   ./bin/run.js onchain lido activate
   ```
8. **After activating and finalizing the main protocol, you can connect the CSM Module**:
   - Use this command to activate the CSM module:
   ```sh
   ./bin/run.js onchain csm activate
   ```
9. **Next, you can deploy an additional CSVerifier for testing Pectra**:
   - Use this command to add a CSVerifier:
   ```sh
   ./bin/run.js onchain csm add-verifier
   ```
   - You can also execute this command with smart contract verification:
   ```sh
   ./bin/run.js onchain csm add-verifier --verify
   ```

10. **Done!** You have launched the network, infrastructure, and protocol locally.

### To Stop the DevNet

To stop the DevNet, simply enter the command:
```sh
./bin/run.js stop
```
This command will properly delete the state of all services and restart them.

### Available Services

To get the current links to the available services, enter the command:
```sh
./bin/run.js network info
```
This command will provide you with the most up-to-date information on the available network services.

