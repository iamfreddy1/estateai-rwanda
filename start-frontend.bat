@echo off
REM ============================================
REM Start the React frontend
REM ============================================
echo Starting EstateAI Frontend...
echo.

cd /d "%~dp0frontend"
npm run dev

pause
