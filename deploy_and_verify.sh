#!/bin/bash
set -e
source .env

ADDR=$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")
if [ "$ADDR" != "0x306c3C493aC339acC0bC0E7Ea145a21B2169cEAa" ]; then
    echo "ERROR: Deployer address mismatch! Found $ADDR"
    exit 1
fi

CHAIN_ID=$(cast chain-id --rpc-url "$BASE_SEPOLIA_RPC_URL")
if [ "$CHAIN_ID" != "84532" ]; then
    echo "ERROR: Chain ID mismatch! Found $CHAIN_ID"
    exit 1
fi

echo "Preflight complete. Broadcasting deployment..."
forge script contracts/script/DeployAegisMind.s.sol --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast --json
