#!/bin/bash
set -e +u
set -o pipefail

export NETWORK=local
export RPC_URL="http://127.0.0.1:8545"  # if defined use the value set to default otherwise

export GENESIS_TIME=1639659600  # just some time
# export WITHDRAWAL_QUEUE_BASE_URI="<< SET IF REQUIED >>"
# export DSM_PREDEFINED_ADDRESS="<< SET IF REQUIED >>"

export DEPLOYER=0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc  # first acc of default mnemonic "test test ..."
export GAS_PRIORITY_FEE=1
export GAS_MAX_FEE=100

export NETWORK_STATE_FILE="deployed-${NETWORK}.json"
export NETWORK_STATE_DEFAULTS_FILE="scripts/scratch/deployed-testnet-defaults.json"

cd onchain/lido-core

yarn

bash scripts/dao-deploy.sh

