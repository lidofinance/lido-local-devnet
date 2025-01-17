#!/bin/bash

# Массив сабмодулей для удаления
submodules=(
  "onchain/lido-core"
  "onchain/csm"
  "ofchain/lido-cli"
  "ofchain/staking-deposit-cli"
  "ofchain/kapi"
  "ofchain/scripts"
  "ofchain/oracle-master"
  "ofchain/oracle-v5"
)

# Удаление сабмодулей
for submodule in "${submodules[@]}"; do
  echo "Removing submodule: $submodule"

  # Удаление записи из .git/config
  git config -f .git/config --remove-section "submodule.$submodule" 2>/dev/null

  # Удаление сабмодуля из индекса
  git rm --cached "$submodule"

  # Удаление директории сабмодуля из .git/modules
  rm -rf ".git/modules/$submodule"

  # Удаление файлов сабмодуля
  rm -rf "$submodule"
done

# Коммит изменений
# git commit -m "Removed specified submodules"

echo "All specified submodules removed."
