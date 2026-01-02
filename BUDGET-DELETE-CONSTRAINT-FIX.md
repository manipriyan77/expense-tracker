# Budget/Goal Delete Constraint Fix

## Issue
When trying to delete a budget, getting this error:
```
new row for relation "transactions" violates check constraint "transactions_expense_budget_check"
```

## Root Cause

The database has a **CHECK constraint** that enforces:
```sql
ALTER TABLE transactions ADD CONSTRAINT transactions_expense_budget_check
  CHECK (type = 'income' OR (type = 'expense' AND budget_id IS NOT NULL));
```

This constraint ensures that **all expense transactions MUST have a budget_id**.

### The Problem:
1. Budget has a foreign key relationship with transactions: `budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL`
2. When you delete a budget, PostgreSQL tries to set `budget_id` to NULL for all linked transactions
3. But the CHECK constraint prevents `budget_id` from being NULL for expense transactions
4. Result: **Constraint violation error**

## Solution

### Approach: Prevent Deletion of Budgets with Linked Transactions

Instead of allowing the deletion and dealing with orphaned transactions, we:
1. **Check for linked transactions** before attempting deletion
2. **Prevent deletion** if transactions exist
3. **Show helpful error message** to the user

This is the safest approach because:
- ✅ Maintains data integrity
- ✅ Prevents orphaned transactions
- ✅ Gives user control over what to do with transactions
- ✅ Follows the constraint's intent (expenses must have budgets)

## Implementation

### 1. Updated Budget Delete API

**File:** `app/api/budgets/[id]/route.ts`

```typescript
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // ... auth checks ...
  
  // Check if there are any transactions linked to this budget
  const { data: linkedTransactions } = await supabase
    .from("transactions")
    .select("id")
    .eq("budget_id", params.id)
    .eq("user_id", user.id)
    .limit(1);

  // If there are linked transactions, prevent deletion
  if (linkedTransactions && linkedTransactions.length > 0) {
    return NextResponse.json({ 
      error: "Cannot delete budget with linked transactions. Please delete or reassign the transactions first.",
      hasTransactions: true 
    }, { status: 400 });
  }

  // No linked transactions, safe to delete
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
  
  // ... return success ...
}
```

### 2. Updated Goal Delete API

**File:** `app/api/goals/[id]/route.ts`

Same pattern applied to goals (though goals don't have the same constraint, it's good practice):

```typescript
// Check if there are any transactions linked to this goal
const { data: linkedTransactions } = await supabase
  .from("transactions")
  .select("id")
  .eq("goal_id", params.id)
  .eq("user_id", user.id)
  .limit(1);

if (linkedTransactions && linkedTransactions.length > 0) {
  return NextResponse.json({ 
    error: "Cannot delete goal with linked transactions. Please delete the transactions first or they will be unlinked.",
    hasTransactions: true 
  }, { status: 400 });
}
```

### 3. Updated Stores to Handle Errors

**Files:** `store/budgets-store.ts`, `store/goals-store.ts`

