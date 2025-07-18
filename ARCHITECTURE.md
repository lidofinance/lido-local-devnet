# Lido Local DevNet Architecture Guide

## Project Overview

Lido Local DevNet is a comprehensive tool for deploying and testing the Lido protocol in a local Ethereum network. The project provides a complete development environment with Ethereum nodes, Lido smart contracts, oracles, and auxiliary services.

## Project Architecture

### 1. Monorepo Structure

The project is organized as a monorepo using Yarn workspaces:

```
replace-submodules/
├── packages/              # Core packages
│   ├── command/          # Command framework
│   ├── services/         # Service management
│   ├── state/           # State management
│   ├── key-manager-api/ # Key management API
│   ├── keygen/          # Validator key generation
│   └── cl-client/       # Consensus layer utilities
├── src/
│   ├── commands/        # All CLI commands
│   └── index.ts        # Entry point
└── artifacts/          # Generated artifacts
```

### 2. Core Components

#### 2.1 Command System

The project uses a command pattern based on OCLIF (Open CLI Framework):

**Command Types:**
- `cli` - regular user-facing commands
- `hidden` - hidden internal commands
- `isomorphic` - commands callable from both CLI and API

**Command Structure:**
```typescript
export const MyCommand = command.cli({
  description: "Command description",
  params: {
    paramName: Params.string({ description: "Parameter description" })
  },
  async handler({ dre, params }) {
    // Command implementation
  }
});
```

**Command Categories:**
- `chain` - blockchain management
- `lido-core` - Lido deployment and management
- `csm` - Community Staking Module
- `voting` - voting and governance
- `validator` - validator management
- `oracle` - oracle management
- `stands` - pre-configured test stands

#### 2.2 Service System

Services represent external system components. The core idea of services is to encapsulate work with external repositories and Docker containers through a unified interface.

**Service Concept:**
- Each service = separate repository or system component
- Automatic cloning and version management
- Isolation in separate artifact directories
- Lifecycle management through Docker
- Typed access to files and commands

**Service Types:**
1. **Remote repositories** - cloned from Git
2. **Local workspaces** - use local directories
3. **Hybrid** - remote repository with local overrides

**Registered Services:**
- `lidoCore` - core Lido contracts
- `lidoCLI` - CLI for Lido operations
- `kurtosis` - Ethereum network orchestration
- `csm` - Community Staking Module
- `kapi` - Keys API service
- `oracle` - oracle services
- `voting` - voting scripts
- `assertoor` - testing framework
- `council` - Council daemon
- `dataBus` - data bus
- `dsmBots` - Deposit Security Module bots
- `blockscout` - block explorer

**Service Configuration:**
```typescript
{
  repository: {        // Git repository
    url: "https://...",
    branch: "main"
  },
  envs: {},           // Environment variables
  exposedPorts: [],   // Exposed ports
  dockerLabels: {},   // Docker labels
  hooks: {            // Lifecycle hooks
    install: "command-name"
  }
}
```

#### 2.3 DevNetRuntimeEnvironment (DRE)

DRE is the central context object available in all commands:

- `dre.state` - access to state management
- `dre.services` - access to all services
- `dre.network` - network information
- `dre.logger` - logging
- `dre.runCommand()` - programmatic command execution

#### 2.4 State Management

The state management system is based on JSON files with typed access through Zod schemas.

**State Architecture:**
- `State` class provides typed access methods
- `JsonDb` - low-level JSON storage with dot-notation support
- Data validation through Zod schemas
- Separation into multiple files by purpose

**config.yaml Override Logic:**

When retrieving data, the system uses a cascading priority:
1. **First checks config.yaml** - static configuration from file
2. **Then state.json** - dynamic state written by commands
3. **config.yaml takes precedence** - if a value exists in config, it overrides state

```typescript
// In BaseState's getProperties method
for (const key in keys) {
  const dbPath = keys[key];
  // First take from config (groupConfig), then from DB (reader.get)
  result[key] = (groupConfig as any)[key] ?? reader.get(dbPath);
}
```

This allows:
- Setting initial values via config.yaml
- Overriding values in config.yaml for testing
- Saving runtime data in state.json
- Automatic application of config.yaml values on restart

