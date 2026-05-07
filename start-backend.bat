@echo off
REM ============================================
REM Start the Flask backend
REM ============================================
echo Starting EstateAI Backend...
echo.

cd /d "%~dp0backend"
call venv\Scripts\activate.bat
python app.py

pause
