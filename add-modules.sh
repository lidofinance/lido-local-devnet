#!/bin/bash

# Массив сабмодулей для добавления
submodules=(
  "lido-core submodules/lido-core git@github.com:lidofinance/core.git feat/local-devnet"
  "csm submodules/csm git@github.com:lidofinance/community-staking-module.git feat/devnet"
  "lido-cli submodules/lido-cli git@github.com:lidofinance/lido-cli.git feature/devnet-command"
  "staking-deposit-cli submodules/staking-deposit-cli git@github.com:lidofinance/staking-deposit-cli-devnet.git devnet"
  "kapi submodules/kapi git@github.com:lidofinance/lido-keys-api.git feat/devnet"
  "scripts submodules/scripts git@github.com:lidofinance/scripts.git feat/pectra-devnet"
  "oracle-master submodules/oracle-master git@github.com:lidofinance/lido-oracle.git master"
  "oracle-v5 submodules/oracle-v5 git@github.com:lidofinance/lido-oracle.git feat/oracle-v5"
)

# Добавление сабмодулей
for submodule in "${submodules[@]}"; do
  # Разделение строки на части
  read -r name path url branch <<< "$submodule"

  echo "Adding submodule: $name"
  
  # Добавление сабмодуля
  git submodule add -b "$branch" "$url" "$path"
done

# Инициализация и обновление сабмодулей
git submodule update --init --recursive

echo "All submodules added."
