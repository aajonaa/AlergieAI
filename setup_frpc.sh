#!/bin/bash

# FRP Client Setup Script for AlergieAI
# This creates a stable tunnel to your ECS server

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRP_DIR="${SCRIPT_DIR}/frp"

echo "========================================"
echo "FRP Client Setup for AlergieAI"
echo "========================================"

# Configuration - CHANGE THESE!
ECS_IP="120.26.142.237"
FRP_TOKEN="40ca7f45da3d9201e9c97203e234ee4a"  # Must match server!
FRP_VERSION="0.61.1"

# Create frp directory inside project
mkdir -p "${FRP_DIR}"
cd "${FRP_DIR}"

# Download FRP if not exists
if [ ! -f "frpc" ]; then
    echo "Downloading FRP v${FRP_VERSION}..."
    wget -q "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_amd64.tar.gz"
    tar -xzf "frp_${FRP_VERSION}_linux_amd64.tar.gz"
    cp "frp_${FRP_VERSION}_linux_amd64/frpc" .
    rm -rf "frp_${FRP_VERSION}_linux_amd64" "frp_${FRP_VERSION}_linux_amd64.tar.gz"
    echo "FRP downloaded successfully!"
fi

# Create client config
cat > frpc.toml << EOF
serverAddr = "${ECS_IP}"
serverPort = 7000
auth.token = "${FRP_TOKEN}"

[[proxies]]
name = "vllm-api"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8000
remotePort = 8000
EOF

echo ""
echo "FRP client configured!"
echo ""
echo "Config file: ${FRP_DIR}/frpc.toml"
echo "Server: ${ECS_IP}:7000"
echo ""
echo "========================================"
echo "IMPORTANT: Edit the token in this script"
echo "and ${FRP_DIR}/frpc.toml to match your server!"
echo "========================================"
echo ""
echo "To start the tunnel, run: ./start_frpc.sh"

