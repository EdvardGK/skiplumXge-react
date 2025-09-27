# Notion Automation Logging Database Setup

## Database Schema: "Automation Logs"

Create a new Notion database with these properties for comprehensive logging:

### Core Properties (Required)

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Run ID** | Title | Unique identifier for this run | `2024-01-15-10:30:45-notion-sync` |
| **Script Name** | Select | Which script/flow ran | `notion-sync`, `backup-script`, `report-generator` |
| **Project** | Select | Which project this belongs to | `SkiplumXGE`, `Project-B`, `General` |
| **Status** | Select | Run outcome | `Success`, `Failed`, `Partial`, `Running` |
| **Start Time** | Date & Time | When execution started | `2024-01-15 10:30:45` |
| **End Time** | Date & Time | When execution ended | `2024-01-15 10:31:02` |
| **Duration (sec)** | Number | How long it took | `17` |
| **Environment** | Select | Where it ran | `Production`, `Development`, `Test` |

### Result Properties

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Records Processed** | Number | Total items processed | `25` |
| **Records Success** | Number | Successfully processed | `23` |
| **Records Failed** | Number | Failed to process | `2` |
| **Success Rate %** | Formula | `(Records Success / Records Processed) * 100` | `92%` |

### Error Handling

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Has Errors** | Checkbox | Whether errors occurred | ☑ |
| **Error Message** | Text | Main error description | `Connection timeout to Supabase` |
| **Error Details** | Text | Full error stack/details | `Full traceback...` |
| **Error Count** | Number | Number of errors | `2` |

### Metadata

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Machine Name** | Text | Which machine ran it | `DESKTOP-ABC123` |
| **User** | Text | User account that ran it | `edkjo` |
| **Trigger** | Select | How it was triggered | `Scheduled`, `Manual`, `API`, `Webhook` |
| **Version** | Text | Script version | `1.2.0` |
| **Config File** | Text | Config file used | `.env` |

### Performance Metrics

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **API Calls** | Number | Number of API calls made | `15` |
| **Data Size (KB)** | Number | Amount of data processed | `2048` |
| **Memory Used (MB)** | Number | Peak memory usage | `125` |
| **Retry Count** | Number | Number of retries | `3` |

### Integration Details (Optional)

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Source System** | Multi-select | Where data came from | `Notion`, `GitHub` |
| **Target System** | Multi-select | Where data went to | `Supabase`, `Email` |
| **Sync Type** | Select | Type of operation | `Full`, `Incremental`, `Delta` |
| **Last Sync ID** | Text | Reference to previous run | `2024-01-15-04:30:12-notion-sync` |

### Notification & Actions

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Alert Sent** | Checkbox | Whether alert was sent | ☐ |
| **Alert Recipients** | Text | Who was notified | `admin@company.com` |
| **Action Required** | Checkbox | Needs manual intervention | ☑ |
| **Action Notes** | Text | What needs to be done | `Check API credentials` |
| **Resolved** | Checkbox | Issue has been resolved | ☐ |

## Select Options Setup

### Script Name Options
- `notion-sync`
- `supabase-backup`
- `report-generator`
- `email-sender`
- `data-validator`
- `file-processor`
- Add more as needed...

### Project Options
- `SkiplumXGE`
- `LandingssideEnergi`
- `General`
- `Testing`
- Add your projects...

### Status Options
- `Success` (Green)
- `Failed` (Red)
- `Partial` (Yellow)
- `Running` (Blue)
- `Cancelled` (Gray)
- `Timeout` (Orange)

### Environment Options
- `Production`
- `Development`
- `Test`
- `Local`

### Trigger Options
- `Scheduled`
- `Manual`
- `API`
- `Webhook`
- `Event`
- `Error-Retry`

## Formulas to Add

### Success Rate
```
if(prop("Records Processed") > 0,
  round(prop("Records Success") / prop("Records Processed") * 100) & "%",
  "N/A")
```

### Duration Formatted
```
if(prop("Duration (sec)") < 60,
  prop("Duration (sec)") & " sec",
  if(prop("Duration (sec)") < 3600,
    round(prop("Duration (sec)") / 60) & " min",
    round(prop("Duration (sec)") / 3600 * 10) / 10 & " hours"
  )
)
```

### Status Emoji
```
if(prop("Status") == "Success", "✅",
  if(prop("Status") == "Failed", "❌",
    if(prop("Status") == "Running", "🔄",
      if(prop("Status") == "Partial", "⚠️", "⏸️")
    )
  )
)
```

## Views to Create

### 1. **Today's Runs**
- Filter: Start Time is today
- Sort: Start Time descending