**State Files:**
```
artifacts/network-name/
├── state.json                     # Main state (contracts, configs)
├── validators.json                # Validator data
└── parsed_consensus_genesis.json  # Consensus genesis state
```

**Typed Access:**
```typescript
// Get Lido configuration
const lido = await dre.state.getLido();
// lido.accountingOracle, lido.stakingRouter, etc.

// Get chain configuration
const chain = await dre.state.getChain();
// chain.elPrivate, chain.clPublic, etc.

// Get wallets
const wallets = await dre.state.getNamedWallet();
// wallets.deployer, wallets.oracles, etc.
```

**Data Structure:**
- Chain configuration (EL/CL endpoints)
- Lido and CSM contract addresses
- Validator data (deposit data, keystores)
- Wallet information
- Service metadata

**State Example:**
```yaml
# config.yaml
chain:
  clPrivate: "http://localhost:4000"  # Overrides value in state.json

lido:
  # No static addresses - will be taken from state.json
```

When calling `getChain()`:
- `clPrivate` returns from config.yaml
- Other fields (elPrivate, elPublic, etc.) from state.json

### 3. Workflows

#### 3.1 Typical Deployment Process

1. **Start Ethereum network:**
   ```bash
   ./bin/run.js chain up
   ```

2. **Deploy Lido contracts:**
   ```bash
   ./bin/run.js lido-core deploy
   ```

3. **Activate protocol:**
   ```bash
   ./bin/run.js lido-core activate
   ```

4. **Add operators:**
   ```bash
   ./bin/run.js lido-core add-operator
   ```

5. **Start services:**
   ```bash
   ./bin/run.js oracle up
   ./bin/run.js kapi up
   ```

#### 3.2 Using Stands

Stands are pre-configured environments:

```bash
# Deploy Pectra stand
./bin/run.js stands pectra --full --verify --dsm
```

Flags:
- `--full` - full deployment of all components
- `--verify` - contract verification
- `--dsm` - enable Deposit Security Module

### 4. Extending the Project

#### 4.1 Creating a New Command

1. **Create a file in `src/commands/`:**
```typescript
// src/commands/mycommand.ts
import { command, Params } from "@devnet/command";

export const MyCommand = command.cli({
  description: "My new command",
  params: {
    name: Params.string({ 
      description: "Name to greet",
      required: false,
      default: "World"
    })
  },
  async handler({ dre, params }) {
    dre.logger.info(`Hello, ${params.name}!`);
  }
});
```

2. **Build the project:**
```bash
yarn build
```

3. **Use the command:**
```bash
./bin/run.js mycommand --name="Lido"
```

#### 4.2 Adding a New Service

1. **Register the service in `packages/services/src/index.ts`:**
```typescript
myService: {
  repository: {
    url: "https://github.com/org/repo",
    branch: "main"
  },
  envs: {
    MY_ENV: "value"
  },
  exposedPorts: [8080],
  dockerLabels: {
    "devnet.service": "myservice"
  }
}
```

2. **Create commands to manage the service:**
```typescript
// src/commands/myservice/up.ts
export const Up = command.cli({
  description: "Start my service",
  async handler({ dre }) {
    const service = dre.services.myService;
    await service.sh`docker-compose up -d`;
  }
});
```

#### 4.3 Integration with Existing Commands

To call commands from other commands, you need to explicitly import the command class and pass it to `dre.runCommand()`:

```typescript
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { KurtosisUp } from "../chain/up.js";
import { OracleUp } from "../oracles/up.js";

export const Setup = command.cli({
  description: "Full setup",
  async handler({ dre }) {
    // Call command by passing the class
    await dre.runCommand(KurtosisUp, { preset: "pectra-stable" });
    
    // Deploy contracts
    await dre.runCommand(DeployLidoContracts, { verify: true });
    
    // Start services
    await dre.runCommand(OracleUp, {});
  }
});
```

**Important:** 
- Commands are called by passing the imported class, not a string name
- Second parameter is an object with command parameters
- You can call any command type (cli, hidden, isomorphic)
- `isomorphic` commands are distinguished by being available through both CLI and API

### 5. Design Patterns

#### 5.1 Service Locator Pattern
DRE provides centralized access to services through the Service Locator pattern.

