# Windows Task Scheduler Setup for Notion Sync

## Quick Setup

### 1. Update Credentials
Edit `scripts/notion_sync_standalone.py`:
```python
SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
SUPABASE_KEY = "your-service-key-here"
```

### 2. Test the Script
```cmd
cd C:\Users\edkjo\theSpruceForgeDevelopment\projects\active\landingsside-energi-react\scripts
python notion_sync_standalone.py
```

Check that it creates:
- `logs/sync_YYYYMMDD.log` - Daily log file
- `last_sync_status.json` - Last sync status

### 3. Set Up Task Scheduler

#### Open Task Scheduler:
1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Click "Create Basic Task..." in the right panel

#### Configure the Task:
**General Tab:**
- Name: `Notion to Supabase Sync`
- Description: `Syncs configuration from Notion to Supabase`
- ✅ Run whether user is logged on or not
- ✅ Run with highest privileges

**Triggers Tab:**
Click "New..." and choose one:
- **Daily**: Every day at specific time
- **On a schedule**: Every X hours
- **At startup**: Run when computer starts

Example for every 6 hours:
- Begin the task: Daily
- Start: Today at 9:00 AM
- Recur every: 1 days
- ✅ Repeat task every: 6 hours
- For a duration of: Indefinitely

**Actions Tab:**
Click "New..."
- Action: Start a program
- Program/script: `C:\Users\edkjo\theSpruceForgeDevelopment\projects\active\landingsside-energi-react\scripts\run_sync.bat`
- Start in: `C:\Users\edkjo\theSpruceForgeDevelopment\projects\active\landingsside-energi-react\scripts`

**Conditions Tab:**
- ✅ Start only if computer is idle (optional)
- ✅ Wake the computer to run this task (if needed)

**Settings Tab:**
- ✅ Allow task to be run on demand
- ✅ Run task as soon as possible after scheduled start is missed
- ✅ Stop task if it runs longer than: 1 hour

### 4. Test the Task
1. Right-click your task in Task Scheduler
2. Click "Run"
3. Check `scripts/logs/` for today's log file

## File Structure

```
scripts/
├── notion_sync_standalone.py    # Main sync script
├── run_sync.bat                 # Batch file to run script
├── last_sync_status.json        # Last sync results
└── logs/
    └── sync_20240115.log        # Daily log files
```

## Monitoring

### Check Status File
The script creates `last_sync_status.json`:
```json
{
  "calculations": 10,
  "features": 8,
  "formulas": 10,
  "success": true,
  "timestamp": "2024-01-15T10:30:00",
  "errors": []
}
```

### Check Logs
Daily logs in `scripts/logs/sync_YYYYMMDD.log`:
```
2024-01-15 10:30:00 - INFO - NOTION → SUPABASE SYNC
2024-01-15 10:30:00 - INFO - Syncing calculations...
2024-01-15 10:30:02 - INFO - ✓ Synced 10 calculations
```

### View in Event Viewer
1. Open Event Viewer
2. Windows Logs → System
3. Filter by Source: Task Scheduler

## Troubleshooting

### "Python not found"
Edit `run_sync.bat` to use full Python path:
```batch
C:\Python312\python.exe notion_sync_standalone.py
```

Or if using Anaconda:
```batch
call C:\Users\edkjo\anaconda3\Scripts\activate.bat
C:\Users\edkjo\anaconda3\python.exe notion_sync_standalone.py
```

### "requests module not found"
The script auto-installs requests if missing. If that fails:
```cmd
pip install requests
```

### Task runs but nothing happens
1. Check Task Scheduler history (right-click task → View History)
2. Check `scripts/logs/` for error messages
3. Run the batch file manually to see errors

### "Access denied"
- Run Task Scheduler as Administrator
- Set task to "Run with highest privileges"

## Alternative: Use Python directly

Instead of the batch file, you can run Python directly in Task Scheduler:
- Program: `python.exe` (or full path)
- Arguments: `notion_sync_standalone.py`
- Start in: `C:\Users\edkjo\...\scripts`

## Email Notifications (Optional)

Add email notification to the Python script:
```python
import smtplib
from email.mime.text import MIMEText

def send_email(results):
    if not results["success"]:
        # Send failure notification
        msg = MIMEText(f"Sync failed: {results['errors']}")
        msg['Subject'] = 'Notion Sync Failed'
        # Configure SMTP and send
```

## Benefits

✅ **No cloud dependencies** - Runs on your machine
✅ **Full control** - Easy to debug and modify
✅ **Reliable** - Windows Task Scheduler is very stable
✅ **Logs** - Complete audit trail
✅ **Free** - No cloud costs