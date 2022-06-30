#!/bin/sh

# Cleanup previous import
rm -r abi/
mkdir abi

# Import the abi
cp  blockchain/artifacts/contracts/*/**/*.json abi/

# Remove dbg file
rm -r abi/*.dbg.json

# Import the addresses.json
cp blockchain/addresses.json functions/src/utils/
