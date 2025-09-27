# Notion Automation Logging Database Setup (V2)

## Required: Projects Database

First, create a "Projects" database with these properties:

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Name** | Title | Name of the project (Notion's default title) | `SkiplumXGE` |
| **Description** | Text | What this project does | `Notion to Supabase sync for energy app` |
| **Status** | Select | Project status | `Active`, `Paused`, `Archived` |
| **Owner** | Person | Who owns this project | `@EdKjo` |
| **Created** | Created time | When project was created | `2024-01-01` |

Add your projects:
- SkiplumXGE
- LandingssideEnergi
- AutomatiseringGullbrand
- etc.

## Database Schema: "Automation Logs"

Create a new Notion database with these properties for comprehensive logging:

### Core Properties (Required)

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Name** (or rename to **Run ID**) | Title | Unique identifier for this run (Notion's mandatory title) | `2024-01-15-10:30:45-notion-sync` |
| **Script Name** | Text | Which script/flow ran (auto-populated) | `notion_sync_standalone.py` |
| **Project** | Relation | Link to Projects database | `→ SkiplumXGE` |
| **Status** | Select | Run outcome | `Success`, `Failed`, `Partial`, `Running` |
| **Start Time** | Date & Time | When execution started | `2024-01-15 10:30:45` |
| **End Time** | Date & Time | When execution ended | `2024-01-15 10:31:02` |
| **Duration (sec)** | Number | How long it took | `17` |
| **Environment** | Text | Where it ran (auto-detected) | `Production` |

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
| **Script Path** | Text | Full path to script | `D:\AutomatiseringGullbrand\skiplumXGE\notion-supabase\scripts\notion_sync_standalone.py` |
| **Machine Name** | Text | Which machine ran it | `DESKTOP-ABC123` |
| **User** | Text | User account that ran it | `edkjo` |
| **Trigger** | Text | How it was triggered | `Task Scheduler` |
| **Version** | Text | Script version | `1.2.0` |
| **Config File** | Text | Config file used | `D:\...\notion-supabase\.env` |
| **Python Version** | Text | Python version used | `3.11.5` |

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
| **Source Systems** | Text | Where data came from (comma-separated) | `Notion, GitHub` |
| **Target Systems** | Text | Where data went to (comma-separated) | `Supabase, Email` |
| **Sync Type** | Text | Type of operation | `Full` |
| **Last Sync ID** | Text | Reference to previous run | `2024-01-15-04:30:12-notion-sync` |

### Notification & Actions

| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Alert Sent** | Checkbox | Whether alert was sent | ☐ |
| **Alert Recipients** | Text | Who was notified | `admin@company.com` |
| **Action Required** | Checkbox | Needs manual intervention | ☑ |
| **Action Notes** | Text | What needs to be done | `Check API credentials` |
| **Resolved** | Checkbox | Issue has been resolved | ☐ |

## Only Use Select for These (Limited Options)

### Status Options (Keep as Select)
- `Success` (Green)
- `Failed` (Red)
- `Partial` (Yellow)
- `Running` (Blue)
- `Cancelled` (Gray)
- `Timeout` (Orange)

## Updated Python Integration Code

```python
import os
import sys
import platform

# Add to your .env file:
# NOTION_LOGGING_DB_ID=your-logging-database-id
# NOTION_PROJECT_DB_ID=your-projects-database-id
# PROJECT_NAME=SkiplumXGE  # Name to match in Projects database

def get_project_page_id(project_name):
    """Find the project page ID from the Projects database"""

    project_db_id = os.getenv('NOTION_PROJECT_DB_ID')
    if not project_db_id:
        logger.warning("NOTION_PROJECT_DB_ID not set")
        return None

    # Query the Projects database for the project
    url = f"https://api.notion.com/v1/databases/{project_db_id}/query"
    payload = {
        "filter": {
            "property": "Name",  # Notion's default title property
            "title": {
                "equals": project_name
            }
        }
    }

    try:
        response = requests.post(url, headers=notion_headers, json=payload)
        response.raise_for_status()
        data = response.json()

        if data['results']:
            return data['results'][0]['id']
        else:
            logger.warning(f"Project '{project_name}' not found in Projects database")
            return None
    except Exception as e:
        logger.error(f"Failed to find project: {e}")
        return None

def log_to_notion(run_id, status, start_time, end_time,
                  records_processed=0, records_success=0, records_failed=0,
                  error_message=None, error_details=None, details=None):
    """Log run details to Notion logging database"""

    if not LOGGING_DB_ID:
        logger.warning("NOTION_LOGGING_DB_ID not set, skipping Notion logging")
        return None

    duration = (end_time - start_time).total_seconds()

    # Auto-detect script information
    script_name = os.path.basename(sys.argv[0])  # Gets actual script name
    script_path = os.path.abspath(sys.argv[0])   # Gets full path

    # Auto-detect environment info
    machine_name = platform.node() or os.environ.get('COMPUTERNAME', 'Unknown')
    user_name = os.getlogin() or os.environ.get('USERNAME', 'Unknown')
    python_version = platform.python_version()

    # Detect trigger (Task Scheduler, Manual, etc.)
    trigger = "Manual"
    if os.environ.get('TASK_SCHEDULER'):
        trigger = "Task Scheduler"
    elif os.environ.get('GITHUB_ACTIONS'):
        trigger = "GitHub Actions"
    elif os.environ.get('POWER_AUTOMATE'):
        trigger = "Power Automate"

    # Get project page ID for relation (gracefully handle if not found)
    project_page_id = get_project_page_id(PROJECT_NAME)

    properties = {
        # Core properties
        "Name": {"title": [{"text": {"content": run_id}}]},  # Notion's mandatory title field
        "Script Name": {"rich_text": [{"text": {"content": script_name}}]},
        "Status": {"select": {"name": status}},  # Keep as select
        "Start Time": {"date": {"start": start_time.isoformat()}},
        "End Time": {"date": {"start": end_time.isoformat()}},
        "Duration (sec)": {"number": duration},
        "Environment": {"rich_text": [{"text": {"content": os.getenv('ENVIRONMENT', 'Production')}}]},

        # Results
        "Records Processed": {"number": records_processed},
        "Records Success": {"number": records_success},
        "Records Failed": {"number": records_failed},

        # Metadata
        "Script Path": {"rich_text": [{"text": {"content": script_path}}]},
        "Machine Name": {"rich_text": [{"text": {"content": machine_name}}]},
        "User": {"rich_text": [{"text": {"content": user_name}}]},
        "Trigger": {"rich_text": [{"text": {"content": trigger}}]},
        "Version": {"rich_text": [{"text": {"content": SCRIPT_VERSION}}]},
        "Config File": {"rich_text": [{"text": {"content": ENV_PATH}}]},
        "Python Version": {"rich_text": [{"text": {"content": python_version}}]},

        # Performance
        "API Calls": {"number": 6},  # 3 fetches from Notion, 3 posts to Supabase
    }

    # Add Project relation if found (graceful - won't fail if project doesn't exist)
    if project_page_id:
        properties["Project"] = {"relation": [{"id": project_page_id}]}
    else:
        # Fallback: store project name as text in Action Notes if relation fails
        properties["Action Notes"] = {"rich_text": [{"text": {"content": f"Project: {PROJECT_NAME}"}}]}

    # Add source and target systems
    if details:
        properties["Source Systems"] = {"rich_text": [{"text": {"content": "Notion"}}]}
        properties["Target Systems"] = {"rich_text": [{"text": {"content": "Supabase"}}]}

    # Add error information if present
    if error_message:
        properties["Has Errors"] = {"checkbox": True}
        properties["Error Message"] = {"rich_text": [{"text": {"content": str(error_message)[:2000]}}]}
        properties["Error Count"] = {"number": 1}

        if error_details:
            properties["Error Details"] = {"rich_text": [{"text": {"content": str(error_details)[:2000]}}]}

    # Add sync details if provided
    if details:
        sync_summary = f"Calculations: {details.get('calculations', 0)}, "
        sync_summary += f"Features: {details.get('features', 0)}, "
        sync_summary += f"Formulas: {details.get('formulas', 0)}"
        properties["Action Notes"] = {"rich_text": [{"text": {"content": sync_summary}}]}

    # Create the log entry
    url = "https://api.notion.com/v1/pages"
    payload = {
        "parent": {"database_id": LOGGING_DB_ID},
        "properties": properties
    }

    try:
        response = requests.post(url, headers=notion_headers, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"✓ Logged to Notion: {run_id}")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to log to Notion: {e}")
        return None
```

## Benefits of Text Fields

✅ **No Maintenance** - New scripts automatically work
✅ **Auto-populated** - Script name detected from filename
✅ **Flexible** - Any project name works
✅ **Path Tracking** - Full script path stored
✅ **Version Info** - Python version captured

## Views to Create

### 1. **Today's Runs**
- Filter: Start Time is today
- Sort: Start Time descending

### 2. **Failed Runs**
- Filter: Status is Failed
- Sort: Start Time descending

### 3. **By Script**
- Group by: Script Name (now text field)
- Sort: Start Time descending

### 4. **By Project**
- Group by: Project (now text field)
- Sort: Start Time descending

### 5. **Performance Issues**
- Filter: Duration > 300 seconds OR Success Rate < 80%
- Sort: Duration descending

### 6. **Unique Scripts**
- Use Notion's "Unique values" view for Script Name
- See all different scripts that have logged

## Quick Setup Steps

1. Create new Notion database called "Automation Logs"
2. Add all properties from the schema above
3. Only use Select for "Status" field
4. Everything else is Text or Number
5. Create the suggested views
6. Get the database ID
7. Add to `.env`:
   ```env
   NOTION_LOGGING_DB_ID=your-logging-database-id
   ```

This way you can add ANY script from ANY project and it will just work!