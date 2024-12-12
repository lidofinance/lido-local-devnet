rm -rf artifacts

mkdir -p artifacts/keymanager_file
mkdir -p artifacts/el_cl_genesis_data

kurtosis files download my-testnet keymanager_file ./artifacts/keymanager_file
kurtosis files download my-testnet el_cl_genesis_data ./artifacts/el_cl_genesis_data

# 7ab2f0de1428   1-teku-geth-0-63
# bf9d1e6a5e06   dora-config
# 598a6f25316d   el_cl_genesis_data
# 8fe57da0636f   final-genesis-timestamp
# 357b5743c533   genesis-el-cl-env-file
# 3823dce9443a   genesis_validators_root
# dd1dc786bbdd   jwt_file
# 2eea8d0ca5a9   keymanager_file
# ea9abbe28e19   prysm-password
# 9c75dcf4ccd0   validator-ranges