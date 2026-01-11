# Budget Templates Fix Guide

## Issue
Unable to create new budget templates because the `budget_templates` table doesn't exist in the Supabase database yet.

## Root Cause
The `budget_templates` table is defined in the migration files but hasn't been applied to your Supabase database.

## Solution

### Step 1: Run the SQL Migration in Supabase

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `database/migrations/create-budget-templates-table.sql`
5. Click **Run** to execute the SQL

### Step 2: Verify the Table Exists

After running the migration, verify the table was created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'budget_templates';
```

You should see `budget_templates` in the results.

### Step 3: Test Creating a Budget Template

1. Go to your app's Budget Templates page
2. Click **Create Template**
3. Fill in the form:
   - Template Name (e.g., "My Monthly Budget")
   - Description (e.g., "My personal monthly budget template")
4. Click **From Current Budgets** to load your existing budgets
5. Click **Create Template**

The template should now be created successfully!

## Troubleshooting

### If you still get errors:

1. **Check RLS Policies**: Make sure the Row Level Security policies are created correctly
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'budget_templates';
   ```

2. **Check User Authentication**: Make sure you're logged in with a valid user account

3. **Check Browser Console**: Open DevTools (F12) and check the Console tab for any error messages

4. **Check Network Tab**: In DevTools, go to the Network tab and check the API requests to `/api/budget-templates` - look for error responses

### Common Errors:

- **"relation 'budget_templates' does not exist"**: The migration wasn't run - go back to Step 1
- **"permission denied"**: RLS policies aren't set up correctly - re-run the migration SQL
- **"Unauthorized"**: You're not logged in - sign in again

## What's Fixed

✅ Created `budget_templates` table with proper schema
✅ Added indexes for better performance
✅ Set up Row Level Security (RLS) policies
✅ Added trigger for automatic `updated_at` timestamp

## Next Steps

After the table is created, you can:
1. Create your own custom budget templates
2. Apply system templates (Student, Family, Freelancer)
3. Export/Import templates
4. Edit and delete your templates

---

**Created**: January 11, 2026
**Status**: Ready to apply
