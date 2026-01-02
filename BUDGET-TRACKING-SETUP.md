# Budget Tracking with Toast Notifications - Setup Guide

## 🎯 Overview
Your expense tracker now includes budget tracking with automatic warnings when spending reaches 90% of your budget for any category/subtype. Toast notifications will alert you in real-time when adding transactions.

## ✅ What Was Implemented

### 1. **Database Schema Updates**
- Created `budgets` table with the following structure:
  - `id` (UUID)
  - `user_id` (UUID, references auth.users)
  - `category` (TEXT) - matches transaction categories
  - `subtype` (TEXT, optional) - matches transaction subtypes
  - `limit_amount` (DECIMAL) - budget limit
  - `period` (TEXT) - currently supports 'monthly'
  - `created_at`, `updated_at` timestamps
  - Unique constraint on (user_id, category, subtype, period)

### 2. **API Endpoints Created**

#### `/api/budgets` (GET, POST)
- **GET**: Retrieve all budgets for the authenticated user
- **POST**: Create a new budget
  ```json
  {
    "category": "Food",
    "subtype": "Bills",  // optional
    "limit_amount": 500,
    "period": "monthly"
  }
  ```

#### `/api/budgets/[id]` (PUT, DELETE)
- **PUT**: Update an existing budget
- **DELETE**: Delete a budget

#### `/api/budgets/check` (POST)
- **POST**: Check budget status for a transaction
  ```json
  {
    "category": "Food",
    "subtype": "Bills",  // optional
    "amount": 50
  }
  ```
  
  Returns:
  ```json
  {
    "hasBudget": true,
    "totalSpent": 450,
    "newTotal": 500,
    "budgetLimit": 500,
    "percentage": 100,
    "isNearLimit": true,   // >= 90%
    "isOverLimit": true,   // >= 100%
    "remainingAmount": 0
  }
  ```

### 3. **Toast Notifications**
- Installed `sonner` library for beautiful toast notifications
- Integrated into the transactions page
- Shows three types of notifications:
  - ✅ **Success**: Transaction added successfully
  - ⚠️ **Warning**: Budget at 90%+ (shows percentage and remaining amount)
  - ❌ **Error**: Budget exceeded (shows overage amount)

### 4. **Transaction Flow with Budget Check**
When adding an expense transaction:
1. System checks if a budget exists for that category/subtype
2. Calculates current month's spending
3. Compares with budget limit
4. Shows warning toast if >= 90%
5. Shows error toast if >= 100%
6. Transaction is still saved (warnings are informational)

## 🚀 Setup Instructions

### Step 1: Run Database Migration
Execute the updated SQL script in Supabase SQL Editor:

```bash
# The script is located at:
database/setup-missing-tables.sql
```

Or copy and run this specific SQL for budgets:

```sql
-- Create Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT,
  limit_amount DECIMAL(12,2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, subtype, period)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger
CREATE TRIGGER update_budgets_updated_at 
  BEFORE UPDATE ON budgets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 2: Verify Installation
The `sonner` package has already been installed. You can verify:

```bash
pnpm list sonner
# Should show: sonner 2.0.7
```

### Step 3: Create Budgets (Optional)
You can create budgets through:
1. The `/budgets` page in your app (needs to be updated to use real API)
2. Direct API calls:
   ```bash
   curl -X POST http://localhost:3000/api/budgets \
     -H "Content-Type: application/json" \
     -d '{
       "category": "Food",
       "limit_amount": 500,
       "period": "monthly"
     }'
   ```

## 📊 How Budget Matching Works

### Priority Order:
1. **Exact Match**: Budget with matching category AND subtype
2. **Category Match**: Budget with matching category (subtype is null/empty)
3. **No Match**: No warning shown if no budget exists

### Examples:

**Scenario 1**: You have a budget for "Food" → "Bills"
- Transaction: Food, subtype: Bills → ✅ Matches this budget
- Transaction: Food, subtype: Other → ❌ No match (unless category-only budget exists)

**Scenario 2**: You have a budget for "Food" (no subtype)
- Transaction: Food, any subtype → ✅ Matches this budget
- Transaction: Transportation → ❌ No match

## 🎨 Toast Notification Types

### Success (Green)
```
✓ Transaction added successfully!
```

### Warning (Yellow/Orange)
```
⚠ Budget Warning!
You're at 92.5% of your Food budget.
Remaining: $37.50
```

### Error (Red)
```
✗ Budget Exceeded!
This transaction will exceed your Food budget by $25.00.
Current: $525.00 / $500.00
```

## 🔄 Integration Points

### Files Modified:
- ✅ `database/schema.sql` - Added budgets table
- ✅ `database/setup-missing-tables.sql` - Updated setup script
- ✅ `app/(main)/transactions/page.tsx` - Added budget checking and toasts
- ✅ `app/api/budgets/route.ts` - Created (new file)
- ✅ `app/api/budgets/[id]/route.ts` - Created (new file)
- ✅ `app/api/budgets/check/route.ts` - Created (new file)
- ✅ `package.json` - Added sonner dependency

### Files That Need Updates (Optional):
- `app/(main)/budgets/page.tsx` - Currently using mock data, update to use real API

## 🧪 Testing the Feature

1. **Create a budget**:
   - Category: "Food"
   - Limit: $500
   - Period: monthly

2. **Add expense transactions** for "Food":
   - Add $400 → No warning
   - Add $50 → ⚠️ Warning toast (90%)
   - Add $50 → ❌ Error toast (over budget)

3. **Check the toast notifications** appear in the top-right corner

## 🎯 Future Enhancements

- [ ] Support weekly and yearly periods
- [ ] Add budget utilization progress bars in real-time
- [ ] Email notifications for budget warnings
- [ ] Budget recommendations based on spending patterns
- [ ] Carry-over unused budget to next period

## 📝 Notes

- Budgets are calculated per calendar month (1st to last day)
- Budget warnings are informational - transactions are still saved
- Users can set multiple budgets (one per category/subtype combination)
- Toast notifications auto-dismiss after 5 seconds
- All budget operations are protected by Row Level Security (RLS)

## 🐛 Troubleshooting

**Issue**: Toast notifications not showing
- Solution: Make sure the page refreshed after installing sonner

**Issue**: Budget check not working
- Solution: Verify the budgets table was created in Supabase

**Issue**: "Unauthorized" error
- Solution: Ensure user is logged in and auth token is valid

---

**Need Help?** Check the API routes or update the budgets page to use the new API endpoints!

