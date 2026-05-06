`./bin/run.js cmv2`
==================

Command set for managing CMv2 (Curated Module v2), deploying smart contracts, and configuring the environment based on the current network state.

* [`./bin/run.js cmv2 activate`](#binrunjs-cmv2-activate)
* [`./bin/run.js cmv2 add-keys`](#binrunjs-cmv2-add-keys)
* [`./bin/run.js cmv2 add-operator`](#binrunjs-cmv2-add-operator)
* [`./bin/run.js cmv2 add-verifier`](#binrunjs-cmv2-add-verifier)
* [`./bin/run.js cmv2 build-allowlist`](#binrunjs-cmv2-build-allowlist)
* [`./bin/run.js cmv2 deploy`](#binrunjs-cmv2-deploy)
* [`./bin/run.js cmv2 install`](#binrunjs-cmv2-install)
* [`./bin/run.js cmv2 set-gate-tree`](#binrunjs-cmv2-set-gate-tree)
* [`./bin/run.js cmv2 update-state`](#binrunjs-cmv2-update-state)

## `./bin/run.js cmv2 activate`

Activates CMv2 by deploying smart contracts and configuring the environment based on the current network state.

```
USAGE
  $ ./bin/run.js cmv2 activate [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network

DESCRIPTION
  Activates CMv2 by deploying smart contracts and configuring the environment based on the current network state.
```

## `./bin/run.js cmv2 add-keys`

Generates fresh validator keys and adds them to an existing CMv2 node operator. The signer (deployer or secondDeployer) pays the bond in ETH; the only on-chain check is that the signer is the operator's `managerAddress`. Auto-batches when `--validators > --batchSize` to fit the block gas limit.

```
USAGE
  $ ./bin/run.js cmv2 add-keys --id <value> --name <value> [--validators <value>] [--batchSize <value>] [--signer <value>] [--network <value>]

FLAGS
  --id=<value>          (required) Operator ID.
  --name=<value>        (required) Name under which fresh keys are saved in lido-cli (generated-keys/<name>.json or <name>_batch_<i>.json when batched).
  --validators=<value>  [default: 30] Total number of validator keys to generate and add.
  --batchSize=<value>   [default: 100] Max keys per single addValidatorKeysETH transaction. The block gas limit caps this around ~100-150 on a typical devnet.
  --signer=<value>      [default: deployer] Signer to use in lidoCLI (deployer or secondDeployer). The signer pays the bond in ETH.
  --network=<value>     [default: my-devnet] Name of the network.

DESCRIPTION
  For each batch, generates fresh keys (wcType=0x02), saves them to
  generated-keys/<name>_batch_<i>.json (or generated-keys/<name>.json if a single batch),
  then calls `cmv2 add-keys-from-file-eth` which:
  - reads the deposit-data file,
  - asks `CSAccounting.getRequiredBondForNextKeys(operatorId, keysCount)` for the bond,
  - calls `CSModule.addValidatorKeysETH(address, operatorId, keysCount, pubkeys, signatures)`
    with the bond as msg.value.

  Pre-requisites on the stand:
  - The signer wallet must equal the operator's `managerAddress` (`_checkCanAddKeys`).
  - The operator's bond curve must allow the new total (`KeysLimitExceeded` otherwise).
    Run `cmv2 activate` (now sets `defaultKeysLimit` to type(uint256).max), or manually
    raise the limit via `lidoCLI cmv2 grant-manage-keys-limit-role-vote` +
    `lidoCLI cmv2 set-default-keys-limit max`.
  - The operator must already exist (`cmv2 add-operator`).
```

### Run via GitHub Actions (cli-pod)

Use the `Run CLI Command` workflow in `lidofinance/team-core-devnets`. Example: add 200 fresh keys to operator id=0 on devnet `srv3-cmv2-devnet3` (auto-batched into two transactions):

```sh
gh workflow run run-command.yaml \
  -R lidofinance/team-core-devnets \
  -f cluster=tooling-holesky-sandbox-0 \
  -f devnet=srv3-cmv2-devnet3 \
  -f command="cmv2 add-keys --id 0 --name devnet_cmv2___0_extra --validators 200"
```

Notes:
- `--name` must be unique per call. When the request is split into batches, the wrapper appends `_batch_<i>` per chunk, so it writes `generated-keys/<name>_batch_0.json`, `<name>_batch_1.json`, … Reusing the same `--name` across separate calls would overwrite earlier files.
- The workflow appends `--network <devnet>` automatically — do not pass it inside `command`.
- After the keys are added, run validator keystore reload separately (e.g. `validator add` or the relevant stand-specific step) so the validator client picks them up.

## `./bin/run.js cmv2 add-operator`

Adds a new node operator to the CMv2 module along with validator keys (the keys must already be allocated as `generated-keys/<name>.json`).

```
USAGE
  $ ./bin/run.js cmv2 add-operator --name <value> [--signer <value>] [--network <value>]

FLAGS
  --name=<value>     (required) Operator name (also the keys file basename).
  --signer=<value>   [default: deployer] Signer to use in lidoCLI (deployer or secondDeployer).
  --network=<value>  [default: my-devnet] Name of the network.
```

## `./bin/run.js cmv2 add-verifier`

Deploys the CMv2 verifier smart contract using configured deployment scripts.

```
USAGE
  $ ./bin/run.js cmv2 add-verifier [--network <value>] [--verify]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network.
  --verify           Verify the smart contract after deployment.
```

## `./bin/run.js cmv2 build-allowlist`

Builds an allowlist file for the CMv2 gate tree.

```
USAGE
  $ ./bin/run.js cmv2 build-allowlist [--addresses <value>] [--includeDeployer] [--includeSecondDeployer] [--output <value>] [--network <value>]

FLAGS
  --addresses=<value>       Comma-separated list of addresses to include.
  --includeDeployer         Include the deployer address.
  --includeSecondDeployer   Include the secondDeployer address.
  --output=<value>          Output allowlist JSON path.
  --network=<value>         [default: my-devnet] Name of the network.
```

## `./bin/run.js cmv2 deploy`

Deploys CMv2 smart contracts using configured deployment scripts.

```
USAGE
  $ ./bin/run.js cmv2 deploy [--network <value>] [--verify]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network.
  --verify           Verify smart contracts.
```

## `./bin/run.js cmv2 install`

Install and build dependencies in the cmv2 directory.

```
USAGE
  $ ./bin/run.js cmv2 install [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network.
```

## `./bin/run.js cmv2 set-gate-tree`

Builds a Merkle tree for allowlisted operators and updates the curated/vetted gate (root + cid).

```
USAGE
  $ ./bin/run.js cmv2 set-gate-tree --input <value> --outputDir <value> [--setRoot] [--vote] [--treeCid <value>] [--gate <value>] [--network <value>]

FLAGS
  --input=<value>      Path to CSV/JSON with addresses.
  --outputDir=<value>  Directory to write merkle-tree.json and merkle-proofs.json.
  --setRoot            Set tree root on the gate after building.
  --vote               Use a DAO vote (via lidoCLI) to set the tree root instead of a direct call.
  --treeCid=<value>    Tree CID label (e.g. devnet-allowlist).
  --gate=<value>       Gate address override.
  --network=<value>    [default: my-devnet] Name of the network.
```

## `./bin/run.js cmv2 update-state`

Reads the network state file for cmv2 and updates the JSON database accordingly.

```
USAGE
  $ ./bin/run.js cmv2 update-state [--network <value>]

FLAGS
  --network=<value>  [default: my-devnet] Name of the network.
```
