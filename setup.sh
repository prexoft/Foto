#!/bin/bash
# setup.sh — Install all dependencies for Foto
# Run this once: bash setup.sh

set -e
cd "$(dirname "$0")"

echo "🔧 Setting up Foto dependencies..."

# Create Python venv if needed
if [ ! -d "venv" ]; then
  echo "📦 Creating Python virtualenv..."
  python3 -m venv venv
fi

# Force CPU compilation for Intel Macs to prevent Metal crash
if [ "$(uname)" = "Darwin" ]; then
  CPU_BRAND=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "")
  if [[ "$CPU_BRAND" != *"Apple"* ]]; then
    echo "📦 Intel Mac detected: installing stable-diffusion-cpp-python with Metal OFF..."
    export CMAKE_ARGS="-DGGML_METAL=OFF"
  else
    echo "📦 Apple Silicon Mac detected: installing stable-diffusion-cpp-python with Metal ON..."
    export CMAKE_ARGS="-DGGML_METAL=ON"
  fi
else
  echo "📦 Linux detected: installing stable-diffusion-cpp-python..."
fi

venv/bin/pip install --force-reinstall --no-cache-dir --no-binary=stable-diffusion-cpp-python,stable_diffusion_cpp_python stable-diffusion-cpp-python
venv/bin/pip install Pillow

echo "📦 Installing Electron..."
npm install

echo ""
echo "✅ Setup complete! Run: npm start"
