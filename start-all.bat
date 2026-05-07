@echo off
REM ============================================
REM Start both backend and frontend at once
REM Each opens in its own terminal window
REM ============================================
echo Launching EstateAI (full stack)...
echo.

start "EstateAI Backend"  cmd /k "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "EstateAI Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo Both servers starting in separate windows!
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
echo You can close this window.
timeout /t 5
