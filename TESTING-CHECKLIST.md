# Complete Feature Testing Checklist

## 🧪 Testing All CRUD Operations

This document provides a comprehensive testing checklist for all features in the Expense Tracker app.

---

## ✅ Pre-Testing Setup

### 1. Database Tables Created
- [ ] `transactions` table exists
- [ ] `goals` table exists
- [ ] `stocks` table exists
- [ ] `mutual_funds` table exists
- [ ] `budgets` table exists
- [ ] All RLS policies are enabled
- [ ] All triggers are created

### 2. Application Running
```bash
pnpm dev
# Server should be running on http://localhost:3000
```

---

## 1️⃣ TRANSACTIONS Feature

### API Endpoints Status
- ✅ `GET /api/transactions` - List all transactions
- ✅ `POST /api/transactions` - Create transaction
- ✅ `PUT /api/transactions/[id]` - Update transaction
- ✅ `DELETE /api/transactions/[id]` - Delete transaction
- ✅ `POST /api/budgets/check` - Check budget warnings

### Testing Checklist

#### CREATE (Add Transaction)
- [ ] Navigate to `/transactions`
- [ ] Click "Add Transaction" button
- [ ] Fill in transaction details:
  - Type: Income/Expense
  - Amount: e.g., 100
  - Description: e.g., "Test transaction"
  - Category: Select from dropdown
  - Subtype: Select from dropdown (optional)
- [ ] Click "Add Transaction"
- [ ] **Expected**: Toast notification "Transaction added successfully!"
- [ ] **Expected**: New transaction appears in the list
- [ ] **Expected**: Summary cards update (Total Income/Expenses/Balance)

#### READ (View Transactions)
- [ ] Page loads successfully
- [ ] All transactions are displayed
- [ ] Can see: description, category, subtype (badge), amount, date
- [ ] Can filter by tabs: All, Income, Expenses, Recurring
- [ ] Search functionality works
- [ ] **Expected**: Transactions show correct colors (green for income, red for expense)

#### UPDATE (Edit Transaction)
- [ ] Click edit icon on a transaction
- [ ] Modify transaction details
- [ ] Save changes
- [ ] **Expected**: Transaction updates in the list
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Edit functionality needs to be added to UI

#### DELETE (Remove Transaction)
- [ ] Click delete icon on a transaction
- [ ] Confirm deletion
- [ ] **Expected**: Transaction removed from list
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Delete functionality needs to be added to UI

#### BUDGET WARNING (Special Feature)
- [ ] Create a budget for a category (e.g., Food: $500)
- [ ] Add expense transactions totaling > 90% of budget
- [ ] **Expected**: Warning toast appears: "You're at X% of your Food budget"
- [ ] Add expense exceeding 100% of budget
- [ ] **Expected**: Error toast appears: "This will exceed your Food budget by $X"

---

## 2️⃣ GOALS Feature

### API Endpoints Status
- ✅ `GET /api/goals` - List all goals
- ✅ `POST /api/goals` - Create goal
- ✅ `PUT /api/goals/[id]` - Update goal
- ✅ `DELETE /api/goals/[id]` - Delete goal

### Testing Checklist

#### CREATE (Add Goal)
- [ ] Navigate to `/goals`
- [ ] Click "Add Goal" button
- [ ] Fill in goal details:
  - Title: e.g., "Emergency Fund"
  - Target Amount: e.g., 10000
  - Current Amount: e.g., 1000 (optional)
  - Target Date: Select future date
  - Category: e.g., "Savings"
- [ ] Click "Add Goal"
- [ ] **Expected**: Modal closes
- [ ] **Expected**: New goal appears in the list
- [ ] **Expected**: Summary cards update (Total Goals, Active Goals, Progress)

#### READ (View Goals)
- [ ] Page loads successfully
- [ ] All goals are displayed with:
  - Title and category
  - Current amount / Target amount
  - Target date
  - Progress bar
  - Progress percentage
- [ ] Summary cards show correct totals:
  - Total Goals count
  - Active Goals count
  - Completed count
  - Total progress ($X of $Y saved)
- [ ] Progress bar colors:
  - Blue: Active goals
  - Green: Completed goals
  - Red: Overdue goals
- [ ] **Expected**: No "toLocaleString()" errors (FIXED ✅)

#### UPDATE (Edit Goal)
- [ ] Click edit button on a goal
- [ ] Modify goal details
- [ ] Save changes
- [ ] **Expected**: Goal updates in the list
- [ ] **Expected**: Progress bar updates
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Edit functionality needs to be added to UI

#### DELETE (Remove Goal)
- [ ] Click delete button on a goal
- [ ] Confirm deletion
- [ ] **Expected**: Goal removed from list
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Delete functionality needs to be added to UI

---

## 3️⃣ STOCKS Feature

### API Endpoints Status
- ✅ `GET /api/stocks` - List all stocks
- ✅ `POST /api/stocks` - Create stock
- ✅ `PUT /api/stocks/[id]` - Update stock
- ✅ `DELETE /api/stocks/[id]` - Delete stock

### Testing Checklist

