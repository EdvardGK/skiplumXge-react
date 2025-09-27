"""
Standalone Notion to Supabase Sync Script for Windows Task Scheduler
Reads credentials from .env file
"""

import json
import sys
import os
from datetime import datetime
import logging

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
    print("Please create .env file with:")
    print("  NOTION_API_KEY=your_key")
    print("  NEXT_PUBLIC_SUPABASE_URL=your_url")
    print("  SUPABASE_SERVICE_KEY=your_key")
    sys.exit(1)

# Get configuration from environment variables
NOTION_API_KEY = os.getenv('NOTION_API_KEY')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Validate credentials
if not all([NOTION_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    print("ERROR: Missing required environment variables in .env file")
    print(f"  NOTION_API_KEY: {'✓' if NOTION_API_KEY else '✗ Missing'}")
    print(f"  NEXT_PUBLIC_SUPABASE_URL: {'✓' if SUPABASE_URL else '✗ Missing'}")
    print(f"  SUPABASE_SERVICE_KEY: {'✓' if SUPABASE_KEY else '✗ Missing'}")
    sys.exit(1)

# Notion Database IDs (hardcoded since they don't change often)
NOTION_DBS = {
    "calculations": "27a2fc6e265980dd911cef9a20616899",
    "features": "27a2fc6e26598041ab4dcf7c090035d2",
    "formulas": "27a2fc6e26598071912ec979a9c18a7a"
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
        logging.StreamHandler()  # Also print to console
    ]
)

logger = logging.getLogger(__name__)

# Log configuration status (without exposing secrets)
logger.info("Configuration loaded:")
logger.info(f"  Notion API Key: ...{NOTION_API_KEY[-8:]}")
logger.info(f"  Supabase URL: {SUPABASE_URL}")
logger.info(f"  Supabase Key: ...{SUPABASE_KEY[-8:]}")

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

        # Add upsert headers
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
    """Main sync function"""
    logger.info("=" * 50)
    logger.info("NOTION → SUPABASE SYNC")
    logger.info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Using .env from: {ENV_PATH}")
    logger.info("=" * 50)

    results = {
        "calculations": 0,
        "features": 0,
        "formulas": 0,
        "success": True,
        "timestamp": datetime.now().isoformat(),
        "errors": []
    }

    try:
        # Sync each type
        results["calculations"] = sync_calculations()
        results["features"] = sync_features()
        results["formulas"] = sync_formulas()

        logger.info("\n" + "=" * 50)
        logger.info("SYNC COMPLETE")
        logger.info(f"Calculations: {results['calculations']}")
        logger.info(f"Features: {results['features']}")
        logger.info(f"Formulas: {results['formulas']}")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"\n✗ Sync failed with error: {str(e)}")
        results["success"] = False
        results["errors"].append(str(e))

    # Write status file for monitoring
    write_status_file(results)

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