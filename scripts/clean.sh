# docker rm -f $(docker ps -a -q)
rm -Rf network/consensus/beacondata network/consensus/validatordata network/consensus/genesis.ssz
rm -Rf network/execution/geth
rm -rf blockscout/services/blockscout-db-data blockscout/services/logs blockscout/services/redis-data blockscout/services/redis-data