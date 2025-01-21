# Lido Local DevNet  

<img src="https://docs.lido.fi/img/logo.svg" height="90px" align="right" width="90px">

A project for launching a DevNet with the Lido protocol locally. The project includes starting a new network, launching a block explorer, and deploying Lido smart contracts.

> [!WARNING]
> This is an alpha version of the project. Stay tuned for updates.

---

### Requirements  

- **Node** 20+ ([Install Node.js](https://nodejs.org/))  
- **Docker** 27+ ([Install Docker](https://www.docker.com/))  
- **Docker Compose** V2 ([Install Docker Compose](https://docs.docker.com/compose/))  
- **Kurtosis** ([Install Kurtosis](https://www.kurtosistech.com/))  
- **Foundry tools** ([Install Foundry](https://book.getfoundry.sh/getting-started/installation))  
- **Just** ([Install Just](https://github.com/casey/just))  

---

### Getting Started  

Follow these steps to spin up the DevNet:  

1. **Start the Kurtosis instance**  
   This is required for launching Ethereum nodes:  
   ```sh
   kurtosis engine start
   ```  

2. **Install project dependencies**:  
   ```sh
   yarn && yarn submodule
   ```  

3. **Install subdependencies of the project**:  
   ```sh
   ./bin/run.js install
   ```  

4. **Launch the environment and deploy Lido smart contracts**:  
   ```sh
   ./bin/run.js up --full
   ```  
   Optionally, use the `--verify` flag to deploy smart contracts with verification on the block explorer:  
   ```sh
   ./bin/run.js up --full --verify
   ```  

5. **Initiate aragon voting that enables Pectra supporting in the Lido protocol**  

   Since the voting scripts use Python and Brownie, install the required dependencies:  
   ```sh
   ./bin/run.js voting install
   ```  
   If you encounter errors, install additional modules as prompted.

   Next, add an account. Unfortunately, Brownie cannot fetch account settings automatically, but we provide an easy-to-use console interface for automation. Simply run the following command and enter the private key displayed in the logs:  
   ```sh
   ./bin/run.js voting add-account
   ```  

   After adding the account, initiate the first stage of transitioning the protocol to the Pectra hard fork:  
   ```sh
   ./bin/run.js voting enact-before-pectra
   ```  

   Once the initial stage is complete, finalize the transition by executing the second stage of the voting process:  
   ```sh
   ./bin/run.js voting enact-after-pectra
   ```  

6. **Launch validators**  

   After completing the `up` command, launch the validators with:  
   ```sh
   ./bin/run.js validator up
   ```  

   Ensure the validators have started without issues by checking the logs:  
   ```sh
   ./bin/run.js validator logs
   ```  

   On Linux, you may encounter access issues with the validator keys. To fix this, run:  
   ```sh
   chown -R 1000:1000 artifacts/validator
   ```  
   This issue will be resolved in a future release.  

7. **Done!**  
   You have successfully launched the network, infrastructure, and protocol locally.  

---

### Stopping the DevNet  

To stop the DevNet, run the following commands:  
```sh
./bin/run.js validator down
./bin/run.js kapi down
./bin/run.js oracles down
./bin/run.js stop
```  
These commands will properly delete the state of all services and restart them.  

---

### Available Services  

To get the current links to available services, run:  
```sh
./bin/run.js network info
```  
This will provide the most up-to-date information on available network services.  

---

### Voluntary Exit Command  

To initiate a voluntary exit for a validator from the protocol, use the following command:  
```sh
./bin/run.js validator exit --mtype <MNEMONIC_TYPE> --index <VALIDATOR_INDEX>
```

#### Flags
- `--mtype`: *(required)*
  Specifies the mnemonic type to use.
  Options:
  - `genesis` - Use the mnemonic from the genesis configuration.
  - `generated` - Use a newly generated mnemonic.

- `--index`: *(required)*
  Specifies the index of the validator to exit.

#### Example Usage
If you want to exit a validator with index `42` using the `genesis` mnemonic, run:
```sh
./bin/run.js validator exit --mtype genesis --index 42
```
