"""
Notion to Supabase Sync Script for Power Automate
This script can run in Power Automate's Python Script action
"""

import json
import requests
from datetime import datetime

# Configuration - Power Automate will pass these as parameters
import os
NOTION_API_KEY = os.getenv("NOTION_API_KEY", "your-notion-api-key")  # Set via environment variable
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")  # Set via environment variable
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "your-supabase-service-key")  # Set via environment variable

# Notion Database IDs
NOTION_DBS = {
    "calculations": "27a2fc6e265980dd911cef9a20616899",
    "features": "27a2fc6e26598041ab4dcf7c090035d2",
    "formulas": "27a2fc6e26598071912ec979a9c18a7a"
}

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

        response = requests.post(url, headers=notion_headers, json=payload)

        if response.status_code != 200:
            print(f"Error fetching Notion data: {response.text}")
            return []

        data = response.json()
        all_results.extend(data.get("results", []))
        has_more = data.get("has_more", False)
        next_cursor = data.get("next_cursor")

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
    print("Syncing calculations...")

    # Fetch from Notion
    notion_data = fetch_notion_database(NOTION_DBS["calculations"])

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

        response = requests.post(
            url,
            headers=headers,
            json=calculations
        )

        if response.status_code in [200, 201, 204]:
            print(f"✓ Synced {len(calculations)} calculations")
            return len(calculations)
        else:
            print(f"✗ Failed to sync calculations: {response.text}")
            return 0

    print("No calculations to sync")
    return 0


def sync_features():
    """Sync feature flags from Notion to Supabase"""
    print("Syncing feature flags...")

    # Fetch from Notion
    notion_data = fetch_notion_database(NOTION_DBS["features"])

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

        response = requests.post(
            url,
            headers=headers,
            json=features
        )

        if response.status_code in [200, 201, 204]:
            print(f"✓ Synced {len(features)} feature flags")
            return len(features)
        else:
            print(f"✗ Failed to sync features: {response.text}")
            return 0

    print("No features to sync")
    return 0


def sync_formulas():
    """Sync formulas from Notion to Supabase"""
    print("Syncing formulas...")

    # Fetch from Notion
    notion_data = fetch_notion_database(NOTION_DBS["formulas"])

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

        response = requests.post(
            url,
            headers=headers,
            json=formulas
        )

        if response.status_code in [200, 201, 204]:
            print(f"✓ Synced {len(formulas)} formulas")
            return len(formulas)
        else:
            print(f"✗ Failed to sync formulas: {response.text}")
            return 0

    print("No formulas to sync")
    return 0


def main():
    """Main sync function"""
    print("=" * 50)
    print("NOTION → SUPABASE SYNC")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    results = {
        "calculations": 0,
        "features": 0,
        "formulas": 0,
        "success": True,
        "timestamp": datetime.now().isoformat()
    }

    try:
        # Sync each type
        results["calculations"] = sync_calculations()
        results["features"] = sync_features()
        results["formulas"] = sync_formulas()

        print("\n" + "=" * 50)
        print("SYNC COMPLETE")
        print(f"Calculations: {results['calculations']}")
        print(f"Features: {results['features']}")
        print(f"Formulas: {results['formulas']}")
        print("=" * 50)

    except Exception as e:
        print(f"\n✗ Sync failed with error: {str(e)}")
        results["success"] = False
        results["error"] = str(e)

    # Return results as JSON for Power Automate
    return json.dumps(results)


# Power Automate entry point
if __name__ == "__main__":
    result = main()
    print(f"\nOutput for Power Automate:\n{result}")

    # Power Automate can capture this output
    # The script returns a JSON string with sync results