**Code Example:**
```typescript
// packages/command/src/context.ts
export interface DevNetRuntimeEnvironment {
  services: DevNetServiceRegistry;
  state: State;
  network: DevNetNetwork;
  logger: DevNetLogger;
}

// Usage in command
export const OracleUp = command.cli({
  async handler({ dre }) {
    const { services, state, logger } = dre;
    const oracle = services.oracle;  // Service Locator in action
    const chain = await state.getChain();
  }
});
```

#### 5.2 Factory Pattern
Commands are created through factory functions to unify the API.

**Code Example:**
```typescript
// packages/command/src/command.ts
export const command = {
  cli: <T extends ParamsConfig>(config: CommandConfig<T>) => {
    return new DevNetCommand(config, 'cli');
  },
  
  hidden: <T extends ParamsConfig>(config: CommandConfig<T>) => {
    return new DevNetCommand(config, 'hidden');
  },
  
  isomorphic: <T extends ParamsConfig>(config: CommandConfig<T>) => {
    return new DevNetCommand(config, 'isomorphic');
  }
};

// Using the factory
export const MyCommand = command.cli({
  description: "Deploy contracts",
  params: { verify: Params.boolean() },
  async handler({ dre, params }) { /* ... */ }
});
```

#### 5.3 Repository Pattern
State management is abstracted through a repository with typed access.

**Code Example:**
```typescript
// packages/state/src/index.ts
export class State extends BaseState {
  async getLido<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        accountingOracle: "lidoCore.accountingOracle.proxy.address",
        stakingRouter: "lidoCore.stakingRouter.proxy.address",
        // ... other properties
      },
      "lido",
      LidoConfigSchema,
      must,
    );
  }
  
  async updateLido(jsonData: unknown) {
    await this.updateProperties("lidoCore", jsonData);
  }
}

// Using the repository
const lido = await dre.state.getLido();
await dre.state.updateLido({ newContractAddress: "0x123..." });
```

#### 5.4 Command Pattern
Each command is a self-contained unit with defined parameters and handler.

**Code Example:**
```typescript
// src/commands/lido-core/deploy.ts
export const DeployLidoContracts = command.cli({
  description: "Deploy Lido contracts",
  params: {
    verify: Params.boolean({
      description: "Verify contracts on block explorer",
      default: false
    })
  },
  async handler({ dre, params }) {
    const { services, state, logger } = dre;
    
    // All logic encapsulated in the command
    logger.log("🚀 Deploying Lido contracts...");
    
    const deployArgs = params.verify ? ["--verify"] : [];
    await services.lidoCore.sh`npm run deploy ${deployArgs}`;
    
    // State update
    const deployedContracts = await services.lidoCore.readJson("deployed.json");
    await state.updateLido(deployedContracts);
    
    logger.log("✅ Lido contracts deployed successfully");
  }
});
```

#### 5.5 Builder Pattern
Complex service configurations are built through Builder pattern.

**Code Example:**
```typescript
// packages/services/src/index.ts
export const services = {
  oracle: {
    name: "oracle",
    repository: {
      url: "https://github.com/lidofinance/lido-oracle",
      branch: "main"
    },
    envs: {
      CHAIN_ID: "31337",
      CONSENSUS_RPC_URL: "${CL_PRIVATE_ENDPOINT}",
      EXECUTION_RPC_URL: "${EL_PRIVATE_ENDPOINT}"
    },
    exposedPorts: [8080, 9090],
    dockerLabels: {
      "com.kurtosistech.custom.ethereum-package.service-name": "oracle",
    },
    constants: {
      ORACLE_DAEMON_CONFIG_FILE: "oracle-daemon-config.json"
    }
  }
} as const;
```

#### 5.6 Template Method Pattern
Base command logic is defined in `BaseState`, concrete implementations override details.

**Code Example:**
```typescript
// packages/state/src/base-state.ts
export abstract class BaseState {
  protected async getProperties<T, M extends boolean>(
    keys: { [K in keyof T]: string },
    group: keyof Config,
    schema: ZodSchema<T>,
    must: M,
  ): Promise<M extends true ? T : Partial<T>> {
    // Template method - common logic for all inheritors
    const reader = await this.appState.getReader();
    const result: Partial<T> = {};
    const groupConfig = this.config[group] || {};

    for (const key in keys) {
      const dbPath = keys[key];
      result[key] = (groupConfig as any)[key] ?? reader.get(dbPath);
    }
    
    return schema.parse(result);
  }
}

// Concrete implementations in State class
export class State extends BaseState {
  async getLido() {
    return this.getProperties(/* Lido-specific parameters */);
  }
  
  async getCSM() {
    return this.getProperties(/* CSM-specific parameters */);
  }
}
```

