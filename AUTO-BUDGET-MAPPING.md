# Automatic Budget Mapping System

## Overview
The expense tracker now features **automatic budget mapping** for transactions. When you add a transaction, the system automatically links it to a matching budget based on the category and subtype, eliminating the need for manual budget selection.

## How It Works

### 1. **Automatic Budget Detection**
When you create an expense transaction, the system:
1. Looks at the transaction's **category** and **subtype**
2. Searches for matching budgets in this priority order:
   - **Exact Match**: Budget with same category AND subtype
   - **Category Match**: Budget with same category but null subtype (category-level budget)
3. Automatically links the transaction to the first matching budget found

### 2. **Automatic Budget Tracking**
Once a transaction is linked to a budget:
- The transaction amount is **automatically added** to the budget's `spent_amount`
- Budget progress is updated in real-time
- Budget warnings appear if limits are approached or exceeded

### 3. **Transaction Lifecycle Tracking**

#### **Creating a Transaction**
```
User adds expense: $50 for "Groceries" (Food → Groceries)
↓
System finds matching budget: "Food → Groceries" ($500/month)
↓
Transaction is linked to budget automatically
↓
Budget spent_amount: $200 → $250 (added $50)
```

#### **Updating a Transaction**
```
User changes amount: $50 → $75
↓
System updates budget spent_amount: $250 → $275 (added $25 difference)

OR

User changes category: Food → Transportation
↓
System removes $50 from Food budget: $250 → $200
↓
System adds $50 to Transportation budget: $100 → $150
```

#### **Deleting a Transaction**
```
User deletes transaction: $50 for "Groceries"
↓
System subtracts from budget spent_amount: $250 → $200 (removed $50)
```

## Budget Matching Logic

### Priority 1: Exact Match (Category + Subtype)
If you have a budget for **"Food → Groceries"** and add a transaction with:
- Category: "Food"
- Subtype: "Groceries"

→ Transaction is linked to the **"Food → Groceries"** budget

### Priority 2: Category-Only Match
If no exact match exists, but you have a budget for **"Food"** (with null subtype):
- Category: "Food"
- Subtype: "Groceries"

→ Transaction is linked to the **"Food"** budget (category-level)

### No Match
If no matching budget exists:
- Transaction is created without a budget link
- No budget tracking occurs
- User sees a notification suggesting to create a budget

## User Interface Changes

### Transaction Form
**Before (Mandatory Selection):**
```
Category: [Food ▼]
Subtype: [Groceries ▼]
Budget: [Select budget *] ← REQUIRED
```

**After (Automatic Mapping):**
```
Category: [Food ▼]
Subtype: [Groceries ▼]
Budget: (Optional) [Auto-select ▼] ← OPTIONAL
ℹ️ Transaction will be automatically linked to matching budget
```

### Budget Information Display
When entering a transaction, you'll see:
- **If matching budget exists**: Shows available budgets with option to manually select
- **If no matching budget**: Shows info message with link to create budget
- **Budget warnings**: Real-time warnings if transaction will exceed budget

## API Changes

### POST `/api/transactions`
**Request Body:**
```json
{
  "amount": 50,
  "description": "Grocery shopping",
  "category": "Food",
  "subtype": "Groceries",
  "type": "expense",
  "budgetId": null,  // Optional - auto-mapped if not provided
  "goalId": "goal-123",  // Optional
  "date": "2026-01-02"
}
```

**Backend Process:**
1. Receives transaction data
2. If `budgetId` is null/empty, searches for matching budget
3. Links transaction to found budget (if any)
4. Updates budget's `spent_amount`
5. Returns created transaction with `budget_id` populated

### PUT `/api/transactions/[id]`
**Handles budget changes:**
- If budget changes: Updates both old and new budget spent amounts
- If amount changes: Updates budget spent amount by difference
- If category/subtype changes: Re-maps to new matching budget

### DELETE `/api/transactions/[id]`
**Handles cleanup:**
- Retrieves transaction before deletion
- Subtracts amount from linked budget's spent_amount
- Deletes transaction

