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

#### 5.2 Factory Pattern
Commands are created through factory functions to unify the API.

#### 5.3 Repository Pattern
State management is abstracted through a repository with typed access.

#### 5.4 Command Pattern
Each command is a self-contained unit with defined parameters and handler.

### 6. Docker Integration

The project actively uses Docker for service management:

- **Service discovery** through Docker labels
- **Container lifecycle management**
- **Port mapping** and network configuration
- **Integration with Kurtosis** for Ethereum orchestration

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

#### 8.1 Logging
- Hierarchical logging system
- Color coding by service
- Levels: debug, info, warn, error

#### 8.2 Error Handling
- Custom error types
- Detailed error context
- Graceful handling in commands

#### 8.3 Testing
```bash
# Run tests
yarn test

# Run specific test
yarn test packages/keygen
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
- When changing service configuration, delete the `artifacts/network-name/services/service-name` directory to apply changes
- When changing state directly in JSON files, restart the corresponding services

**Artifacts Structure:**
```
artifacts/
└── network-name/
    ├── state.json              # Network state
    ├── validators.json         # Validator data
    ├── chain/                  # Kurtosis artifacts
    └── services/               # Cloned repositories
        ├── lidoCore/
        ├── csm/
        └── ...
```
