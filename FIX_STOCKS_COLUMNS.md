# Fix: Missing Columns in Stocks Table

## Problem

When importing stocks from CSV, you're getting this error:

```
Error: Could not find the 'sub_sector' column of 'stocks' in the schema cache
```

## Solution

You need to add missing columns to your stocks table in Supabase. These columns are **optional** and can be `NULL`.

## Steps to Fix

### 1. Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Run the Migration

Copy and paste the following SQL:

```sql
-- Ensure stocks table has all required columns for CSV import
-- These columns are optional and can be NULL

-- Add sub_sector column if it doesn't exist (optional field)
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS sub_sector TEXT DEFAULT NULL;

-- Add stock_type column if it doesn't exist (optional field)
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS stock_type TEXT DEFAULT NULL;

-- Add sector column if it doesn't exist (optional field)
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT NULL;

-- Verify columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'stocks'
  AND column_name IN ('sub_sector', 'stock_type', 'sector')
ORDER BY column_name;
```

### 3. Execute the Query

1. Click **RUN** button (or press Ctrl/Cmd + Enter)
2. You should see a success message
3. The verification query will show you all three columns with their types and that they allow NULL values

### 4. Test the Import

Now go back to your app and try importing the stocks CSV again. It should work!

## What This Does

- Adds `sub_sector` column for detailed sector classification (e.g., "auto_parts", "pharma") - **OPTIONAL**
- Adds `stock_type` column for classification (e.g., "large_cap", "mid_cap", "small_cap") - **OPTIONAL**
- Adds `sector` column for broad sector classification (e.g., "consumer_discretionary", "financials") - **OPTIONAL**
- All columns use `IF NOT EXISTS` so it's safe to run multiple times
- All columns default to `NULL`, making them truly optional
- You can edit these fields manually later for each stock

## Why Optional?

When importing from CSV files (like Tickertape), sector and sub-sector information is typically not included. By making these fields optional:

- Import works immediately without requiring extra data
- You can manually categorize stocks later if needed
- The app displays stocks cleanly whether they have sector info or not

## Alternative: Run from File

You can also find this migration in:

```
database/migrations/ensure-stocks-columns.sql
```

Just copy the content and run it in Supabase SQL Editor.
