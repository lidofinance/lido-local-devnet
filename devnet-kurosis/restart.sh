devnet-kurosis/stop.sh || true
devnet-kurosis/start.sh

ENCLAVE_NAME=my-testnet

## Generate Dora config
ENCLAVE_UUID=$(kurtosis enclave inspect "$ENCLAVE_NAME" --full-uuids | grep 'UUID:' | awk '{print $2}')

BEACON_NODES=$(docker ps -aq -f "label=enclave_uuid=$ENCLAVE_UUID" \
    -f "label=com.kurtosistech.app-id=kurtosis" \
    -f "label=com.kurtosistech.custom.ethereum-package.client-type=beacon")

EXECUTION_NODES=$(docker ps -aq -f "label=enclave_uuid=$ENCLAVE_UUID" \
    -f "label=com.kurtosistech.app-id=kurtosis" \
    -f "label=com.kurtosistech.custom.ethereum-package.client-type=execution")

echo $ENCLAVE_UUID
echo $BEACON_NODES
echo $EXECUTION_NODES

echo $(
    for node in $EXECUTION_NODES; do
        ip=$(echo '127.0.0.1')
        port=$(docker inspect --format='{{ (index (index .NetworkSettings.Ports "8545/tcp") 0).HostPort }}' $node)
        if [ -z "$port" ]; then
            continue
        fi
        echo "http://$ip:$port"
        break
    done
)

echo $(for node in $BEACON_NODES; do
    name=$(docker inspect -f "{{ with index .Config.Labels \"com.kurtosistech.id\"}}{{.}}{{end}}" $node)
    ip=$(echo '127.0.0.1')
    port=$(docker inspect --format='{{ (index (index .NetworkSettings.Ports "4000/tcp") 0).HostPort }}' $node)
    if [ -z "$port" ]; then
        port="65535"
    fi
    echo "    - { name: $name, url: http://$ip:$port }"
done)
