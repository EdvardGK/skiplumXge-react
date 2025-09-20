#!/usr/bin/env python3
"""
Supabase Data Migration Script
Migrates Enova energy certificate data from CSV/SQLite to Supabase

Usage:
    python migration_script.py --supabase-url YOUR_URL --supabase-key YOUR_KEY
"""

import os
import sys
import csv
import json
import sqlite3
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

class EnovaDataMigrator:
    """Handles migration of Enova energy certificate data to Supabase"""

    def __init__(self, supabase_url: str, supabase_key: str, data_path: str):
        """
        Initialize migrator with Supabase credentials

        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase anon/service key
            data_path: Path to production_data folder
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.data_path = Path(data_path)
        self.csv_file = self.data_path / "enova_energimerker_2024.csv"
        self.db_file = self.data_path / "enova_fast_lookup.db"

        # Verify files exist
        if not self.csv_file.exists():
            raise FileNotFoundError(f"CSV file not found: {self.csv_file}")
        if not self.db_file.exists():
            raise FileNotFoundError(f"Database file not found: {self.db_file}")

    def parse_norwegian_date(self, date_str: str) -> Optional[str]:
        """Parse Norwegian date format to ISO format"""
        if not date_str:
            return None
        try:
            # Handle ISO format with timezone
            if 'T' in date_str:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00').split('.')[0])
                return dt.isoformat()
            # Handle other formats
            return date_str
        except:
            return None

    def parse_float(self, value: str, divide_by_100: bool = False) -> Optional[float]:
        """Parse Norwegian decimal format"""
        if not value or value == '':
            return None
        try:
            # Replace comma with dot for decimal
            clean_value = value.replace(',', '.')
            result = float(clean_value)
            if divide_by_100 and result > 1:
                result = result / 100
            return result
        except:
            return None

    def parse_int(self, value: str) -> Optional[int]:
        """Parse integer value"""
        if not value or value == '' or value == '0':
            return None
        try:
            return int(value)
        except:
            return None

    def parse_boolean(self, value: str) -> bool:
        """Parse boolean value"""
        return value.lower() in ['true', '1', 'yes', 'ja']

    def transform_csv_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Transform CSV row to database format"""
        return {
            'knr': self.parse_int(row.get('Knr')),
            'gnr': self.parse_int(row.get('Gnr')),
            'bnr': self.parse_int(row.get('Bnr')),
            'snr': self.parse_int(row.get('Snr')),
            'fnr': self.parse_int(row.get('Fnr')),
            'andelsnummer': row.get('Andelsnummer') if row.get('Andelsnummer') else None,
            'building_number': row.get('Bygningsnummer'),
            'address': row.get('GateAdresse'),
            'postal_code': row.get('Postnummer'),
            'city': row.get('Poststed'),
            'unit_number': row.get('BruksEnhetsNummer'),
            'organization_number': row.get('Organisasjonsnummer') if row.get('Organisasjonsnummer') else None,
            'building_category': row.get('Bygningskategori'),
            'construction_year': self.parse_int(row.get('Byggear')),
            'energy_class': row.get('Energikarakter') if row.get('Energikarakter') else None,
            'heating_class': row.get('Oppvarmingskarakter') if row.get('Oppvarmingskarakter') else None,
            'issue_date': self.parse_norwegian_date(row.get('Utstedelsesdato')),
            'certificate_type': row.get('TypeRegistrering'),
            'certificate_id': row.get('Attestnummer'),
            'energy_consumption': self.parse_float(row.get('BeregnetLevertEnergiTotaltkWhm2')),
            'fossil_percentage': self.parse_float(row.get('BeregnetFossilandel'), divide_by_100=True),
            'material_type': row.get('Materialvalg') if row.get('Materialvalg') else None,
            'has_energy_evaluation': self.parse_boolean(row.get('HarEnergiVurdering', 'False')),
            'energy_evaluation_date': self.parse_norwegian_date(row.get('EnergiVurderingDato'))
        }

    def migrate_from_csv(self, batch_size: int = 1000, limit: Optional[int] = None):
        """
        Migrate data from CSV file to Supabase

        Args:
            batch_size: Number of records to insert per batch
            limit: Optional limit for testing (None for all records)
        """
        logger.info(f"Starting CSV migration from {self.csv_file}")

        total_rows = 0
        success_count = 0
        error_count = 0
        batch = []

        with open(self.csv_file, 'r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)

            for row_num, row in enumerate(reader, 1):
                if limit and row_num > limit:
                    break

                try:
                    # Transform row
                    transformed = self.transform_csv_row(row)
                    batch.append(transformed)

                    # Insert batch when full
                    if len(batch) >= batch_size:
                        self._insert_batch(batch)
                        success_count += len(batch)
                        logger.info(f"Inserted batch: {success_count}/{row_num} records")
                        batch = []

                    total_rows += 1

                except Exception as e:
                    error_count += 1
                    logger.error(f"Error processing row {row_num}: {e}")
                    if error_count > 100:
                        logger.error("Too many errors, aborting")
                        break

            # Insert remaining batch
            if batch:
                self._insert_batch(batch)
                success_count += len(batch)

        logger.info(f"Migration complete: {success_count} inserted, {error_count} errors")
        return success_count, error_count

    def migrate_from_sqlite(self, batch_size: int = 1000, limit: Optional[int] = None):
        """
        Migrate data from SQLite database to Supabase

        Args:
            batch_size: Number of records to insert per batch
            limit: Optional limit for testing
        """
        logger.info(f"Starting SQLite migration from {self.db_file}")

        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get total count
        cursor.execute("SELECT COUNT(*) FROM buildings")
        total_count = cursor.fetchone()[0]
        logger.info(f"Found {total_count} records in SQLite database")

        # Fetch data in batches
        query = "SELECT * FROM buildings"
        if limit:
            query += f" LIMIT {limit}"

        cursor.execute(query)

        success_count = 0
        error_count = 0
        batch = []

        while True:
            rows = cursor.fetchmany(batch_size)
            if not rows:
                break

            for row in rows:
                try:
                    # Map SQLite columns to Supabase schema
                    record = {
                        'address': row['original_address'],
                        'postal_code': row['postal_code'],
                        'building_category': row['building_category'],
                        'energy_consumption': row['energy_consumption'],
                        'energy_class': row['energy_class'],
                        'construction_year': row['construction_year'],
                        'heating_class': row['heating_type'],
                        'fossil_percentage': row['fossil_percentage'],
                        'certificate_id': row['certificate_id'],
                        'organization_number': row['organization_number'],
                        'building_number': row['building_number'],
                        # Set required fields with defaults if missing
                        'city': 'Unknown',  # Would need to parse from address
                    }
                    batch.append(record)

                except Exception as e:
                    error_count += 1
                    logger.error(f"Error processing SQLite row: {e}")

            # Insert batch
            if batch:
                self._insert_batch(batch)
                success_count += len(batch)
                logger.info(f"Inserted {success_count}/{total_count} records")
                batch = []

        conn.close()
        logger.info(f"SQLite migration complete: {success_count} inserted, {error_count} errors")
        return success_count, error_count

    def _insert_batch(self, batch: List[Dict[str, Any]]):
        """Insert a batch of records to Supabase"""
        try:
            # Clean None values and empty strings
            cleaned_batch = []
            for record in batch:
                cleaned_record = {k: v for k, v in record.items()
                                if v is not None and v != ''}
                cleaned_batch.append(cleaned_record)

            # Insert to Supabase
            result = self.supabase.table('energy_certificates').insert(cleaned_batch).execute()

        except Exception as e:
            logger.error(f"Failed to insert batch: {e}")
            # Try inserting one by one to identify problem records
            for i, record in enumerate(batch):
                try:
                    self.supabase.table('energy_certificates').insert(record).execute()
                except Exception as individual_error:
                    logger.error(f"Failed record {i}: {individual_error}")
                    logger.debug(f"Problem record: {record}")

    def verify_migration(self):
        """Verify migration by checking record counts"""
        logger.info("Verifying migration...")

        # Count records in Supabase
        result = self.supabase.table('energy_certificates').select('count', count='exact').execute()
        supabase_count = result.count if hasattr(result, 'count') else 0

        # Count records in CSV
        csv_count = sum(1 for _ in open(self.csv_file, 'r', encoding='utf-8-sig')) - 1

        logger.info(f"Supabase records: {supabase_count}")
        logger.info(f"CSV records: {csv_count}")
        logger.info(f"Migration coverage: {(supabase_count/csv_count)*100:.1f}%")

        return supabase_count, csv_count

    def create_sample_searches(self):
        """Create sample search data for testing"""
        sample_searches = [
            {'session_id': 'test_001', 'search_query': 'Oslo', 'postal_code': '0001'},
            {'session_id': 'test_002', 'search_query': 'Bergen', 'postal_code': '5000'},
            {'session_id': 'test_003', 'search_query': 'Trondheim', 'postal_code': '7000'},
        ]

        for search in sample_searches:
            try:
                self.supabase.table('user_searches').insert(search).execute()
                logger.info(f"Created sample search: {search['search_query']}")
            except Exception as e:
                logger.error(f"Failed to create sample search: {e}")


def main():
    """Main migration function"""
    parser = argparse.ArgumentParser(description='Migrate Enova data to Supabase')
    parser.add_argument('--supabase-url', help='Supabase project URL (or set SUPABASE_URL env var)')
    parser.add_argument('--supabase-key', help='Supabase service key (or set SUPABASE_KEY env var)')
    parser.add_argument('--data-path', help='Path to production_data folder (or set PRODUCTION_DATA_PATH env var)')
    parser.add_argument('--source', choices=['csv', 'sqlite', 'both'], default='csv',
                       help='Data source to migrate from')
    parser.add_argument('--batch-size', type=int, default=1000,
                       help='Batch size for inserts')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit records for testing')
    parser.add_argument('--verify', action='store_true',
                       help='Verify migration after completion')
    parser.add_argument('--create-samples', action='store_true',
                       help='Create sample search data')

    args = parser.parse_args()

    # Get configuration from environment variables or command line args
    supabase_url = args.supabase_url or os.getenv('SUPABASE_URL')
    supabase_key = args.supabase_key or os.getenv('SUPABASE_KEY')
    data_path = args.data_path or os.getenv('PRODUCTION_DATA_PATH', '../../landingsside-energi/production_data')

    # Validate required parameters
    if not supabase_url:
        print("Error: Supabase URL required. Set SUPABASE_URL env var or use --supabase-url")
        sys.exit(1)

    if not supabase_key:
        print("Error: Supabase key required. Set SUPABASE_KEY env var or use --supabase-key")
        sys.exit(1)

    logger.info(f"Using Supabase URL: {supabase_url}")
    logger.info(f"Using data path: {data_path}")

    try:
        # Initialize migrator
        migrator = EnovaDataMigrator(
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            data_path=data_path
        )

        # Run migration
        if args.source in ['csv', 'both']:
            logger.info("Starting CSV migration...")
            success, errors = migrator.migrate_from_csv(
                batch_size=args.batch_size,
                limit=args.limit
            )
            logger.info(f"CSV migration: {success} success, {errors} errors")

        if args.source in ['sqlite', 'both']:
            logger.info("Starting SQLite migration...")
            success, errors = migrator.migrate_from_sqlite(
                batch_size=args.batch_size,
                limit=args.limit
            )
            logger.info(f"SQLite migration: {success} success, {errors} errors")

        # Verify if requested
        if args.verify:
            migrator.verify_migration()

        # Create sample data if requested
        if args.create_samples:
            migrator.create_sample_searches()

        logger.info("Migration complete!")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()