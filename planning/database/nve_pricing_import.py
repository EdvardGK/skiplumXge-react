#!/usr/bin/env python3
"""
NVE Electricity Pricing Data Import Script
Imports weekly electricity spot prices by Norwegian price zones to Supabase

Data Source: NVE (Norwegian Water Resources and Energy Directorate)
URL: https://www.nve.no/energi/analyser-og-statistikk/kraftpriser-og-kraftsystemdata/

Usage:
    python nve_pricing_import.py --csv-path path/to/nve_data.csv
"""

import os
import sys
import csv
import re
import argparse
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging
from pathlib import Path

# Try to import required packages
try:
    from supabase import create_client, Client
except ImportError:
    print("Please install supabase-py: pip install supabase")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    # Load .env file from same directory
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    print("Please install python-dotenv: pip install python-dotenv")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class NVEPricingImporter:
    """Handles import of NVE electricity pricing data to Supabase"""

    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize importer with Supabase credentials

        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service key
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)

    def parse_week_identifier(self, week_str: str) -> tuple[int, int]:
        """
        Parse week identifier from NVE format to year and week number

        Args:
            week_str: Week string in format "38-2025"

        Returns:
            Tuple of (year, week_number)
        """
        try:
            # Match pattern like "38-2025"
            match = re.match(r'(\d{1,2})-(\d{4})', week_str)
            if match:
                week_number = int(match.group(1))
                year = int(match.group(2))
                return year, week_number
            else:
                raise ValueError(f"Invalid week format: {week_str}")
        except Exception as e:
            logger.error(f"Error parsing week identifier '{week_str}': {e}")
            raise

    def validate_zone_code(self, zone: str) -> bool:
        """
        Validate Norwegian electricity zone code

        Args:
            zone: Zone code to validate

        Returns:
            True if valid zone code
        """
        valid_zones = {'NO1', 'NO2', 'NO3', 'NO4', 'NO5'}
        return zone in valid_zones

    def parse_price(self, price_str: str) -> Optional[float]:
        """
        Parse price string to float

        Args:
            price_str: Price as string

        Returns:
            Price as float or None if invalid
        """
        try:
            if not price_str or price_str.strip() == '':
                return None
            # Handle Norwegian decimal format (comma as decimal separator)
            cleaned_price = price_str.replace(',', '.')
            price = float(cleaned_price)
            # Validate reasonable price range (0-1000 øre/kWh)
            if 0 <= price <= 1000:
                return price
            else:
                logger.warning(f"Price outside reasonable range: {price} øre/kWh")
                return price  # Still import but log warning
        except (ValueError, TypeError) as e:
            logger.error(f"Error parsing price '{price_str}': {e}")
            return None

    def transform_csv_row(self, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Transform CSV row to database format

        Args:
            row: Raw CSV row dictionary

        Returns:
            Transformed row for database insertion or None if invalid
        """
        try:
            # Extract fields from CSV
            week = row.get('Uke', '').strip()
            price_str = row.get('Gjennomsnitt Pris (øre/kWh)', '')
            zone = row.get('Område slicer', '').strip()

            # Validate required fields
            if not week or not zone:
                logger.warning(f"Missing required fields in row: {row}")
                return None

            # Validate zone
            if not self.validate_zone_code(zone):
                logger.warning(f"Invalid zone code: {zone}")
                return None

            # Parse week
            try:
                year, week_number = self.parse_week_identifier(week)
            except ValueError as e:
                logger.error(f"Invalid week format: {week}")
                return None

            # Parse price
            spot_price = self.parse_price(price_str)
            if spot_price is None:
                logger.warning(f"Invalid price for {zone} week {week}: {price_str}")
                return None

            # Create database record
            return {
                'week': week,
                'year': year,
                'week_number': week_number,
                'zone': zone,
                'spot_price_ore_kwh': spot_price,
                'data_source': 'NVE',
                'source_url': 'https://www.nve.no/energi/analyser-og-statistikk/kraftpriser-og-kraftsystemdata/'
            }

        except Exception as e:
            logger.error(f"Error transforming row {row}: {e}")
            return None

    def import_from_csv(self, csv_path: str, batch_size: int = 100) -> tuple[int, int]:
        """
        Import NVE pricing data from CSV file to Supabase

        Args:
            csv_path: Path to CSV file
            batch_size: Number of records to insert per batch

        Returns:
            Tuple of (success_count, error_count)
        """
        logger.info(f"Starting NVE pricing import from {csv_path}")

        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found: {csv_path}")

        total_rows = 0
        success_count = 0
        error_count = 0
        batch = []

        # Detect file encoding
        encoding = 'utf-8-sig'  # Handle BOM if present
        try:
            with open(csv_path, 'r', encoding=encoding) as file:
                # Test if file can be read
                file.read(100)
        except UnicodeDecodeError:
            encoding = 'latin1'  # Fallback encoding
            logger.info(f"Using fallback encoding: {encoding}")

        with open(csv_path, 'r', encoding=encoding) as file:
            reader = csv.DictReader(file)

            for row_num, row in enumerate(reader, 1):
                total_rows += 1

                try:
                    # Transform row
                    transformed = self.transform_csv_row(row)
                    if transformed:
                        batch.append(transformed)

                        # Insert batch when full
                        if len(batch) >= batch_size:
                            success_batch, error_batch = self._insert_batch(batch)
                            success_count += success_batch
                            error_count += error_batch
                            logger.info(f"Processed batch: {success_count} success, {error_count} errors")
                            batch = []
                    else:
                        error_count += 1

                except Exception as e:
                    error_count += 1
                    logger.error(f"Error processing row {row_num}: {e}")

            # Insert remaining batch
            if batch:
                success_batch, error_batch = self._insert_batch(batch)
                success_count += success_batch
                error_count += error_batch

        logger.info(f"Import complete: {success_count} success, {error_count} errors out of {total_rows} total rows")
        return success_count, error_count

    def _insert_batch(self, batch: List[Dict[str, Any]]) -> tuple[int, int]:
        """
        Insert a batch of records to Supabase with upsert logic

        Args:
            batch: List of record dictionaries

        Returns:
            Tuple of (success_count, error_count)
        """
        try:
            # Use upsert to handle duplicates (update on conflict)
            result = self.supabase.table('electricity_prices_nve').upsert(
                batch,
                on_conflict='week,zone'  # Update if week+zone combination already exists
            ).execute()

            return len(batch), 0

        except Exception as e:
            logger.error(f"Failed to insert batch: {e}")

            # Try inserting one by one to identify problem records
            success_count = 0
            error_count = 0

            for i, record in enumerate(batch):
                try:
                    self.supabase.table('electricity_prices_nve').upsert(
                        record,
                        on_conflict='week,zone'
                    ).execute()
                    success_count += 1
                except Exception as individual_error:
                    error_count += 1
                    logger.error(f"Failed individual record {i}: {individual_error}")
                    logger.debug(f"Problem record: {record}")

            return success_count, error_count

    def get_import_summary(self) -> Dict[str, Any]:
        """
        Get summary of imported data

        Returns:
            Dictionary with import statistics
        """
        try:
            # Get total record count
            total_result = self.supabase.table('electricity_prices_nve') \
                .select('count', count='exact') \
                .execute()
            total_records = total_result.count if hasattr(total_result, 'count') else 0

            # Get date range
            range_result = self.supabase.table('electricity_prices_nve') \
                .select('year,week') \
                .order('year', desc=False) \
                .limit(1) \
                .execute()

            earliest = range_result.data[0] if range_result.data else None

            range_result = self.supabase.table('electricity_prices_nve') \
                .select('year,week') \
                .order('year', desc=True) \
                .limit(1) \
                .execute()

            latest = range_result.data[0] if range_result.data else None

            # Get zone coverage
            zones_result = self.supabase.table('electricity_prices_nve') \
                .select('zone') \
                .execute()

            unique_zones = set(record['zone'] for record in zones_result.data) if zones_result.data else set()

            return {
                'total_records': total_records,
                'earliest_data': earliest,
                'latest_data': latest,
                'zones_covered': sorted(list(unique_zones)),
                'zone_count': len(unique_zones)
            }

        except Exception as e:
            logger.error(f"Error getting import summary: {e}")
            return {'error': str(e)}

    def validate_import(self) -> bool:
        """
        Validate the imported data

        Returns:
            True if validation passes
        """
        try:
            # Check that we have data for all 5 zones
            zones_result = self.supabase.table('electricity_prices_nve') \
                .select('zone') \
                .execute()

            unique_zones = set(record['zone'] for record in zones_result.data) if zones_result.data else set()
            expected_zones = {'NO1', 'NO2', 'NO3', 'NO4', 'NO5'}

            if unique_zones != expected_zones:
                logger.error(f"Missing zones. Expected: {expected_zones}, Got: {unique_zones}")
                return False

            # Check for reasonable price ranges
            price_check = self.supabase.table('electricity_prices_nve') \
                .select('spot_price_ore_kwh') \
                .gte('spot_price_ore_kwh', 0) \
                .lte('spot_price_ore_kwh', 1000) \
                .execute()

            logger.info("Import validation passed")
            return True

        except Exception as e:
            logger.error(f"Import validation failed: {e}")
            return False


def main():
    """Main import function"""
    parser = argparse.ArgumentParser(description='Import NVE electricity pricing data to Supabase')
    parser.add_argument('--csv-path',
                       default='../../src/data/Gjennomsnittlig pris (ørekWh) per uke for prisområder NO1, NO2, NO3, NO4, NO5.csv',
                       help='Path to NVE CSV file')
    parser.add_argument('--supabase-url', help='Supabase project URL (or set SUPABASE_URL env var)')
    parser.add_argument('--supabase-key', help='Supabase service key (or set SUPABASE_KEY env var)')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for inserts')
    parser.add_argument('--validate', action='store_true', help='Validate import after completion')
    parser.add_argument('--summary', action='store_true', help='Show import summary')

    args = parser.parse_args()

    # Get configuration from environment variables or command line args
    supabase_url = args.supabase_url or os.getenv('SUPABASE_URL')
    supabase_key = args.supabase_key or os.getenv('SUPABASE_KEY')

    # Validate required parameters
    if not supabase_url:
        print("Error: Supabase URL required. Set SUPABASE_URL env var or use --supabase-url")
        sys.exit(1)

    if not supabase_key:
        print("Error: Supabase key required. Set SUPABASE_KEY env var or use --supabase-key")
        sys.exit(1)

    logger.info(f"Using Supabase URL: {supabase_url}")
    logger.info(f"Using CSV file: {args.csv_path}")

    try:
        # Initialize importer
        importer = NVEPricingImporter(
            supabase_url=supabase_url,
            supabase_key=supabase_key
        )

        # Run import
        success_count, error_count = importer.import_from_csv(
            csv_path=args.csv_path,
            batch_size=args.batch_size
        )

        logger.info(f"Import completed: {success_count} success, {error_count} errors")

        # Validate if requested
        if args.validate:
            if importer.validate_import():
                logger.info("Import validation: PASSED")
            else:
                logger.error("Import validation: FAILED")

        # Show summary if requested
        if args.summary:
            summary = importer.get_import_summary()
            logger.info("Import Summary:")
            for key, value in summary.items():
                logger.info(f"  {key}: {value}")

        logger.info("NVE pricing import complete!")

    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()