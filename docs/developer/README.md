# Developer Documentation

## Architecture

The project consists of commands implemented using an internal framework inspired by the Hardhat architecture. Each command can be executed in different environments (`--network name`). This is achieved using [`DevNetRuntimeEnvironment`](../../packages/command/src/runtime-env.ts), similar to `HardhatRuntimeEnvironment`. Essentially, it follows the **service locator pattern**, which adapts based on the specified network (`--network name`).

The core logical components of `DevNetRuntimeEnvironment` (referred to as `dre`) are **services** and **state**.

---

## What Is State?

Some commands require functionality to **store or reuse state** from other services. It is also important to ensure this is done **strictly**, with validation and types. For this purpose, the [state module](../../packages/state/src/index.ts) was created.

### Example: `getDataBus` Method

The method below demonstrates a key feature of the state module:

```ts
async getDataBus<M extends boolean = true>(must: M = true as M) {
  return this.getProperties(
    {
      address: "dataBus.contract.address",
    },
    "dataBus",
    DataBusConfigSchema,
    must,
  );
}
```

The `getProperties` method **reads data from two sources**:
1. `config.yml` – (this functionality will be documented later).
2. The main state file `artifacts/network-name/state.json`, using **dot notation** (e.g., `"dataBus.contract.address"`).

### Updating the State

To add or modify state, **edit** the [state module](../../packages/state/src/index.ts). The updated state will then be **available in all commands** via `dre.state...`.

---

## What Are Services?

In the context of commands, **services** are isolated environments created for each specified network (`--network name`). A service can be:

- A repository containing commands (e.g., `lido-cli`, `lido-core`).
- A repository for infrastructure (e.g., `blockscout`).
- A remote infrastructure repository (e.g., `kapi`, `oracles`).

---

## Three Main Use Cases

### 1. Remote Service with Scripts

```ts
const lidoCLI = new DevNetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/lido-cli.git",
    branch: "feature/devnet-command",
  },
  name: "lidoCLI" as const,
  constants: {
    DEPLOYED_NETWORK_CONFIG_PATH: "configs/deployed-local-devnet.json",
    DEPLOYED_NETWORK_CONFIG_NAME: "deployed-local-devnet.json",
    DEPLOYED_NETWORK_CONFIG_EXTRA_PATH: "configs/extra-deployed-local-devnet.json",
    ENV_CONFIG_PATH: ".env",
  },
  env: {
    LIDO_CLI_NON_INTERACTIVE: "true",
  },
  hooks: {
    install: "lido-cli:install",
  },
  labels: {},
});
```

This service is a **remote Git repository** that **does not** support overrides (`workspaces`). When a command is executed for the first time, the repository is **cloned** into the `artifacts` folder under the name specified in the `name` field. It is then **strongly typed** and accessible in any command:

```ts
import { command } from "@devnet/command";

export const ExampleCommand = command.cli({
  description: "Example command",
  params: {},
  async handler({ dre }) {
    const { services } = dre;
    const { lidoCLI } = services;

    // 1. Execute shell commands
    await lidoCLI.sh`bash -c yarn`;

    // 2. Write methods
    await lidoCLI.writeENV("./somePath", {});
    await lidoCLI.writeFile("./somePath", "");
    await lidoCLI.writeYaml("./somePath", {});
    await lidoCLI.writeJson("./somePath", {});

    // 3. Read methods
    await lidoCLI.readFile("./somePath");
    await lidoCLI.readJson("./somePath");
    await lidoCLI.readYaml("./somePath");

    // 4. Docker integration
    await lidoCLI.getDockerInfo();
  },
});
```

#### Key Features:
- **Shell execution (`sh`)**: Allows executing shell commands relative to the **service** and **network**.
- **File operations (`write*`, `read*`)**: Ensures proper file handling, future-proofing for Docker-based services.
- **Docker integration (`getDockerInfo`)**: Retrieves **active container information** for the service.

---

### 2. Local Service

```ts
const blockscout = new DevNetServiceConfig({
  workspace: "workspaces/blockscout",
  name: "blockscout" as const,
  exposedPorts: [80],
  constants: {},
  labels: { blockscout: "devnet_service_name=blockscout" },
});
```

In this example, we use **only a workspace**, without a `repository`.

#### Repository vs. Workspace:
- **`repository`** – A **remote** Git repository that will be cloned if specified.
- **`workspace`** – A **local** directory overlaid on top of the repository. If no repository is specified, only the workspace is used.

This provides **flexibility** to:
- Use remote repositories.
- Define local services.
- Override parts of an existing repository with a workspace.

#### Example Command with Blockscout Service:
```ts
import { command } from "@devnet/command";

export const BlockscoutUp = command.cli({
  description: "Start Blockscout",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      network,
      services: { blockscout },
    } = dre;

    // Retrieve network state
    const { elPrivate, elWsPrivate } = await state.getChain();

    // Define environment variables
    const blockScoutSh = blockscout.sh({
      env: {
        BLOCKSCOUT_RPC_URL: elPrivate,
        BLOCKSCOUT_WS_RPC_URL: elWsPrivate,
        DOCKER_NETWORK_NAME: `kt-${network.name}`,
        COMPOSE_PROJECT_NAME: `blockscout-${network.name}`,
      },
    });

    // Start Docker Compose
    await blockScoutSh`docker compose -f ./geth.yml up -d`;

    // Retrieve exposed ports
    const [info] = await blockscout.getExposedPorts();
    const apiHost = `localhost:${info.publicPort}`;
    const publicUrl = `http://${apiHost}`;

    logger.log("Restart the frontend instance to pass the actual public URL");

    // Update environment variables
    await blockScoutSh({
      env: { NEXT_PUBLIC_API_HOST: apiHost, NEXT_PUBLIC_APP_HOST: apiHost },
    })`docker compose -f geth.yml up -d frontend`;

    logger.log(`Blockscout started successfully on URL: ${publicUrl}`);

    // Update service state
    await state.updateBlockScout({ url: publicUrl, api: `${publicUrl}/api` });
  },
});
```

---

### 3. Remote Service with Workspace Overrides

A good example is the `kapi` service:

```ts
const kapi = new DevNetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/lido-keys-api.git",
    branch: "feat/devnet",
  },
  workspace: "workspaces/kapi",
  name: "kapi" as const,
  exposedPorts: [9030],
  constants: {
    DB_HOST: "127.0.0.1",
    DB_NAME: "node_operator_keys_service_db",
    DB_PASSWORD: "postgres",
    DB_PORT: "5432",
    DB_USER: "postgres",
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
    MIKRO_ORM_DISABLE_FOREIGN_KEYS: "false",
    PORT: "9030",
    PROVIDER_BATCH_AGGREGATION_WAIT_MS: "10",
    PROVIDER_CONCURRENT_REQUESTS: "1",
    PROVIDER_JSON_RPC_MAX_BATCH_SIZE: "100",
    VALIDATOR_REGISTRY_ENABLE: "false",
  },
  labels: { kapi: "devnet_service_name=kapi" },
});
```

#### Workflow:
1. The **repository is cloned** first.
2. Files from **`workspaces/kapi`** are copied over the cloned repository.

Since **`labels`** are defined, we can find the corresponding Docker container using:

```ts
const info = await kapi.getDockerInfo();
// const info: Record<"kapi", ContainerInfo[]>
```

---

## Conclusion

At this point, you have everything needed to **create and manage services** within the project. You can now **add your own services** in the [services module](../../packages/services/src/index.ts). 🚀
