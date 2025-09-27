@echo off
REM Batch file to run Notion sync from Task Scheduler
REM This runs the script from its actual location

REM Change to script directory
cd /d "D:\AutomatiseringGullbrand\skiplumXGE\notion-supabase\scripts"

REM Run the Python script
python notion_sync_standalone.py

REM Check if there was an error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Sync failed! Check logs for details.
    echo Error code: %ERRORLEVEL%
    pause
)