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

### Next steps

1. **Key Generation**:
   - To generate keys, enter the following command:
   ```sh
   ./bin/run.js lido keys generate
   ```
   After this, the keys will be created in the `artifacts/validator` directory.
   Important! Do not delete files from this directory.

2. **Using the Keys in the Module**:
   - To use the keys, enter this command:
   ```sh
   ./bin/run.js lido keys use --name my_awesome_operator
   ```
   Next, navigate to the Lido-CLI directory:
   ```sh
   cd ofchain/lido-cli
   ```
   Add the module:
   ```sh
   ./run.sh nor add-operator -n <NAME> -a <ADDRESS>
   ```
   And connect your new keys:
   `generated-keys/my_awesome_operator.json` — this is the path to the key file, which is automatically generated when you run:
   ```sh
   ./bin/run.js lido keys use --name my_awesome_operator
   ```
   ```sh
   ./run.sh nor add-keys-from-file <OPERATOR_ID> generated-keys/my_awesome_operator.json
   ```
   If you need to add more keys, you can repeat this process as many times as necessary, with different validators.

3. **Deposit**:
   - To complete the deposit process, follow the steps in this guide: https://hackmd.io/@george-avs/HkYfg3GHyx#Increase-Staking-Limit, starting with the `Increase-Staking-Limit` section.

4. **Validator Launch**:
   - After the deposit, wait approximately 10 minutes.
   - Once the deposit is completed, enter the following command to create a validator configuration:
   ```sh
   ./bin/run.js lido create-validator-config
   ```
   This command will create a configuration file at `devnet-dc/validator-teku/docker-compose.yaml`.
   
   You can then launch this configuration using the command:
   ```sh
   ./bin/run.js validator up
   ```
   To stop the validators, use the command:
   ```sh
   ./bin/run.js validator down
   ```

### To Stop the DevNet

To stop the DevNet, simply enter the command:
```sh
./bin/run.js stop
./bin/run.js validator down
```
This command will properly delete the state of all services and restart them.

### Available Services

To get the current links to the available services, enter the command:
```sh
./bin/run.js network info
```
This command will provide you with the most up-to-date information on the available network services.

