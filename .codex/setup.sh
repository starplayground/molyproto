#!/bin/bash
set -e
# Navigate to the project directory containing package.json
PROJECT_DIR="$(dirname "$0")/../molyproto-main/molyproto"
cd "$PROJECT_DIR"

# Use npm ci if package-lock.json exists for reproducible installs
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
