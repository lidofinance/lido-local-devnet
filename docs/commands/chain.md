`./bin/run.js chain`
====================

Command set for managing EL (Execution) and CL (Consensus) nodes.

The `chain up` command is the main entry point that routes to one of three sub-commands based on the `--mode` flag:

* [`./bin/run.js chain up`](#binrunjs-chain-up) — Router for node source modes
* [`./bin/run.js chain kurtosis-up`](#binrunjs-chain-kurtosis-up) — Launch nodes via Kurtosis
* [`./bin/run.js chain self-hosted-up`](#binrunjs-chain-self-hosted-up) — Deploy EL/CL nodes in K8s via Helm
* [`./bin/run.js chain external-up`](#binrunjs-chain-external-up) — Attach to external nodes
* [`./bin/run.js chain fetch-network-config`](#binrunjs-chain-fetch-network-config) — Download network config from ethpandaops
* [`./bin/run.js chain artifacts`](#binrunjs-chain-artifacts)
* [`./bin/run.js chain down`](#binrunjs-chain-down)
* [`./bin/run.js chain fork`](#binrunjs-chain-fork)
* [`./bin/run.js chain info`](#binrunjs-chain-info)
* [`./bin/run.js chain update`](#binrunjs-chain-update)
* [`./bin/run.js chain wallet-sync-from-k8s-configmap`](#binrunjs-chain-wallet-sync-from-k8s-configmap)
* [`./bin/run.js chain wallet-sync-to-k8s-configmap`](#binrunjs-chain-wallet-sync-to-k8s-configmap)
* [`./bin/run.js chain state-sync-from-k8s-configmap`](#binrunjs-chain-state-sync-from-k8s-configmap)
* [`./bin/run.js chain state-sync-to-k8s-configmap`](#binrunjs-chain-state-sync-to-k8s-configmap)

## `./bin/run.js chain up`

Router command that launches nodes using one of the three source modes.

```
USAGE
  $ ./bin/run.js chain up [--network <value>] [--mode <value>] [--preset <value>]
    [--elClient <value>] [--clClient <value>] [--elImage <value>] [--clImage <value>]
    [--genesisSSZUrl <value>] [--checkpointSyncUrl <value>]
    [--elUrl <value>] [--clUrl <value>] [--elWsUrl <value>]

FLAGS
  --network=<value>          [default: my-devnet] Name of the network
  --mode=<value>             [default: kurtosis] Node source mode: kurtosis | self-hosted | external
  --preset=<value>           Kurtosis config name (for kurtosis mode)
  --elClient=<value>         [default: geth] EL client: geth | reth (for self-hosted mode)
  --clClient=<value>         [default: lighthouse] CL client: lighthouse | prysm | teku (for self-hosted mode)
  --elImage=<value>          Custom Docker image for EL node (for self-hosted mode)
  --clImage=<value>          Custom Docker image for CL node (for self-hosted mode)
  --genesisSSZUrl=<value>    URL to download genesis.ssz (for large files >1MB)
  --checkpointSyncUrl=<value> Checkpoint sync URL for CL client
  --elUrl=<value>            EL RPC URL (for external mode)
  --clUrl=<value>            CL API URL (for external mode)
  --elWsUrl=<value>          EL WebSocket URL (for external mode)

DESCRIPTION
  Routes to the appropriate sub-command based on --mode:
  - kurtosis: Launches a full Kurtosis enclave (default)
  - self-hosted: Deploys EL/CL nodes in K8s via Helm charts
  - external: Attaches to already running external nodes
```

## `./bin/run.js chain kurtosis-up`

Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.

```
USAGE
  $ ./bin/run.js chain kurtosis-up [--network <value>] [--preset <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --preset=<value>   Kurtosis config name

DESCRIPTION
  Launches an Ethereum network via Kurtosis using the specified preset configuration.
  Downloads genesis artifacts and stores node endpoints in the state.
```

## `./bin/run.js chain self-hosted-up`

Deploys EL and CL nodes in Kubernetes using Helm charts (`lido-el-node`, `lido-cl-node`).

```
USAGE
  $ ./bin/run.js chain self-hosted-up [--network <value>]
    [--elClient <value>] [--clClient <value>]
    [--elImage <value>] [--clImage <value>]
    [--genesisSSZUrl <value>] [--checkpointSyncUrl <value>]

FLAGS
  --network=<value>          [default: my-devnet] Name of the network
  --elClient=<value>         [default: geth] EL client: geth | reth
  --clClient=<value>         [default: lighthouse] CL client: lighthouse | prysm | teku
  --elImage=<value>          Custom Docker image for EL (overrides chart defaults)
  --clImage=<value>          Custom Docker image for CL (overrides chart defaults)
  --genesisSSZUrl=<value>    URL to download genesis.ssz via init container
  --checkpointSyncUrl=<value> Checkpoint sync URL for the CL client

DESCRIPTION
  Deploys EL and CL nodes as Helm releases in a dedicated K8s namespace (kt-<network>).

  For known networks (hoodi, holesky, mainnet):
  - Uses built-in network configuration
  - No genesis files needed

  For custom networks:
  - Reads genesis files from artifacts/<stand>/network-config/
  - Required: genesis.json, config.yaml
  - Optional: genesis.ssz (or use --genesisSSZUrl for large files)
  - Optional: enodes.txt, bootstrap_nodes.yaml (for bootnode discovery)
  - Uploads config as K8s ConfigMap (files >900KB are skipped, use --genesisSSZUrl)
  - Uses --syncmode=full for geth (instead of snap)
  - Automatically reads bootnodes from enodes.txt and bootstrap_nodes.yaml

  For ePBS devnets (Gloas fork):
  - Use Prysm with -sync tag (Lighthouse has sync stall at Gloas fork boundary)
  - Lighthouse automatically gets --epochs-per-migration=99999
```

## `./bin/run.js chain external-up`

Attaches to already running external EL/CL nodes.

```
USAGE
  $ ./bin/run.js chain external-up [--network <value>]
    [--elUrl <value>] [--clUrl <value>] [--elWsUrl <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --elUrl=<value>    EL JSON-RPC URL (required)
  --clUrl=<value>    CL Beacon API URL (required)
  --elWsUrl=<value>  EL WebSocket URL (optional)

DESCRIPTION
  Saves external node endpoints to the state without deploying anything.
  Useful for connecting to existing infrastructure or managed node services.
```

## `./bin/run.js chain fetch-network-config`

Downloads network configuration files from the ethpandaops GitHub repositories.

```
USAGE
  $ ./bin/run.js chain fetch-network-config [--network <value>]
    [--repo <value>] [--devnet <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network
  --repo=<value>     Repository name: epbs-devnets | pectra-devnets | fusaka-devnets
  --devnet=<value>   Devnet name within the repo (e.g., devnet-0, devnet-2)

DESCRIPTION
  Downloads genesis.json, config.yaml, genesis.ssz, enodes.txt, bootstrap_nodes.yaml
  and other network config files from the ethpandaops GitHub.

  Files are saved to artifacts/<stand>/network-config/.

  Validates that required files (genesis.json, config.yaml) were downloaded.
  Warns if genesis.ssz exceeds K8s ConfigMap 1MB limit (use --genesisSSZUrl).

EXAMPLES
  $ ./bin/run.js chain fetch-network-config --repo epbs-devnets --devnet devnet-0
  $ ./bin/run.js chain fetch-network-config --repo fusaka-devnets --devnet devnet-2
```

## `./bin/run.js chain artifacts`

Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.

```
USAGE
  $ ./bin/run.js chain artifacts [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.
```

## `./bin/run.js chain down`

Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.

```
USAGE
  $ ./bin/run.js chain down [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.
```

## `./bin/run.js chain fork`

Start Anvil in fork mode connected to a specified Ethereum node

```
USAGE
  $ ./bin/run.js chain fork [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Start Anvil in fork mode connected to a specified Ethereum node
```

## `./bin/run.js chain info`

Retrieves and displays information about the Kurtosis enclave.

```
USAGE
  $ ./bin/run.js chain info [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Retrieves and displays information about the Kurtosis enclave.
```

## `./bin/run.js chain update`

Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the local JSON database.

```
USAGE
  $ ./bin/run.js chain update [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the
  local JSON database.
```

## `./bin/run.js chain wallet-sync-from-k8s-configmap`

Syncs wallet data from a K8s ConfigMap to the local `wallets.yml` file.

```
USAGE
  $ ./bin/run.js chain wallet-sync-from-k8s-configmap [--network <value>]

DESCRIPTION
  Downloads wallet configuration from K8s ConfigMap for self-hosted/external modes.
```

## `./bin/run.js chain wallet-sync-to-k8s-configmap`

Syncs local `wallets.yml` to a K8s ConfigMap.

```
USAGE
  $ ./bin/run.js chain wallet-sync-to-k8s-configmap [--network <value>]

DESCRIPTION
  Uploads wallet configuration to K8s ConfigMap for sharing across team members.
```

## `./bin/run.js chain state-sync-from-k8s-configmap`

Syncs devnet state from a K8s ConfigMap to the local state file.

```
USAGE
  $ ./bin/run.js chain state-sync-from-k8s-configmap [--network <value>]

DESCRIPTION
  Downloads devnet state (contract addresses, endpoints) from K8s ConfigMap.
```

## `./bin/run.js chain state-sync-to-k8s-configmap`

Syncs local devnet state to a K8s ConfigMap.

```
USAGE
  $ ./bin/run.js chain state-sync-to-k8s-configmap [--network <value>]

DESCRIPTION
  Uploads devnet state to K8s ConfigMap for sharing across team members.
```
