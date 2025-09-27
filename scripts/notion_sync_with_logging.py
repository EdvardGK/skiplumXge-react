"""
Enhanced version of notion_sync_standalone.py with Notion logging
Copy this to D:\AutomatiseringGullbrand\skiplumXGE\notion-supabase\scripts\
"""

import json
import sys
import os
from datetime import datetime
import logging
import traceback
import platform

# Try to import requests, install if not available
try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

# Try to import python-dotenv, install if not available
try:
    from dotenv import load_dotenv
except ImportError:
    print("Installing python-dotenv...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-dotenv"])
    from dotenv import load_dotenv

# Load environment variables from .env file
ENV_PATH = r"D:\AutomatiseringGullbrand\skiplumXGE\notion-supabase\.env"

if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
    print(f"Loaded .env from: {ENV_PATH}")
else:
    print(f"WARNING: .env file not found at {ENV_PATH}")
    sys.exit(1)

# Get configuration from environment variables
NOTION_API_KEY = os.getenv('NOTION_API_KEY')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
LOGGING_DB_ID = os.getenv('NOTION_LOGGING_DB_ID')  # Add this to your .env

# Script metadata - auto-detected
SCRIPT_VERSION = "1.2.0"
SCRIPT_NAME = os.path.basename(sys.argv[0])  # Auto-detect script name
SCRIPT_PATH = os.path.abspath(sys.argv[0])   # Full path to script
PROJECT_NAME = "SkiplumXGE"  # You can still set this or detect from path