```typescript
deleteBudget: async (id) => {
  set({ loading: true, error: null });
  try {
    const response = await fetch(`/api/budgets/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete budget");
    }

    set((state) => ({
      budgets: state.budgets.filter((budget) => budget.id !== id),
      loading: false,
    }));
  } catch (error) {
    console.error("Error deleting budget:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete budget";
    set({ error: errorMessage, loading: false });
    // Re-throw to let the UI handle it
    throw error;
  }
},
```

### 4. Updated UI to Show Error Messages

**Files:** `app/(main)/budgets/page.tsx`, `app/(main)/goals/page.tsx`

```typescript
const handleDeleteBudget = async (id: string) => {
  if (confirm("Are you sure you want to delete this budget?")) {
    try {
      await deleteBudget(id);
    } catch (error) {
      // Show alert to user
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  }
};
```

## User Experience

### Before Fix:
1. User clicks delete on budget
2. Cryptic database error appears
3. User confused, budget not deleted

### After Fix:
1. User clicks delete on budget
2. If budget has transactions:
   - Clear error message: "Cannot delete budget with linked transactions. Please delete or reassign the transactions first."
   - User understands what to do
3. If budget has no transactions:
   - Budget deleted successfully

## How to Delete a Budget with Transactions

Users now have two options:

### Option 1: Delete Transactions First
1. Open budget details modal
2. Go to Transactions tab
3. Delete all transactions linked to the budget
4. Close modal
5. Delete the budget (will now succeed)

### Option 2: Reassign Transactions (Future Enhancement)
- Could add feature to reassign transactions to another budget
- Would require UI for selecting target budget
- Would update all transactions at once

## Alternative Solutions Considered

### ❌ Remove the CHECK Constraint
**Rejected because:**
- Would allow expense transactions without budgets
- Defeats the purpose of mandatory budget tracking
- Could lead to data inconsistencies

### ❌ Cascade Delete Transactions
**Rejected because:**
- Would delete user's transaction history
- Loss of financial data is unacceptable
- User should explicitly choose to delete transactions

### ❌ Auto-reassign to "Uncategorized" Budget
**Rejected because:**
- Requires creating/maintaining a special budget
- Hides the problem instead of solving it
- User loses visibility into budget changes

### ✅ Prevent Deletion with Clear Message (Chosen)
**Advantages:**
- Maintains data integrity
- User stays in control
- Clear communication
- Follows principle of least surprise

## Database Constraint Details

### Current Constraint:
```sql
ALTER TABLE transactions ADD CONSTRAINT transactions_expense_budget_check
  CHECK (type = 'income' OR (type = 'expense' AND budget_id IS NOT NULL));
```

**What it enforces:**
- Income transactions: `budget_id` can be NULL
- Expense transactions: `budget_id` MUST NOT be NULL

### Foreign Key Behavior:
```sql
budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL
```

**What it does:**
- When a budget is deleted, tries to set `budget_id` to NULL
- This conflicts with the CHECK constraint for expense transactions

## Testing

### Test Case 1: Delete Budget with Transactions
1. Create a budget
2. Add expense transactions to the budget
3. Try to delete the budget
4. **Expected:** Error message appears
5. **Verify:** Budget still exists, transactions unchanged

### Test Case 2: Delete Budget without Transactions
1. Create a budget
2. Don't add any transactions (or delete all existing ones)
3. Try to delete the budget
4. **Expected:** Budget deleted successfully
5. **Verify:** Budget removed from list

### Test Case 3: Delete Transactions Then Budget
1. Create a budget with transactions
2. Open budget details modal
3. Delete all transactions from the Transactions tab
4. Close modal
5. Delete the budget
6. **Expected:** Budget deleted successfully
7. **Verify:** Both budget and transactions are gone

### Test Case 4: Delete Goal with Transactions
1. Create a goal
2. Add transactions linked to the goal
3. Try to delete the goal
4. **Expected:** Error message appears
5. **Verify:** Goal still exists, transactions unchanged

## Files Modified

### API Routes:
- ✅ `app/api/budgets/[id]/route.ts` - Added transaction check
- ✅ `app/api/goals/[id]/route.ts` - Added transaction check

### Stores:
- ✅ `store/budgets-store.ts` - Re-throw errors for UI handling
- ✅ `store/goals-store.ts` - Re-throw errors for UI handling

### UI Pages:
- ✅ `app/(main)/budgets/page.tsx` - Show error alerts
- ✅ `app/(main)/goals/page.tsx` - Show error alerts

## Summary

✅ **Fixed:** Budget delete constraint violation error
✅ **Prevents:** Deletion of budgets with linked transactions
✅ **Shows:** Clear error messages to users
✅ **Maintains:** Data integrity and transaction history
✅ **Guides:** Users to delete transactions first

The error is now handled gracefully with helpful user guidance!

