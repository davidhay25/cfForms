#!/bin/bash

echo
echo "This will build a multi-platform image of the Forms app and upload it to Docker Hub"
echo
read -n 1 -s -r -p "Press any key to continue or <ctrl>C to cancel"

docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t davidhay25/forms:latest \
  --push .