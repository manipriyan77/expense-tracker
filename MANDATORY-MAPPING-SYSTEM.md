# 🎯 Mandatory Budget & Goal Mapping System

## 📋 Overview

Your expense tracker now enforces strict mapping rules to ensure every transaction is properly tracked:

### ✅ Requirements:
1. **Every transaction MUST be mapped to a budget** (Required)
2. **Every savings transaction MUST be mapped to a goal** (Required)
3. **Income CAN be mapped to a goal** (Optional)

This ensures complete financial tracking and accountability!

---

## 🔄 How It Works

### Rule 1: Budget Mapping (MANDATORY for ALL transactions)

**When adding ANY transaction:**
- User selects Category → Subtype
- System shows matching budgets
- User MUST select a budget
- Transaction cannot be saved without a budget

**Budget Matching Logic:**
1. **Exact Match**: Budget with same category AND subtype
2. **Fallback Match**: Budget with same category (null subtype)
3. **No Match**: Shows warning + link to create budget

**Example:**
```
Transaction: Food → Groceries → $50
Budgets Available:
  ✅ Food → Groceries → $400/month ← Exact match
  ✅ Food → (Any) → $1000/month ← Fallback
```

### Rule 2: Goal Mapping (MANDATORY for Savings)

**When adding Savings transaction:**
- Category = "Savings"
- Goal selection becomes REQUIRED
- Must select which goal this contributes to
- Transaction cannot be saved without a goal

**When adding Income:**
- Goal selection is OPTIONAL
- Can link to goal for automatic progress tracking

**Example:**
```
Transaction: Savings → Emergency Fund → $200
Goals Available:
  ✅ Emergency Fund → $5000 / $10,000
  ✅ Vacation Fund → $1000 / $5,000
```

---

## 🎨 UI Changes

### 1. Budget Selection (New Required Field)

```
┌────────────────────────────────────┐
│ Budget * (Required for tracking)  │
├────────────────────────────────────┤
│ [ Food → Groceries         ▼ ]    │
│   $400 / monthly                   │
└────────────────────────────────────┘
```

**Features:**
- ✅ Shows all matching budgets for selected category/subtype
- ✅ Displays budget limit and period
- ✅ Disabled until category + subtype selected
- ✅ Shows warning if no budget exists
- ✅ Link to create budget if needed

**States:**
- **Before Selection**: "Select category & subtype first"
- **No Budget Found**: "⚠️ No budget found - create one first"  
- **Budget Available**: Shows list of matching budgets

### 2. Goal Selection (Conditional Required)

```
For Savings:
┌────────────────────────────────────┐
│ 🎯 Link to Goal * REQUIRED         │
├────────────────────────────────────┤
│ [ Emergency Fund           ▼ ]    │
│   $5,000 / $10,000                │
└────────────────────────────────────┘
```

**Color Coding:**
- 🔴 **Red border/background**: Required (Savings)
- 🟢 **Green border/background**: Optional (Income)

**Features:**
- ✅ Shows only active goals
- ✅ Displays current progress for each goal
- ✅ Required for savings (cannot submit without)
- ✅ Optional for income
- ✅ Shows warning if no goals exist
- ✅ Link to create goal if needed

---

## 🗄️ Database Changes

### Updated Transactions Table Schema

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT NOT NULL,              -- Required
  budget_id UUID NOT NULL,             -- NEW! Required reference to budgets
  goal_id UUID,                        -- NEW! Optional reference to goals
  date DATE NOT NULL,
  type transaction_type NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (budget_id) REFERENCES budgets(id),
  FOREIGN KEY (goal_id) REFERENCES goals(id)
);
```

### New Indexes

```sql
CREATE INDEX idx_transactions_budget_id ON transactions(budget_id);
CREATE INDEX idx_transactions_goal_id ON transactions(goal_id);
```

**Benefits:**
- ✅ Fast lookups by budget
- ✅ Fast lookups by goal
- ✅ Efficient reporting queries

---

## 📊 Migration Steps

### Step 1: Add Columns to Database

Run in Supabase SQL Editor:

```sql
-- Add budget_id column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_transactions_budget_id ON transactions(budget_id);
```

### Step 2: Create Budgets

Before users can add transactions, they need budgets:

```sql
-- Example: Create budget for groceries
INSERT INTO budgets (user_id, category, subtype, limit_amount, period)
VALUES (
  'YOUR_USER_ID',
  'Food',
  'Groceries',
  400,
  'monthly'
);
```

### Step 3: Create Goals (For Savings)

For savings transactions, create goals:

```sql
-- Example: Create emergency fund goal
INSERT INTO goals (user_id, title, target_amount, current_amount, target_date, category)
VALUES (
  'YOUR_USER_ID',
  'Emergency Fund',
  10000,
  0,
  '2026-12-31',
  'Savings'
);
```

---

## 🎯 User Workflows

### Workflow 1: Adding Expense Transaction

1. **Select Type**: Expense
2. **Enter Amount**: $50
3. **Select Category**: Food
4. **Select Subtype**: Groceries (required)
5. **Select Budget**: Food → Groceries → $400/month (required)
6. **See Warning**: "You're at 95% of your budget"
7. **Submit**: Transaction saved with budget_id

### Workflow 2: Adding Savings Transaction

1. **Select Type**: Expense
2. **Enter Amount**: $200
3. **Select Category**: Savings
4. **Select Subtype**: Emergency Fund (required)
5. **Select Budget**: Savings → Emergency Fund → $500/month (required)
6. **Select Goal**: Emergency Fund - $5000/$10,000 (REQUIRED - Red box)
7. **Submit**: Transaction saved with budget_id AND goal_id
8. **Result**: Goal progress updates to $5200/$10,000

### Workflow 3: Adding Income Transaction

1. **Select Type**: Income
2. **Enter Amount**: $3000
3. **Select Category**: Salary
4. **Select Subtype**: Monthly (required)
5. **Select Budget**: Income → Salary → $3000/month (required)
6. **Select Goal**: Emergency Fund (Optional - Green box)
7. **Submit**: Transaction saved with budget_id (and goal_id if selected)

---

## ⚠️ Validation Rules

### Frontend Validation (Form)

```typescript
// Budget is always required
budgetId: z.string().min(1, "Budget selection is required")

