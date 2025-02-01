#!/bin/bash


SPEC_URL="https://raw.githubusercontent.com/ethereum/beacon-APIs/refs/heads/master/beacon-node-oapi.yaml"


OUTPUT_DIR="./src/generated-client-fetch"

rm -rf $OUTPUT_DIR

docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate \
    -i $SPEC_URL \
    -g typescript-axios \
    -o /local/$OUTPUT_DIR \
    --additional-properties=supportsES6=true,withNodeImports=true

echo "TypeScript ready $OUTPUT_DIR"

# this file is created with an error + I do my own re-export.
# rm -rf src/generated-client-fetch/apis/index.ts
