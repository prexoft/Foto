@echo off
:: setup.bat — Install dependencies for Foto on Windows

echo 🔧 Setting up Foto dependencies...

:: Verify Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH. Please install Python 3.10+ first.
    exit /b 1
)

:: Create Python venv if needed
if not exist "venv" (
    echo 📦 Creating Python virtualenv...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ❌ Failed to create virtualenv.
        exit /b 1
    )
)

:: Install Python requirements
echo 📦 Installing stable-diffusion-cpp-python...
call venv\Scripts\activate.bat
pip install --force-reinstall --no-cache-dir --no-binary=stable-diffusion-cpp-python,stable_diffusion_cpp_python stable-diffusion-cpp-python
pip install Pillow
call venv\Scripts\deactivate.bat

:: Install Electron/Node dependencies
echo 📦 Installing Electron...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node dependencies.
    exit /b 1
)

echo.
echo ✅ Setup complete! Run: npm start