// Goal required only for savings
.refine((data) => {
  if (data.category === "Savings" && !data.goalId) {
    return false;
  }
  return true;
}, {
  message: "Goal selection is required for savings transactions",
  path: ["goalId"],
})
```

### Backend Validation (API)

```typescript
// Check required fields
if (!budgetId) {
  return error("Budget selection is required");
}

// Check goal for savings
if (category === "Savings" && !goalId) {
  return error("Goal selection is required for savings");
}
```

---

## 📈 Benefits

### For Users:
- ✅ **Complete Tracking**: Every transaction mapped to budget
- ✅ **No Orphans**: No unmapped transactions
- ✅ **Better Insights**: Know exactly where money goes
- ✅ **Goal Progress**: Automatic goal updates
- ✅ **Budget Warnings**: See status before saving

### For Data Quality:
- ✅ **Consistent**: All transactions have budgets
- ✅ **Reportable**: Easy to generate reports
- ✅ **Analyzable**: Clear spending patterns
- ✅ **Trackable**: Goal progress automatic

### For Accountability:
- ✅ **Forced Planning**: Must create budgets first
- ✅ **Conscious Spending**: See budget impact
- ✅ **Goal-Oriented**: Savings linked to goals
- ✅ **Complete Picture**: Nothing untracked

---

## 🛠️ Implementation Checklist

### Database:
- [x] Add `budget_id` column to transactions
- [x] Add `goal_id` column to transactions
- [x] Create indexes for performance
- [x] Update foreign key constraints

### Frontend:
- [x] Add budget selection to form (required)
- [x] Make goal selection required for savings
- [x] Update form validation
- [x] Add budget/goal fetching
- [x] Show matching budgets based on category/subtype
- [x] Add visual indicators (red for required)
- [x] Add warnings for missing budgets/goals

### Backend:
- [x] Update POST /api/transactions (validate budget_id)
- [x] Update PUT /api/transactions/[id]
- [x] Validate goal_id for savings
- [x] Auto-update goal progress

### Store:
- [x] Update Transaction interface
- [x] Add budget_id to transformations
- [x] Update all CRUD operations

---

## 🎨 UI Examples

### Expense Transaction (Budget Required)
```
┌─────────────────────────────────────────┐
│ Add Transaction                    ✕    │
├─────────────────────────────────────────┤
│ Type: [Expense]  Amount: $50           │
│ Category: Food                          │
│ Subtype: Groceries                      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Budget * Required                   │ │
│ │ [ Food → Groceries         ▼ ]     │ │
│ │   $400 / monthly                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ Budget Status                        │
│ You're at 95% of budget                │
│ Remaining: $20                         │
│                                         │
│ [Cancel]  [Add Transaction]            │
└─────────────────────────────────────────┘
```

### Savings Transaction (Budget + Goal Required)
```
┌─────────────────────────────────────────┐
│ Add Transaction                    ✕    │
├─────────────────────────────────────────┤
│ Type: [Expense]  Amount: $200          │
│ Category: Savings                       │
│ Subtype: Emergency Fund                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Budget * Required                   │ │
│ │ [ Savings → Emergency Fund ▼ ]     │ │
│ │   $500 / monthly                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🎯 Link to Goal * REQUIRED          │ │
│ │ (Savings must be linked to a goal) │ │
│ │                                     │ │
│ │ [ Emergency Fund           ▼ ]     │ │
│ │   $5,000 / $10,000                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancel]  [Add Transaction]            │
└─────────────────────────────────────────┘
```

---

## 🐛 Error Messages

### No Budget Exists
```
⚠️ No budget exists for Food → Groceries
Create one to continue
```

### No Goal Exists (for Savings)
```
⚠️ No active goals found
Create a goal first to save money towards it
```

### Missing Budget Selection
```
❌ Budget selection is required
Please select a budget to continue
```

### Missing Goal (for Savings)
```
❌ Goal selection is required for savings transactions
Please select which goal this contributes to
```

---

## 🎉 Summary

Your expense tracker now enforces:

1. ✅ **Every transaction → Budget** (Mandatory)
2. ✅ **Every savings → Goal** (Mandatory)
3. ✅ **Complete tracking** (No orphan transactions)
4. ✅ **Better insights** (Know where every dollar goes)

This creates a comprehensive, accountable financial tracking system!

**Next Steps:**
1. Run database migration
2. Create initial budgets
3. Create savings goals
4. Start tracking with complete mapping!

🚀 **Your finances are now fully tracked and organized!**

