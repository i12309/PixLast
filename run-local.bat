@echo off
cd /d "%~dp0"
echo Opening NEON 04:19 at http://localhost:8080
start "" http://localhost:8080
py -3 -m http.server 8080
pause
