@echo off
REM Smart Frame Guide - Complete Startup Script
REM This script starts both backend and frontend

echo.
echo ========================================
echo   Smart Frame Guide - Full Stack Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo Error: backend folder not found
    echo Please run this script from: C:\Users\Dell\Desktop\front pfe
    pause
    exit /b 1
)

if not exist "smart-frame-guide" (
    echo Error: smart-frame-guide folder not found
    echo Please run this script from: C:\Users\Dell\Desktop\front pfe
    pause
    exit /b 1
)

echo.
echo Step 1: Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)
python --version

echo.
echo Step 2: Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js not found. Please install Node.js
    pause
    exit /b 1
)
node --version

echo.
echo ========================================
echo   Starting Services
echo ========================================
echo.

echo [1/2] Starting Backend (FastAPI)...
echo        URL: http://localhost:8000
echo        Docs: http://localhost:8000/docs
echo.
cd backend
start cmd /k "python -m app.main"
echo        ✓ Backend window opened
cd ..

timeout /t 3 /nobreak

echo.
echo [2/2] Starting Frontend (Vite React)...
echo        URL: http://localhost:5173
echo.
cd smart-frame-guide
start cmd /k "npm run dev"
echo        ✓ Frontend window opened
cd ..

echo.
echo ========================================
echo   All Systems Ready!
echo ========================================
echo.
echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:8000
echo API Docs:  http://localhost:8000/docs
echo.
echo Troubleshooting:
echo - Backend not starting? Run: cd backend && pip install -r requirements.txt
echo - Model not loading? Run: cd backend && python convert_model.py
echo - Frontend not starting? Run: cd smart-frame-guide && npm install
echo.
echo Press any key to close this window...
pause >nul