## Database Schema

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subtype TEXT,
  budget_id UUID REFERENCES budgets(id),  -- Auto-populated
  goal_id UUID REFERENCES goals(id),
  type TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Budgets Table
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  category TEXT NOT NULL,
  subtype TEXT,  -- NULL for category-level budgets
  limit_amount DECIMAL NOT NULL,
  spent_amount DECIMAL DEFAULT 0,  -- Auto-updated
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Examples

### Example 1: Exact Match
**Budget Setup:**
- Budget 1: "Food → Groceries" - $300/month
- Budget 2: "Food → Dining Out" - $200/month

**Transaction:**
- Category: "Food"
- Subtype: "Groceries"
- Amount: $50

**Result:** Linked to "Food → Groceries" budget

### Example 2: Category Match
**Budget Setup:**
- Budget 1: "Transportation" - $400/month (no subtype)

**Transaction:**
- Category: "Transportation"
- Subtype: "Fuel"
- Amount: $60

**Result:** Linked to "Transportation" budget (category-level)

### Example 3: Multiple Transactions
**Budget Setup:**
- Budget: "Food → Groceries" - $300/month

**Transactions:**
1. Add $50 for groceries → Budget spent: $50
2. Add $75 for groceries → Budget spent: $125
3. Update first to $60 → Budget spent: $135 (added $10 difference)
4. Delete second → Budget spent: $60 (removed $75)

### Example 4: No Matching Budget
**Budget Setup:**
- Budget 1: "Food → Groceries" - $300/month

**Transaction:**
- Category: "Entertainment"
- Subtype: "Movies"
- Amount: $25

**Result:** Transaction created without budget link, user notified to create budget

## Benefits

### For Users
✅ **Faster transaction entry** - No need to manually select budgets
✅ **Automatic tracking** - Budget progress updates automatically
✅ **Smart matching** - System finds the best matching budget
✅ **Flexible** - Can still manually select budget if needed
✅ **Real-time warnings** - Know immediately if exceeding budget

### For Developers
✅ **Cleaner UX** - Less form fields, simpler interface
✅ **Automatic sync** - Budget amounts always accurate
✅ **Flexible architecture** - Supports both auto and manual mapping
✅ **Audit trail** - All budget changes tracked through transactions

## Migration Notes

### Existing Transactions
- Transactions created before this feature will have `budget_id` set to their manually selected budget
- No migration needed - system works with both auto-mapped and manually-mapped transactions

### Backward Compatibility
- API still accepts `budgetId` in request body
- If provided, uses that budget instead of auto-mapping
- Existing integrations continue to work

## Testing Checklist

- [ ] Create expense with exact budget match (category + subtype)
- [ ] Create expense with category-only budget match
- [ ] Create expense with no matching budget
- [ ] Update transaction amount and verify budget updates
- [ ] Update transaction category and verify budget re-mapping
- [ ] Delete transaction and verify budget amount decreases
- [ ] Create multiple transactions and verify cumulative budget tracking
- [ ] Check budget warnings appear correctly
- [ ] Verify budget progress bars update in real-time
- [ ] Test with both auto-mapped and manually selected budgets

## Troubleshooting

### Budget not updating?
1. Check if transaction is linked to budget (check `budget_id` field)
2. Verify budget exists for that category/subtype
3. Check if transaction type is "expense" (only expenses update budgets)

### Wrong budget linked?
1. Check budget matching priority (exact match > category match)
2. Verify transaction category and subtype are correct
3. Manually select correct budget in transaction form

### Budget spent_amount incorrect?
1. Check all transactions linked to that budget
2. Verify no duplicate transactions
3. Check transaction update/delete history

## Future Enhancements

- [ ] Budget recommendations based on spending patterns
- [ ] Automatic budget creation for new categories
- [ ] Smart subtype suggestions
- [ ] Budget rollover for unused amounts
- [ ] Multi-budget allocation for single transaction
- [ ] Budget templates for common expense patterns

