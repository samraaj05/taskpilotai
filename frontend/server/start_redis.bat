@echo off
echo --- Starting Local Redis Server (TaskPilotAI) ---
cd /d "c:\Users\SAMRAAJ M M\Desktop\taskpilot\frontend\redis5"
if exist redis-server.exe (
    echo [SYSTEM] Launching redis-server.exe...
    start "" redis-server.exe
    echo [SYSTEM] Redis server launched in a new window.
) else (
    echo [ERROR] redis-server.exe not found in c:\Users\SAMRAAJ M M\Desktop\taskpilot\frontend\redis5
    pause
)