### 6. Docker Integration

The project uses Docker via `dockerode` library and integrates with Kurtosis networks.

#### 6.1 Container Discovery via Labels

The system finds containers by Docker labels from service configuration:

```typescript
// In packages/command/src/docker/index.ts
export async function getContainersByServiceLabels<T extends Record<string, string>>(
  labels: T, 
  networkName: string
): Promise<Record<keyof T, ContainerInfo[]>>

// Usage in service
const dockerInfo = await service.getDockerInfo();
// Searches for containers in `kt-${network}` network by labels from config
```

**Search Structure:**
- Uses network format `kt-${networkName}` (Kurtosis network)
- Searches by labels defined in service configuration
- Returns container information: ID, IP, name, ports

#### 6.2 Port Management

**Automatic port discovery:**
```typescript
// In DevNetService class
public async getExposedPorts(): Promise<PublicPortInfo[]> {
  const { exposedPorts } = this.config;
  const info = await Promise.all(
    exposedPorts.map(async (port) =>
      getServiceInfo(port, `kt-${this.network}`)
    )
  );
  return validInfo;
}
```

**Usage example (blockscout/up.ts):**
```typescript
const [info] = await blockscout.getExposedPorts();
const apiHost = `localhost:${info.publicPort}`;
const publicUrl = `http://${apiHost}`;

// Save URL to state
await state.updateBlockScout({ url: publicUrl, api: `${publicUrl}/api` });
```

#### 6.3 Command Execution in Service Context

**Shell integration with environment variables:**
```typescript
// Service has sh method with automatic variable substitution
const blockScoutSh = blockscout.sh({
  env: {
    BLOCKSCOUT_RPC_URL: elPrivate,
    BLOCKSCOUT_WS_RPC_URL: elWsPrivate,
    DOCKER_NETWORK_NAME: `kt-${network.name}`,
    COMPOSE_PROJECT_NAME: `blockscout-${network.name}`,
  },
});

await blockScoutSh`docker compose -f ./geth.yml up -d`;
```

#### 6.4 Kurtosis Integration

**Special work with Kurtosis networks:**
- All Docker operations happen in `kt-${networkName}` network
- Kurtosis creates this network automatically on startup
- Services get Ethereum node information through Docker API

```typescript
// Get node information from Kurtosis
const kurtosisInfo = await kurtosis.getDockerInfo(false);
const { cl, el, vc } = await kurtosis.getDockerInfo();
```

#### 6.5 Container Information

**ContainerInfo Structure:**
```typescript
interface ContainerInfo {
  id: string;           // Docker container ID
  ip: string;           // IP in Docker network
  name: string;         // Container name
  client: string;       // Client type (from Kurtosis labels)
  ports: {
    privatePort?: number;   // Port inside container
    privateUrl?: string;    // http://ip:privatePort
    publicPort?: number;    // Port on host
    publicUrl?: string;     // http://localhost:publicPort
  }[];
}
```

#### 6.6 Network Isolation

**Network isolation:**
- Each DevNet network (`--network` flag) uses separate Kurtosis network
- Format: `kt-${networkName}` 
- Containers in same network can communicate via internal IPs
- Public ports are mapped to localhost for host access

### 7. Configuration

#### 7.1 Main Configuration
- `config.yml` - main configuration file
- Support for multiple networks via `--network` flag

#### 7.2 Network Configuration Structure
```yaml
networks:
  default:
    chainPrivateEndpoint: "http://..."
    chainPublicEndpoint: "http://..."
    clPrivateEndpoint: "http://..."
    clPublicEndpoint: "http://..."
```

### 8. Debugging and Development

#### 8.1 Logging System

**DevNetLogger class** provides color-coded logging with network and command identification:

```typescript
// packages/command/src/logger.ts
export class DevNetLogger {
  constructor(network: string, commandName: string) {
    this.network = network;
    this.commandName = commandName;
    this.color = DevNetLogger.getColor(network, commandName);
  }
}
```

**Logging Methods:**
```typescript
// Regular message
dre.logger.log("✅ Contract deployed successfully");

