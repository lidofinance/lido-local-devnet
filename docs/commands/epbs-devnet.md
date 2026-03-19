# ePBS Devnet: Self-Hosted Lido Deployment

Guide for deploying Lido protocol on [ePBS devnets](https://github.com/ethpandaops/epbs-devnets) (EIP-7732, Gloas fork).

## Quick Start

```bash
./bin/run.js stands epbs --skipChain  # if nodes already running
./bin/run.js stands epbs              # full deployment including nodes
```

## Network Info (devnet-0)

| Parameter | Value |
|-----------|-------|
| Chain ID | `7055777152` |
| Genesis fork version | `0x10898744` |
| Preset | `mainnet` (SLOTS_PER_EPOCH=32, SECONDS_PER_SLOT=12) |
| Gloas fork epoch | `5` |
| Config repo | https://github.com/ethpandaops/epbs-devnets |
| Checkpoint sync | https://checkpoint-sync.epbs-devnet-0.ethpandaops.io |
| Beacon API | https://beacon.epbs-devnet-0.ethpandaops.io |
| Explorer | https://explorer.epbs-devnet-0.ethpandaops.io |

> **Note:** Each new ePBS devnet will have a different chain ID and genesis fork version.
> When a new devnet is launched, update the chain ID in:
> - `lido-council-daemon` — 4 files (see [Chain ID Registration](#chain-id-registration) below)
> - `lido-local-devnet` — no hardcoded chain ID, reads from `network-config/genesis.json`

## Docker Images

| Component | Image | Notes |
|-----------|-------|-------|
| EL (Geth) | `ethpandaops/geth:epbs-devnet-0` | |
| CL (Prysm) | `ethpandaops/prysm-beacon-chain:epbs-devnet-0` | Use pinned commit tags (e.g. `epbs-devnet-0-b8863cb`) for stability |
| VC (Prysm) | `ethpandaops/prysm-validator:epbs-devnet-0` | Required for Lido validator keys |

> **Warning:** Do NOT use `prysm-beacon-chain:epbs-devnet-0-minimal` — it is incompatible
> with the mainnet-preset genesis. Lighthouse (`ethpandaops/lighthouse:epbs-devnet-0`)
> finds peers but cannot advance past the checkpoint sync slot due to DB issues.

## Deployment

### 1. Fetch network config & create namespace

```bash
./bin/run.js chain fetch-network-config --network epbs-devnet-0
```

This creates ConfigMap `epbs-devnet-0-network-config` containing `config.yaml`,
`bootstrap_nodes.yaml` (12 bootnodes), `enodes.txt`, and `genesis.json`.

### 2. EL node

```bash
./bin/run.js chain self-hosted-up \
  --network epbs-devnet-0 \
  --elClient geth \
  --clClient prysm \
  --elImage ethpandaops/geth:epbs-devnet-0 \
  --clImage ethpandaops/prysm-beacon-chain:epbs-devnet-0
```

Or manually via Helm — EL syncs independently via devp2p (typically 10-15 peers).

### 3. CL node — critical P2P configuration

The CL requires special handling because:

1. **Genesis SSZ is ~3MB** (exceeds ConfigMap 1MB limit) — must be downloaded via init container
2. **Firewall blocks standard P2P ports** (9000, 13000) — must use NodePort range (30000-32767)
3. **NAT traversal** — must advertise external IP in ENR via `--p2p-host-ip`

#### Extract bootnodes

```bash
BOOTNODES=$(kubectl get configmap epbs-devnet-0-network-config -n kt-epbs-devnet-0 \
  -o jsonpath='{.data.bootstrap_nodes\.yaml}' \
  | grep '^- ' | sed 's/^- //' | tr '\n' ',' | sed 's/,$//')
```

#### Helm values (`cl-values.yaml`)

```yaml
client: prysm
image:
  prysm:
    registry: docker.io
    repository: ethpandaops/prysm-beacon-chain
    tag: "epbs-devnet-0"
network: epbs-devnet-0
customNetwork: true
executionEndpoint: "http://epbs-devnet-0-el-lido-el-node.kt-epbs-devnet-0.svc.cluster.local:8551"
jwt:
  existingSecret: epbs-devnet-0-jwt
networkConfigMapName: epbs-devnet-0-network-config
genesisSSZUrl: "https://raw.githubusercontent.com/ethpandaops/epbs-devnets/master/network-configs/devnet-0/metadata/genesis.ssz"
checkpointSyncUrl: "https://checkpoint-sync.epbs-devnet-0.ethpandaops.io"
bootnodes: "<BOOTNODES>"
extraArgs:
  - "--min-sync-peers=1"
  - "--minimum-peers-per-subnet=0"
  - "--p2p-host-ip=<NODE_EXTERNAL_IP>"
  - "--p2p-tcp-port=30013"
  - "--p2p-udp-port=30014"
  - "--p2p-quic-port=30015"
```

```bash
helm install epbs-devnet-0-cl helm/lido/lido-cl-node \
  --namespace kt-epbs-devnet-0 -f cl-values.yaml
```

#### NodePort service for P2P

```yaml
apiVersion: v1
kind: Service
metadata:
  name: epbs-devnet-0-cl-p2p
  namespace: kt-epbs-devnet-0
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: lido-cl-node
  ports:
    - name: p2p-tcp
      port: 30013
      targetPort: 30013
      nodePort: 30013
      protocol: TCP
    - name: p2p-udp
      port: 30014
      targetPort: 30014
      nodePort: 30014
      protocol: UDP
    - name: p2p-quic
      port: 30015
      targetPort: 30015
      nodePort: 30015
      protocol: UDP
```

## Troubleshooting

### CL has 0 peers

1. Check bootnodes — must use all 12 from `bootstrap_nodes.yaml`, not the 2 from genesis ENR
2. Check firewall — P2P ports must be in NodePort range (30000-32767)
3. Check `--p2p-host-ip` — must be the node's external IP, not internal pod IP
4. Verify NodePort service exists and maps to correct target ports

### Prysm crashes with nil pointer / setupForkchoiceTree

DB is corrupted. Delete PVC and redeploy with checkpoint sync:

```bash
helm uninstall epbs-devnet-0-cl -n kt-epbs-devnet-0
kubectl delete pvc epbs-devnet-0-cl-lido-cl-node-data -n kt-epbs-devnet-0
# helm install again
```

### EL stuck at block 0

EL needs CL to send consensus updates. If CL was down/crashing, EL will show
"no consensus updates received". Fix the CL first — once CL syncs, EL follows immediately.

### Genesis SSZ too large for ConfigMap

Use `genesisSSZUrl` in the Helm chart — the init container downloads it automatically:

```
genesisSSZUrl: "https://raw.githubusercontent.com/ethpandaops/epbs-devnets/master/network-configs/devnet-0/metadata/genesis.ssz"
```

## Lido Protocol Deployment

The `stands epbs` command automates the full deployment. Key differences from Kurtosis-based stands:

1. **Self-hosted nodes** — EL/CL/VC deployed via Helm charts, not Kurtosis
2. **No blockscout** — contract verification uses external explorer (ethpandaops) or is skipped
3. **No local validator management** — ePBS devnet validators are external; Lido deploys its own VC for protocol validators
4. **Lower ETH amounts** — deployer has ~10K ETH; stand submits 500 ETH per module (not 10K)

### Stand Parameters

```bash
./bin/run.js stands epbs \
  --skipChain \                    # skip node deployment (if already running)
  --clImage ethpandaops/prysm-beacon-chain:epbs-devnet-0-b8863cb \  # pin CL image
  --verifierUrl https://explorer.epbs-devnet-0.ethpandaops.io/api    # contract verification
```

### Validator Client

The VC is deployed separately. After `stands epbs` deploys contracts and generates keys,
load them into the validator:

```bash
VALIDATOR_KEYMANAGER_TOKEN=<token> ./bin/run.js validator add
```

The token is auto-generated by Prysm and stored at `/root/.eth2validators/prysm-wallet-v2/auth-token` inside the VC pod.
`validatorsApiPublic` must be set in `state.json` (either via ingress or port-forward).

## Chain ID Registration

When a new ePBS devnet launches with a different chain ID, update these files in `lido-council-daemon`:

| File | What to add |
|------|-------------|
| `src/contracts/signing-keys-registry/signing-keys-registry.constants.ts` | Chain ID → `EARLIEST_MODULE_DEPLOYMENT_BLOCK_NETWORK` (value: `0`) |
| `src/contracts/deposits-registry/deposits-registry.constants.ts` | Chain ID → `DEPLOYMENT_BLOCK_NETWORK` (value: `0`) |
| `src/messages/messages.constants.ts` | Chain ID → `MESSAGE_TOPIC_PREFIX_BY_NETWORK` (value: `'testnet'`) |
| `src/bls/bls.constants.ts` | Chain ID → `GENESIS_FORK_VERSION_BY_CHAIN_ID` (value: genesis fork version from `network-config/config.yaml`) |

Example for `epbs-devnet-0` (chain ID `7055777152`, genesis fork version `0x10898744`):

```typescript
const EPBS_DEVNET_0_CHAIN_ID = 7055777152;
// In bls.constants.ts:
export const GENESIS_FORK_VERSION_DEVNET_EPBS0 = Version.fromJson('0x10898744');
```

## Known ePBS Compatibility Issues

Services that **work** on ePBS devnet:
- lido-keys-api (KAPI) — syncs and serves keys correctly
- lido-oracle (ejector) — runs without parsing block body deeply
- DSM bots (depositor, pauser, unvetter) — work after chain ID fix
- Validator client — loads Lido keys and validates

Services that **crash** on ePBS devnet (need adaptation):
- lido-oracle (accounting) — `BeaconBlockBody.__init__() missing 'execution_payload'`
- lido-oracle (CSM) — same error as accounting
- lido-council-daemon — `Chain <id> is not supported` (needs chain ID registration)

Root cause: EIP-7732 removes `execution_payload` from `BeaconBlockBody` and replaces it with
`SignedExecutionPayloadBid`. All services that parse beacon block bodies need to be adapted.

## Helm Chart Changes

The `lido-cl-node` chart was extended with `hostNetwork` support in
`templates/deployment.yaml` and `values.yaml` for cases where NodePort isn't sufficient.
