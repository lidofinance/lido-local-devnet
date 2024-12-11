#!/bin/bash

# Set the path to the JSON file
JSON_FILE="devnet-dc/network/execution/genesis.json"

# Use grep and awk to extract the timestamp value
TIMESTAMP_HEX=$(grep -o '"timestamp": *"[^"]*"' $JSON_FILE | awk -F '"' '{print $4}')

# Check if we have obtained a timestamp value
if [ -z "$TIMESTAMP_HEX" ]; then
    echo "The 'timestamp' property was not found or is empty."
    exit 1
fi

# Remove the '0x' prefix from the hex value if present
TIMESTAMP_HEX=${TIMESTAMP_HEX#0x}

# Convert hexadecimal to decimal
TIMESTAMP_DEC=$((16#$TIMESTAMP_HEX))

# Export the decimal value to an environment variable
export GENESIS_TIME=$TIMESTAMP_DEC

# Check and display the result
# echo "GENESIS_TIME has been set to $GENESIS_TIME"