# Validate credentials
if not all([NOTION_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    print("ERROR: Missing required environment variables")
    sys.exit(1)

# Notion Database IDs
NOTION_DBS = {
    "calculations": "27a2fc6e265980dd911cef9a20616899",
    "features": "27a2fc6e26598041ab4dcf7c090035d2",
    "formulas": "27a2fc6e26598071912ec979a9c18a7a",
    "content": ""  # TO BE ADDED: Create Content database in Notion and add ID here
}

# Set up logging
log_dir = os.path.join(os.path.dirname(__file__), "logs")
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

log_file = os.path.join(log_dir, f"sync_{datetime.now().strftime('%Y%m%d')}.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Notion API headers
notion_headers = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}

# Supabase headers
supabase_headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}


def get_project_page_id(project_name):
    """Find the project page ID from the Projects database"""

    project_db_id = os.getenv('NOTION_PROJECT_DB_ID')
    if not project_db_id:
        logger.warning("NOTION_PROJECT_DB_ID not set, skipping project relation")
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
        response = requests.post(url, headers=notion_headers, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data['results']:
            return data['results'][0]['id']
        else:
            logger.warning(f"Project '{project_name}' not found in Projects database")
            return None
    except Exception as e:
        logger.warning(f"Failed to find project: {e}")
        return None


def log_to_notion(run_id, status, start_time, end_time,
                  records_processed=0, records_success=0, records_failed=0,
                  error_message=None, error_details=None, details=None):
    """Log run details to Notion logging database"""

    if not LOGGING_DB_ID:
        logger.warning("NOTION_LOGGING_DB_ID not set, skipping Notion logging")
        return None

    duration = (end_time - start_time).total_seconds()

    # Auto-detect environment info
    machine_name = platform.node() or os.environ.get('COMPUTERNAME', 'Unknown')
    user_name = os.getlogin() if hasattr(os, 'getlogin') else os.environ.get('USERNAME', 'Unknown')
    python_version = platform.python_version()

    # Detect trigger
    trigger = "Manual"
    if os.environ.get('TASK_SCHEDULER'):
        trigger = "Task Scheduler"
    elif os.environ.get('GITHUB_ACTIONS'):
        trigger = "GitHub Actions"
    elif os.environ.get('SESSIONNAME') == 'Console':
        trigger = "Manual"

    # Get project page ID for relation (graceful handling)
    project_page_id = get_project_page_id(PROJECT_NAME)

    properties = {
        "Name": {"title": [{"text": {"content": run_id}}]},  # Notion's mandatory title property
        "Script Name": {"rich_text": [{"text": {"content": SCRIPT_NAME}}]},
        "Script Path": {"rich_text": [{"text": {"content": SCRIPT_PATH}}]},
        "Status": {"select": {"name": status}},  # Keep as select for limited options
        "Start Time": {"date": {"start": start_time.isoformat()}},
        "End Time": {"date": {"start": end_time.isoformat()}},
        "Duration (sec)": {"number": duration},
        "Environment": {"rich_text": [{"text": {"content": os.getenv('ENVIRONMENT', 'Production')}}]},
        "Records Processed": {"number": records_processed},
        "Records Success": {"number": records_success},
        "Records Failed": {"number": records_failed},
        "Machine Name": {"rich_text": [{"text": {"content": machine_name}}]},
        "User": {"rich_text": [{"text": {"content": user_name}}]},
        "Trigger": {"rich_text": [{"text": {"content": trigger}}]},
        "Version": {"rich_text": [{"text": {"content": SCRIPT_VERSION}}]},
        "Config File": {"rich_text": [{"text": {"content": ENV_PATH}}]},
        "Python Version": {"rich_text": [{"text": {"content": python_version}}]},
        "API Calls": {"number": 8},  # 4 fetches from Notion, 4 posts to Supabase
    }

    # Add Project relation if found (graceful - won't fail if project doesn't exist)
    if project_page_id:
        properties["Project"] = {"relation": [{"id": project_page_id}]}
    else:
        # Store project name in Action Notes as fallback
        existing_notes = properties.get("Action Notes", {"rich_text": [{"text": {"content": ""}}]})
        project_note = f"Project: {PROJECT_NAME}"
        if existing_notes["rich_text"][0]["text"]["content"]:
            project_note = f"{existing_notes['rich_text'][0]['text']['content']}\n{project_note}"
        properties["Action Notes"] = {"rich_text": [{"text": {"content": project_note}}]}

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
        sync_summary += f"Formulas: {details.get('formulas', 0)}, "
        sync_summary += f"Content: {details.get('content', 0)}"

        # Store in Action Notes as summary
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


def fetch_notion_database(database_id):
    """Fetch all pages from a Notion database"""
    url = f"https://api.notion.com/v1/databases/{database_id}/query"

    all_results = []
    has_more = True
    next_cursor = None

    while has_more:
        payload = {"page_size": 100}
        if next_cursor:
            payload["start_cursor"] = next_cursor

        try:
            response = requests.post(url, headers=notion_headers, json=payload, timeout=30)
            response.raise_for_status()

            data = response.json()
            all_results.extend(data.get("results", []))
            has_more = data.get("has_more", False)
            next_cursor = data.get("next_cursor")

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching Notion data: {e}")
            return []

    return all_results


def parse_notion_property(prop):
    """Parse different Notion property types"""
    if not prop:
        return None

    prop_type = prop.get("type")

    if prop_type == "title":
        return prop["title"][0]["plain_text"] if prop["title"] else None
    elif prop_type == "number":
        return prop["number"]
    elif prop_type == "checkbox":
        return prop["checkbox"]
    elif prop_type == "select":
        return prop["select"]["name"] if prop["select"] else None
    elif prop_type == "rich_text":
        return prop["rich_text"][0]["plain_text"] if prop["rich_text"] else None
    else:
        return None


def sync_calculations():
    """Sync calculations from Notion to Supabase"""
    logger.info("Syncing calculations...")

    # Fetch from Notion
    notion_data = fetch_notion_database(NOTION_DBS["calculations"])

    if not notion_data:
        logger.warning("No data fetched from Notion calculations")
        return 0

    # Parse Notion data
    calculations = []
    for page in notion_data:
        props = page["properties"]

        calc = {
            "name": parse_notion_property(props.get("Name")),
            "value": parse_notion_property(props.get("Value")),
            "unit": parse_notion_property(props.get("Unit")),
            "category": parse_notion_property(props.get("Category")),
            "description": parse_notion_property(props.get("Description")),
            "min_value": parse_notion_property(props.get("Min Value")),
            "max_value": parse_notion_property(props.get("Max Value"))
        }

        # Only add if name exists
        if calc["name"]:
            calculations.append(calc)

    # Upsert to Supabase
    if calculations:
        url = f"{SUPABASE_URL}/rest/v1/calculations"

        headers = supabase_headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates"

        try:
            response = requests.post(
                url,
                headers=headers,
                json=calculations,
                timeout=30
            )
            response.raise_for_status()

            logger.info(f"✓ Synced {len(calculations)} calculations")
            return len(calculations)

        except requests.exceptions.RequestException as e:
            logger.error(f"✗ Failed to sync calculations: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return 0

    logger.info("No calculations to sync")
    return 0


def sync_features():
    """Sync feature flags from Notion to Supabase"""
    logger.info("Syncing feature flags...")

    # Fetch from Notion
    notion_data = fetch_notion_database(NOTION_DBS["features"])

    if not notion_data:
        logger.warning("No data fetched from Notion features")
        return 0

    # Parse Notion data
    features = []
    for page in notion_data:
        props = page["properties"]

        feature = {
            "feature_name": parse_notion_property(props.get("Feature Name")),
            "enabled": parse_notion_property(props.get("Enabled")) or False,
            "rollout_percentage": parse_notion_property(props.get("Rollout %")) or 0,
            "description": parse_notion_property(props.get("Description"))
        }

        # Only add if feature_name exists
        if feature["feature_name"]:
            features.append(feature)

    # Upsert to Supabase
    if features:
        url = f"{SUPABASE_URL}/rest/v1/feature_flags"

        headers = supabase_headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates"

        try:
            response = requests.post(
                url,
                headers=headers,
                json=features,
                timeout=30
            )
            response.raise_for_status()

            logger.info(f"✓ Synced {len(features)} feature flags")
            return len(features)

        except requests.exceptions.RequestException as e:
            logger.error(f"✗ Failed to sync features: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return 0

    logger.info("No features to sync")
    return 0


def sync_formulas():
    """Sync formulas from Notion to Supabase"""
    logger.info("Syncing formulas...")

    # Fetch from Notion
    notion_data = fetch_notion_database(NOTION_DBS["formulas"])

    if not notion_data:
        logger.warning("No data fetched from Notion formulas")
        return 0

    # Parse Notion data
    formulas = []
    for page in notion_data:
        props = page["properties"]

        # Parse variables (comma-separated string to array)
        variables_str = parse_notion_property(props.get("Variables")) or ""
        variables = [v.strip() for v in variables_str.split(",") if v.strip()]

        formula = {
            "name": parse_notion_property(props.get("Name")),
            "formula": parse_notion_property(props.get("Formula")),
            "variables": variables,
            "description": parse_notion_property(props.get("Description")),
            "category": parse_notion_property(props.get("Category"))
        }

        # Only add if name exists
        if formula["name"]:
            formulas.append(formula)

    # Upsert to Supabase
    if formulas:
        url = f"{SUPABASE_URL}/rest/v1/formulas"

        headers = supabase_headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates"

        try:
            response = requests.post(
                url,
                headers=headers,
                json=formulas,
                timeout=30
            )
            response.raise_for_status()

            logger.info(f"✓ Synced {len(formulas)} formulas")
            return len(formulas)

        except requests.exceptions.RequestException as e:
            logger.error(f"✗ Failed to sync formulas: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return 0

    logger.info("No formulas to sync")
    return 0


def sync_content():
    """Sync content (UI strings and marketing copy) from Notion to Supabase"""
    logger.info("Syncing content...")

    # Skip if Content database ID not configured
    if not NOTION_DBS.get("content"):
        logger.info("Content database ID not configured, skipping content sync")
        return 0

    # Fetch from Notion
    notion_data = fetch_notion_database(NOTION_DBS["content"])

    if not notion_data:
        logger.warning("No data fetched from Notion content")
        return 0

    # Parse Notion data
    content_items = []
    for page in notion_data:
        props = page["properties"]

        content_item = {
            "key": parse_notion_property(props.get("Key")),
            "norwegian_text": parse_notion_property(props.get("Norwegian Text")),
            "english_text": parse_notion_property(props.get("English Text")),
            "category": parse_notion_property(props.get("Category")),
            "context": parse_notion_property(props.get("Context"))
        }

        # Only add if key exists (it's the unique identifier)
        if content_item["key"]:
            content_items.append(content_item)

    # Upsert to Supabase
    if content_items:
        url = f"{SUPABASE_URL}/rest/v1/content"

        headers = supabase_headers.copy()
        headers["Prefer"] = "resolution=merge-duplicates"

        try:
            response = requests.post(
                url,
                headers=headers,
                json=content_items,
                timeout=30
            )
            response.raise_for_status()

            logger.info(f"✓ Synced {len(content_items)} content items")
            return len(content_items)

        except requests.exceptions.RequestException as e:
            logger.error(f"✗ Failed to sync content: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return 0

    logger.info("No content to sync")
    return 0


def write_status_file(results):
    """Write sync status to a file for monitoring"""
    status_file = os.path.join(os.path.dirname(__file__), "last_sync_status.json")

    try:
        with open(status_file, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Status written to {status_file}")
    except Exception as e:
        logger.error(f"Failed to write status file: {e}")


def main():
    """Main sync function with Notion logging"""

    # Track timing
    start_time = datetime.now()
    run_id = f"{start_time.strftime('%Y%m%d-%H%M%S')}-{SCRIPT_NAME}"

    logger.info("=" * 50)
    logger.info("NOTION → SUPABASE SYNC")
    logger.info(f"Run ID: {run_id}")
    logger.info(f"Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Using .env from: {ENV_PATH}")
    logger.info("=" * 50)

    results = {
        "calculations": 0,
        "features": 0,
        "formulas": 0,
        "content": 0,
        "success": True,
        "timestamp": start_time.isoformat(),
        "errors": []
    }

    error_message = None
    error_details = None

    try:
        # Sync each type
        results["calculations"] = sync_calculations()
        results["features"] = sync_features()
        results["formulas"] = sync_formulas()
        results["content"] = sync_content()

        # Calculate totals
        total_processed = sum([results["calculations"], results["features"], results["formulas"], results["content"]])
        total_success = total_processed  # Assuming all processed were successful

        logger.info("\n" + "=" * 50)
        logger.info("SYNC COMPLETE")
        logger.info(f"Calculations: {results['calculations']}")
        logger.info(f"Features: {results['features']}")
        logger.info(f"Formulas: {results['formulas']}")
        logger.info(f"Content: {results['content']}")
        logger.info(f"Total: {total_processed} records")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"\n✗ Sync failed with error: {str(e)}")
        results["success"] = False
        results["errors"].append(str(e))
        error_message = str(e)
        error_details = traceback.format_exc()
        total_processed = sum([results["calculations"], results["features"], results["formulas"], results["content"]])
        total_success = 0

    # Track end time
    end_time = datetime.now()

    # Write status file for monitoring
    write_status_file(results)

    # Log to Notion
    log_to_notion(
        run_id=run_id,
        status="Success" if results["success"] else "Failed",
        start_time=start_time,
        end_time=end_time,
        records_processed=total_processed,
        records_success=total_success if results["success"] else 0,
        records_failed=0 if results["success"] else total_processed,
        error_message=error_message,
        error_details=error_details,
        details=results
    )

    # Exit with appropriate code for Task Scheduler
    sys.exit(0 if results["success"] else 1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\nSync interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)