@echo off
REM Batch file to run Notion sync from Task Scheduler

REM Change to script directory
cd /d "C:\Users\edkjo\theSpruceForgeDevelopment\projects\active\landingsside-energi-react\scripts"

REM Use Python from conda or system
REM Option 1: Use conda Python (if you have Anaconda)
REM call C:\Users\edkjo\anaconda3\Scripts\activate.bat
REM C:\Users\edkjo\anaconda3\python.exe notion_sync_standalone.py

REM Option 2: Use system Python
python notion_sync_standalone.py

REM Keep window open if there's an error (optional)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Sync failed! Check logs for details.
    pause
)