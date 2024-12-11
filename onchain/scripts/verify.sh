#!/bin/bash
set -e +u
set -o pipefail

export NETWORK=local-devnet
export RPC_URL="http://127.0.0.1:8545"  # if defined use the value set to default otherwise

export LOCAL_DEVNET_PK=0x2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622

source onchain/scripts/get-genesis.sh

echo "Current GENESIS_TIME is: $GENESIS_TIME"

export DEPLOYER=0x123463a4b065722e99115d6c222f267d9cabb524  # first acc of default mnemonic "test test ..."
export GAS_PRIORITY_FEE=1
export GAS_MAX_FEE=100

export NETWORK_STATE_FILE="deployed-${NETWORK}.json"
export NETWORK_STATE_DEFAULTS_FILE="scripts/scratch/deployed-testnet-defaults.json"

cd onchain/lido-core

yarn

yarn verify:deployed --network local-devnet