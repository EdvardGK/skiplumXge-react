# Supabase Database Setup

This folder contains all the SQL scripts and tools needed to set up the Supabase database for the Norwegian Energy Analysis application.

## Quick Start

1. **Run the complete setup** in Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of setup_all.sql
   ```

2. **Migrate your data**:
   ```bash
   python migration_script.py --supabase-url YOUR_URL --supabase-key YOUR_KEY
   ```

3. **Verify setup**:
   ```sql
   -- Run test_queries.sql in Supabase SQL Editor
   ```

## File Overview

| File | Purpose | Run Order |
|------|---------|-----------|
| `01_tables.sql` | Core table definitions | 1 |
| `02_indexes.sql` | Performance indexes | 2 |
| `03_rls_policies.sql` | Row Level Security | 3 |
| `04_functions.sql` | Utility functions | 4 |
| `05_views.sql` | Analytics views | 5 |
| `06_triggers.sql` | Database triggers | 6 |
| `setup_all.sql` | **Complete setup** | **All-in-one** |
| `test_queries.sql` | Verification tests | After setup |
| `migration_script.py` | Data migration tool | After setup |

## Database Schema

### Core Tables

#### `energy_certificates`
- **Purpose**: Enova energy certificate data (162,025+ records)
- **Key Fields**: `address`, `postal_code`, `energy_class`, `energy_consumption`
- **Indexes**: Address search, postal code, energy class
- **Access**: Public read, service write

#### `user_searches`
- **Purpose**: Track user address searches
- **Key Fields**: `session_id`, `search_query`, `selected_address`
- **Access**: Public insert, service read

#### `analysis_results`
- **Purpose**: Store calculated energy analysis
- **Key Fields**: `session_id`, `investment_room_kr`, `annual_waste_kr`
- **Access**: Session-based read/write

#### `conversion_events`
- **Purpose**: Track user conversions
- **Key Fields**: `action_type`, `session_id`, `analysis_id`
- **Access**: Public insert, service read

### Key Functions

- `search_addresses(query, limit)` - Fuzzy address search
- `calculate_tek17_requirement(type, bra)` - TEK17 compliance calculation
- `calculate_investment_potential(...)` - Investment analysis
- `get_postal_statistics(postal)` - Area energy statistics

### Analytics Views

- `recent_analyses` - Recent calculations with conversion status
- `daily_conversion_funnel` - Daily conversion metrics
- `building_category_stats` - Building type statistics
- `high_waste_opportunities` - Top investment opportunities

## Setup Instructions

### 1. Database Setup

Run in Supabase SQL Editor:
```sql
-- Copy entire contents of setup_all.sql and execute
```

Or run files individually:
```sql
\i 01_tables.sql
\i 02_indexes.sql
\i 03_rls_policies.sql
\i 04_functions.sql
\i 05_views.sql
\i 06_triggers.sql
```

### 2. Data Migration

Install dependencies:
```bash
pip install supabase-py
```

Run migration:
```bash
# Test with limited records
python migration_script.py \
  --supabase-url "https://your-project.supabase.co" \
  --supabase-key "your-anon-key" \
  --data-path "/path/to/production_data" \
  --limit 1000 \
  --verify

# Full migration
python migration_script.py \
  --supabase-url "https://your-project.supabase.co" \
  --supabase-key "your-service-key" \
  --data-path "/path/to/production_data" \
  --batch-size 1000 \
  --verify
```

### 3. Verification

Run test queries in Supabase SQL Editor:
```sql
-- Copy contents of test_queries.sql
```

Expected results:
- ✓ 5 tables created
- ✓ 15+ indexes created
- ✓ 8+ RLS policies active
- ✓ Functions working
- ✓ Views populated

## Performance Characteristics

### Expected Performance

| Operation | Target Time | Index Used |
|-----------|-------------|------------|
| Address search | < 50ms | `idx_energy_certificates_address_search` |
| Postal lookup | < 20ms | `idx_energy_certificates_postal_code` |
| Session queries | < 30ms | `idx_*_session_id` |
| Analytics views | < 200ms | Multiple composite indexes |

### Optimization Features

- **Trigram Search**: Norwegian address fuzzy matching
- **Partial Indexes**: Common query patterns only
- **Materialized Views**: Expensive aggregations cached
- **Batch Operations**: 1000 records per transaction

## Security Model

### Row Level Security (RLS)

| Table | Anon User Access | Service Role Access |
|-------|------------------|-------------------|
| `energy_certificates` | Read only | Full access |
| `user_searches` | Insert only | Full access |
| `analysis_results` | Session-based | Full access |
| `conversion_events` | Insert only | Full access |

### Session Management

```typescript
// Set session context for RLS
await supabase.rpc('set_session_context', { session_id: 'user_session_123' })

// User can now access their analysis results
const { data } = await supabase
  .from('analysis_results')
  .select('*')
  .eq('session_id', 'user_session_123')
```

## API Integration

### Supabase Client Setup

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Common Queries

```typescript
// Search addresses
const { data: addresses } = await supabase
  .rpc('search_addresses', {
    query_text: 'Oslo',
    limit_count: 10
  })

// Get building statistics
const { data: stats } = await supabase
  .rpc('get_postal_statistics', { postal: '0001' })

// Save analysis result
const { data: analysis } = await supabase
  .from('analysis_results')
  .insert({
    session_id: sessionId,
    address: 'Testveien 1',
    building_type: 'Kontor',
    total_bra: 200,
    current_consumption: 180
  })

// Track conversion
const { data: conversion } = await supabase
  .rpc('track_conversion', {
    p_session_id: sessionId,
    p_action_type: 'contact_form',
    p_address: 'Testveien 1'
  })
```

## Maintenance

### Regular Tasks

```sql
-- Refresh materialized views (daily)
SELECT refresh_materialized_views();

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Monitor index usage
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;

-- Clean old session data (monthly)
DELETE FROM user_searches WHERE timestamp < NOW() - INTERVAL '90 days';
DELETE FROM analysis_results WHERE created_at < NOW() - INTERVAL '90 days';
```

### Backup Strategy

- **Automatic**: Supabase handles daily backups
- **Manual**: Export critical tables before major changes
- **Point-in-time**: Recovery available for 7 days (Pro plan)

## Troubleshooting

### Common Issues

1. **Migration fails**: Check data format and batch size
2. **RLS blocks access**: Verify session context is set
3. **Slow queries**: Check index usage with `EXPLAIN ANALYZE`
4. **High storage**: Archive old session data

### Debug Queries

```sql
-- Check RLS context
SELECT current_setting('app.session_id', true);

-- Monitor active connections
SELECT * FROM pg_stat_activity;

-- Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname='public';
```

## Migration Notes

### Data Quality

- **162,025 records** from Enova CSV
- **Norwegian format handling**: Dates, decimals, addresses
- **Validation**: Energy consumption ranges, postal codes
- **Normalization**: Address formatting, energy classes

### Performance

- **Batch size**: 1000 records optimal for Supabase
- **Memory usage**: ~160MB total data size
- **Indexes**: Created after data load for speed
- **Error handling**: Individual record fallback

---

## Next Steps

1. **Run setup_all.sql** in Supabase
2. **Execute migration script** with your data
3. **Test with test_queries.sql**
4. **Integrate with React app** using API examples
5. **Monitor performance** with provided queries

For questions or issues, check the logs and verify all steps completed successfully.