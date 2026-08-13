#!/bin/bash

# Exit immediately if any command fails
set -e

# Get absolute path to the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATIC_DIR="$SCRIPT_DIR/static"
DEST_DIR="/var/www/portfolio"

echo "==> Building Jekyll static site..."
cd "$STATIC_DIR"
jekyll build

echo "==> Ensuring target directory exists..."
sudo mkdir -p "$DEST_DIR"

echo "==> Copying compiled site files to $DEST_DIR..."
# Copy all files including hidden ones if any, but excluding . and ..
sudo cp -r "$STATIC_DIR/_site/." "$DEST_DIR/"

echo "==> Success! Local site updated at http://localhost/"
