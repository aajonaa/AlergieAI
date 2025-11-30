#!/bin/bash

# Start FRP Client for AlergieAI
# This creates a stable tunnel to expose vLLM on your ECS

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRP_DIR="${SCRIPT_DIR}/frp"

# Check if frpc exists
if [ ! -f "${FRP_DIR}/frpc" ]; then
    echo "ERROR: frpc not found!"
    echo "Please run ./setup_frpc.sh first to download FRP client."
    exit 1
fi

echo "========================================"
echo "Starting FRP Client Tunnel"
echo "========================================"
echo ""
echo "Make sure:"
echo "  1. vLLM is running on localhost:8000"
echo "  2. frps is running on your ECS"
echo "  3. Token in frp/frpc.toml matches server"
echo ""
echo "Your services will be accessible at:"
echo "  vLLM API:  http://120.26.142.237:8000  (or http://www.qtrading.top:8000)"
echo "  Frontend:  http://120.26.142.237:3000  (or http://www.qtrading.top:3000)"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo "========================================"
echo ""

cd "${FRP_DIR}"
./frpc -c frpc.toml