### 2. **Failed Runs**
- Filter: Status is Failed
- Sort: Start Time descending
- Show: Error Message, Action Required

### 3. **By Project**
- Group by: Project
- Sort: Start Time descending

### 4. **Performance Issues**
- Filter: Duration > 300 seconds OR Success Rate < 80%
- Sort: Duration descending

### 5. **Action Required**
- Filter: Action Required is checked AND Resolved is unchecked
- Sort: Start Time descending

### 6. **Statistics Dashboard**
- View: Gallery or Board
- Group by: Script Name
- Show: Count, Average Duration, Success Rate

## Python Integration Code

Add this to your `notion_sync_standalone.py`:

```python
def log_to_notion(run_id, script_name, project, status, start_time, end_time,
                  records_processed=0, records_success=0, records_failed=0,
                  error_message=None, error_details=None, **kwargs):
    """Log run details to Notion logging database"""

    LOGGING_DB_ID = "YOUR_LOGGING_DATABASE_ID"  # Add to .env

    properties = {
        "Run ID": {"title": [{"text": {"content": run_id}}]},
        "Script Name": {"select": {"name": script_name}},
        "Project": {"select": {"name": project}},
        "Status": {"select": {"name": status}},
        "Start Time": {"date": {"start": start_time.isoformat()}},
        "End Time": {"date": {"start": end_time.isoformat()}},
        "Duration (sec)": {"number": (end_time - start_time).total_seconds()},
        "Environment": {"select": {"name": os.getenv('ENVIRONMENT', 'Production')}},
        "Records Processed": {"number": records_processed},
        "Records Success": {"number": records_success},
        "Records Failed": {"number": records_failed},
        "Machine Name": {"rich_text": [{"text": {"content": os.environ.get('COMPUTERNAME', 'Unknown')}}]},
        "User": {"rich_text": [{"text": {"content": os.environ.get('USERNAME', 'Unknown')}}]},
        "Trigger": {"select": {"name": kwargs.get('trigger', 'Scheduled')}},
        "Version": {"rich_text": [{"text": {"content": kwargs.get('version', '1.0.0')}}]},
    }

    if error_message:
        properties["Has Errors"] = {"checkbox": True}
        properties["Error Message"] = {"rich_text": [{"text": {"content": error_message[:2000]}}]}
        if error_details:
            properties["Error Details"] = {"rich_text": [{"text": {"content": error_details[:2000]}}]}

    # Add any additional kwargs as properties
    for key, value in kwargs.items():
        if key not in ['trigger', 'version'] and value is not None:
            if isinstance(value, bool):
                properties[key] = {"checkbox": value}
            elif isinstance(value, (int, float)):
                properties[key] = {"number": value}
            else:
                properties[key] = {"rich_text": [{"text": {"content": str(value)[:2000]}}]}

    # Create the log entry
    url = "https://api.notion.com/v1/pages"
    payload = {
        "parent": {"database_id": LOGGING_DB_ID},
        "properties": properties
    }

    try:
        response = requests.post(url, headers=notion_headers, json=payload)
        response.raise_for_status()
        logger.info(f"✓ Logged to Notion: {run_id}")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to log to Notion: {e}")
        return None

# Use in main function:
def main():
    start_time = datetime.now()
    run_id = f"{start_time.strftime('%Y%m%d-%H%M%S')}-notion-sync"

    # ... your sync code ...

    end_time = datetime.now()

    # Log to Notion
    log_to_notion(
        run_id=run_id,
        script_name="notion-sync",
        project="SkiplumXGE",
        status="Success" if results["success"] else "Failed",
        start_time=start_time,
        end_time=end_time,
        records_processed=sum([results["calculations"], results["features"], results["formulas"]]),
        records_success=sum([results["calculations"], results["features"], results["formulas"]]),
        records_failed=0,
        error_message=results.get("errors", [None])[0] if results.get("errors") else None,
        api_calls=3,
        source_system=["Notion"],
        target_system=["Supabase"]
    )
```

## Benefits of This Schema

✅ **Universal** - Works for any automation script
✅ **Searchable** - Find issues across all projects
✅ **Metrics** - Track performance over time
✅ **Debugging** - Full error details preserved
✅ **Accountability** - Know who ran what and when
✅ **Actionable** - Track what needs fixing
✅ **Scalable** - Add properties as needed

## Quick Setup Steps

1. Create new Notion database called "Automation Logs"
2. Add all properties from the schema above
3. Create the suggested views
4. Get the database ID
5. Add logging code to your scripts
6. Test with a manual run

This gives you a enterprise-grade logging system in Notion!