#### CREATE (Add Stock)
- [ ] Navigate to `/stocks`
- [ ] Click "Add Stock" button
- [ ] Fill in stock details:
  - Name: e.g., "Apple Inc."
  - Symbol: e.g., "AAPL"
  - Shares: e.g., 10
  - Avg Purchase Price: e.g., 150
  - Current Price: e.g., 175
  - Purchase Date: Select date
  - Sector: e.g., "Technology"
- [ ] Click "Add Stock"
- [ ] **Expected**: New stock appears in the list
- [ ] **Expected**: Invested amount and current value calculated correctly
- [ ] **Expected**: Gain/Loss displayed with correct color

#### READ (View Stocks)
- [ ] Page loads successfully
- [ ] All stocks displayed with:
  - Name and symbol
  - Shares owned
  - Purchase price vs Current price
  - Invested amount vs Current value
  - Gain/Loss ($ and %)
  - Sector
- [ ] Summary cards show:
  - Total Invested
  - Current Value
  - Total Gain/Loss
  - Number of Holdings
- [ ] **Expected**: No data transformation errors (FIXED ✅)

#### UPDATE (Edit Stock)
- [ ] Click edit button on a stock
- [ ] Update current price or shares
- [ ] Save changes
- [ ] **Expected**: Stock updates in the list
- [ ] **Expected**: Gain/Loss recalculated
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Check if edit functionality exists in UI

#### DELETE (Remove Stock)
- [ ] Click delete button on a stock
- [ ] Confirm deletion
- [ ] **Expected**: Stock removed from list
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Check if delete functionality exists in UI

---

## 4️⃣ MUTUAL FUNDS Feature

### API Endpoints Status
- ✅ `GET /api/mutual-funds` - List all mutual funds
- ✅ `POST /api/mutual-funds` - Create mutual fund
- ✅ `PUT /api/mutual-funds/[id]` - Update mutual fund
- ✅ `DELETE /api/mutual-funds/[id]` - Delete mutual fund

### Testing Checklist

#### CREATE (Add Mutual Fund)
- [ ] Navigate to `/mutual-funds`
- [ ] Click "Add Mutual Fund" button
- [ ] Fill in mutual fund details:
  - Name: e.g., "Vanguard 500 Index Fund"
  - Symbol: e.g., "VFIAX"
  - Units: e.g., 50
  - NAV: e.g., 380
  - Invested Amount: e.g., 18000
  - Current Value: e.g., 19000
  - Purchase Date: Select date
  - Category: e.g., "Large Cap"
- [ ] Click "Add Mutual Fund"
- [ ] **Expected**: New fund appears in the list
- [ ] **Expected**: Returns calculated correctly

#### READ (View Mutual Funds)
- [ ] Page loads successfully
- [ ] All funds displayed with:
  - Name and symbol
  - Units and NAV
  - Invested amount vs Current value
  - Returns ($ and %)
  - Category
- [ ] Summary cards show:
  - Total Invested
  - Current Value
  - Total Returns
  - Number of Funds
- [ ] **Expected**: No data transformation errors (FIXED ✅)

#### UPDATE (Edit Mutual Fund)
- [ ] Click edit button on a fund
- [ ] Update NAV or current value
- [ ] Save changes
- [ ] **Expected**: Fund updates in the list
- [ ] **Expected**: Returns recalculated
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Check if edit functionality exists in UI

#### DELETE (Remove Mutual Fund)
- [ ] Click delete button on a fund
- [ ] Confirm deletion
- [ ] **Expected**: Fund removed from list
- [ ] **Expected**: Summary cards update
- ⚠️ **Note**: Check if delete functionality exists in UI

---

## 5️⃣ BUDGETS Feature

### API Endpoints Status
- ✅ `GET /api/budgets` - List all budgets
- ✅ `POST /api/budgets` - Create budget
- ✅ `PUT /api/budgets/[id]` - Update budget
- ✅ `DELETE /api/budgets/[id]` - Delete budget
- ✅ `POST /api/budgets/check` - Check budget status

### Testing Checklist

#### CREATE (Add Budget)
- [ ] Navigate to `/budgets`
- [ ] Click "Add Budget" button
- [ ] Fill in budget details:
  - Category: e.g., "Food"
  - Subtype: e.g., "Bills" (optional)
  - Limit Amount: e.g., 500
  - Period: monthly
- [ ] Click "Add Budget"
- [ ] **Expected**: New budget appears in the list
- [ ] **Expected**: Shows limit and current spending
- ⚠️ **Note**: Budgets page currently uses mock data - needs API integration

#### READ (View Budgets)
- [ ] Page loads successfully
- [ ] All budgets displayed with:
  - Category (and subtype if applicable)
  - Limit amount
  - Spent amount (calculated from transactions)
  - Progress bar
  - Percentage used
- [ ] Different colors based on usage:
  - Green: < 60%
  - Yellow: 60-80%
  - Orange: 80-100%
  - Red: > 100%
- ⚠️ **Note**: Budgets page needs to be updated to use real API