// Error (red color)
dre.logger.error("Failed to deploy contract");

// Warning (yellow color)  
dre.logger.warn("Using default configuration");

// JSON object with formatting
dre.logger.logJson({ address: "0x123...", txHash: "0xabc..." });

// Table
dre.logger.table(
  ["Service", "Status"], 
  [["Oracle", "Running"], ["KAPI", "Stopped"]]
);

// Header and footer
dre.logger.logHeader("Starting deployment");
dre.logger.logFooter("Deployment completed");
```

**Color Coding:**
- Each `network/command` combination gets a unique color
- Color generated by hashing the string `${network}/${commandName}`
- Uses `||` prefix to identify log source

**Log Examples:**
```
|| Starting Lido deployment...     # network=default, command=lido-core:deploy
|| ✅ Contract deployed at 0x123... 
|| Oracle service is starting...   # network=default, command=oracle:up
```

#### 8.2 Error Handling

**DevNetError class** for typed errors:
```typescript
// packages/command/src/error.ts
export class DevNetError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "DevNetError";
    this.cause = cause;
  }
}
```

**Error handling patterns:**
```typescript
// Assertions
assert(
  contractAddress !== undefined,
  "Contract address not found in state"
);

// Try-catch with typed errors
try {
  const result = await service.getDockerInfo();
} catch (error) {
  if (error instanceof DevNetError) {
    logger.error(`Service error: ${error.message}`);
  }
  throw error;
}
```

#### 8.3 Debug Commands

**Information commands:**
```bash
# Network information
./bin/run.js chain info

# DevNet configuration
./bin/run.js config

# Service status via Docker
./bin/run.js assertoor info  # Test information
```

**Log commands:**
```bash
# Oracle service logs
./bin/run.js oracle logs

# KAPI service logs  
./bin/run.js kapi logs

# Council daemon logs
./bin/run.js council logs

# DSM bots logs
./bin/run.js dsm-bots logs
```

#### 8.4 Testing

**Test structure:**
```bash
# Run all tests
yarn test

# Run tests for specific package
yarn test packages/keygen

# Key generation tests
yarn test packages/keygen/tests/generateDepositData.test.ts
```

**Test infrastructure:**
- Unit tests for key components
- Fixtures in `tests/fixtures/`
- Integration tests through Assertoor framework

#### 8.5 Development Tools

**Shell access to services:**
```typescript
// Execute commands in service context
await service.sh`ls -la`;
await service.sh`cat docker-compose.yml`;

// With additional environment variables
await service.sh({ env: { DEBUG: "true" } })`npm run start`;
```

**Service file operations:**
```typescript
// Read files
const config = await service.readFile("config.json");
const dockerCompose = await service.readFile("docker-compose.yml");

// Write files
await service.writeFile("custom-config.json", JSON.stringify(config));

// Create directories
await service.mkdirp("data/logs");
```

### 9. Best Practices

1. **Use type safety** - the project is fully TypeScript
2. **Validate input data** through Zod schemas
3. **Compose commands** for complex operations
4. **Document commands** in descriptions
5. **Rebuild after changes** - run `yarn build` after code changes
6. **Clear artifacts when changing configuration** - delete files in `artifacts/` to apply changes
7. **Isolate networks** via `--network` flag for parallel work

### 10. Useful Commands

```bash
# View all available commands
./bin/run.js --help

# Current network configuration
./bin/run.js config

# Chain information
./bin/run.js chain info

# Stop all services
./bin/run.js down
```

### 11. Important Notes

**During Development:**
- After changing TypeScript code, always run `yarn build` or `yarn build:all`
- When changing service configuration, delete the `artifacts/network-name/service-name` directory to apply changes
- When changing state directly in JSON files, restart the corresponding services

**Artifacts Structure:**
```
artifacts/
└── network-name/
    ├── state.json              # Network state
    ├── validators.json         # Validator data
    ├── chain/                  # Kurtosis artifacts
    ├── lidoCore/               # Lido Core service
    ├── csm/                    # CSM service
    ├── oracle/                 # Oracle service
    └── ...                     # Other services
```
