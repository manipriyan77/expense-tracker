# Stocks Import - Optional Fields Update

## What Changed

Made `sector`, `sub_sector`, and `stock_type` columns **optional** in the stocks table and throughout the application.

## Files Modified

### 1. Database Migration (`database/migrations/ensure-stocks-columns.sql`)

- Changed columns to default to `NULL` instead of default values
- Makes these fields truly optional in the database

### 2. Stock Interface (`store/stocks-store.ts`)

```typescript
// Before
stockType: "large_cap" | "mid_cap" | "small_cap" | "etf" | "other";
sector: string;
subSector?: string;

// After
stockType?: "large_cap" | "mid_cap" | "small_cap" | "etf" | "other" | null;
sector?: string | null;
subSector?: string | null;
```

### 3. API Route (`app/api/stocks/route.ts`)

- Changed from default values (`"General"`, `"other"`) to `null`
- Now stores `null` when these fields are not provided

### 4. Stocks Page (`app/(main)/stocks/page.tsx`)

- CSV import no longer sends sector/subSector/stockType fields
- Display handles `null` values gracefully:
  ```typescript
  {
    stock.symbol;
  }
  {
    stock.sector && ` • ${formatLabel(stock.sector)}`;
  }
  {
    stock.subSector && ` • ${formatLabel(stock.subSector)}`;
  }
  {
    stock.stockType && ` • ${formatLabel(stock.stockType)}`;
  }
  ```

## Migration Steps

### Run this SQL in Supabase:

```sql
-- Make sector columns optional (allow NULL)
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS sub_sector TEXT DEFAULT NULL;

ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS stock_type TEXT DEFAULT NULL;

ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT NULL;
```

## Benefits

1. **CSV Import Works Immediately**: No need for sector/subsector data in CSV files
2. **Cleaner Data**: No fake "General" or "other" values cluttering your database
3. **Flexible**: Add sector information manually later if needed
4. **Accurate**: Only shows sector info when it's actually available

## Example

**Before CSV Import:**

```
GOLDBEES • Consumer Discretionary • Other • Large Cap
```

**After (with optional fields):**

```
GOLDBEES
```

You can manually edit each stock later to add:

- Stock Type (Large Cap, Mid Cap, Small Cap, ETF)
- Sector (Technology, Financials, etc.)
- Sub-Sector (detailed classification)