#### UPDATE (Edit Budget)
- [ ] Click edit button on a budget
- [ ] Update limit amount or period
- [ ] Save changes
- [ ] **Expected**: Budget updates in the list
- ⚠️ **Note**: Budgets page needs API integration

#### DELETE (Remove Budget)
- [ ] Click delete button on a budget
- [ ] Confirm deletion
- [ ] **Expected**: Budget removed from list
- ⚠️ **Note**: Budgets page needs API integration

---

## 🔐 AUTHENTICATION Tests

### Sign Up
- [ ] Navigate to `/sign-up`
- [ ] Enter email and password
- [ ] Submit form
- [ ] **Expected**: Account created
- [ ] **Expected**: Redirected to dashboard

### Sign In
- [ ] Navigate to `/sign-in`
- [ ] Enter credentials
- [ ] Submit form
- [ ] **Expected**: Logged in successfully
- [ ] **Expected**: Redirected to dashboard

### Sign Out
- [ ] Click sign out button
- [ ] **Expected**: Logged out
- [ ] **Expected**: Redirected to sign in page

### Row Level Security (RLS)
- [ ] Create data with User A
- [ ] Sign out and sign in as User B
- [ ] **Expected**: User B cannot see User A's data
- [ ] **Expected**: User B can only see their own data

---

## 🐛 Known Issues & Required Updates

### High Priority
1. **Budgets Page** - Still using mock data
   - [ ] Update `/budgets/page.tsx` to use API endpoints
   - [ ] Integrate with real budget data from Supabase
   - [ ] Calculate current spending from transactions

2. **Edit/Delete UI Missing**
   - [ ] Add edit buttons to Goals cards
   - [ ] Add delete buttons to Goals cards
   - [ ] Add edit buttons to Stocks cards
   - [ ] Add delete buttons to Stocks cards
   - [ ] Add edit buttons to Mutual Funds cards
   - [ ] Add delete buttons to Mutual Funds cards
   - [ ] Add edit buttons to Transactions cards
   - [ ] Add delete buttons to Transactions cards

3. **Transactions Store Missing Subtype**
   - [ ] Update transactions interface to include `subtype`
   - [ ] Add data transformation in transactions store

### Medium Priority
4. **Dashboard Integration**
   - [ ] Verify dashboard displays correct data
   - [ ] Test all summary cards
   - [ ] Test charts and visualizations

5. **Recurring Transactions**
   - [ ] Test recurring transaction creation
   - [ ] Verify frequency options work
   - [ ] Check next date calculation

### Low Priority
6. **UI/UX Improvements**
   - [ ] Add loading states during API calls
   - [ ] Add confirmation modals for delete actions
   - [ ] Improve error messages
   - [ ] Add success animations

---

## 📊 Test Data Examples

### Sample Transaction
```json
{
  "type": "expense",
  "amount": 50,
  "description": "Grocery shopping",
  "category": "Food",
  "subtype": "Bills",
  "date": "2026-01-02"
}
```

### Sample Goal
```json
{
  "title": "New Car",
  "targetAmount": 30000,
  "currentAmount": 5000,
  "targetDate": "2027-06-30",
  "category": "Transportation"
}
```

### Sample Stock
```json
{
  "name": "Microsoft Corporation",
  "symbol": "MSFT",
  "shares": 15,
  "avgPurchasePrice": 300,
  "currentPrice": 375,
  "investedAmount": 4500,
  "currentValue": 5625,
  "purchaseDate": "2025-06-15",
  "sector": "Technology"
}
```

### Sample Budget
```json
{
  "category": "Transportation",
  "subtype": "EMI",
  "limit_amount": 800,
  "period": "monthly"
}
```

---

## ✅ Testing Summary

After completing all tests, fill in this summary:

### Working Features ✅
- [ ] Transactions CREATE
- [ ] Transactions READ
- [ ] Transactions DELETE (if implemented)
- [ ] Transactions UPDATE (if implemented)
- [ ] Budget Warnings

- [ ] Goals CREATE
- [ ] Goals READ
- [ ] Goals DELETE (if implemented)
- [ ] Goals UPDATE (if implemented)

- [ ] Stocks CREATE
- [ ] Stocks READ
- [ ] Stocks DELETE (if implemented)
- [ ] Stocks UPDATE (if implemented)

- [ ] Mutual Funds CREATE
- [ ] Mutual Funds READ
- [ ] Mutual Funds DELETE (if implemented)
- [ ] Mutual Funds UPDATE (if implemented)

- [ ] Budgets CREATE (needs API integration)
- [ ] Budgets READ (needs API integration)
- [ ] Budgets DELETE (needs API integration)
- [ ] Budgets UPDATE (needs API integration)

### Issues Found 🐛
(List any bugs or issues discovered during testing)

---

## 🚀 Next Steps

After testing, prioritize fixing:
1. Critical bugs that prevent core functionality
2. Data transformation issues
3. Missing CRUD operations in UI
4. Budget page API integration
5. UI/UX improvements

---

**Testing Date**: _____________

**Tester**: _____________

**Environment**: Development / Staging / Production

**Database**: Supabase (Production/Development)

