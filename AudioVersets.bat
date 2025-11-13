@echo off
cd C:\Users\C-OimPC\Desktop\AudioVersets_V1
start http://localhost:8000
python -m http.server 8000
pause
