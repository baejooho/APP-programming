@echo off
:: Created: 2026-03-17
cd /d "%~dp0"
start "" /B python app.py
timeout /t 2 /nobreak >nul
start chrome http://127.0.0.1:5000
