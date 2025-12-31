# Expense Tracker - Zustand & Supabase Setup

This expense tracker application now uses Zustand for state management and Supabase for database operations. Each user has their own isolated data.

## Features

- **Goals Tracking**: Set financial goals and track progress
- **Mutual Funds**: Track mutual fund investments and performance
- **Stocks**: Monitor stock portfolio and P&L
- **Transactions**: Record income and expenses
- **Dashboard**: Overview of financial health

## Database Setup

### 1. Create Supabase Tables

Run the SQL schema in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database/schema.sql
```

This will create:
- `goals` table for financial goals
- `transactions` table for income/expenses
- `mutual_funds` table for MF investments
- `stocks` table for stock holdings
- Row Level Security policies for user data isolation

### 2. Environment Variables

Make sure your `.env.local` has:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Zustand Stores

The app uses four main stores:

### Auth Store (`store/auth-store.ts`)
- User authentication state
- Sign in/up/out functionality
- Auto-initialization with Supabase

### Goals Store (`store/goals-store.ts`)
- CRUD operations for financial goals
- User-specific data filtering

### Mutual Funds Store (`store/mutual-funds-store.ts`)
- Investment tracking and calculations
- P&L and performance metrics

### Stocks Store (`store/stocks-store.ts`)
- Stock portfolio management
- Price change calculations

### Transactions Store (`store/transactions-store.ts`)
- Income/expense recording
- Financial summaries

## Data Flow

1. **Authentication**: User signs in → Auth store updates → App redirects to dashboard
2. **Data Loading**: Components mount → Store fetches user data from Supabase
3. **CRUD Operations**: User actions → Store calls Supabase → UI updates via Zustand
4. **Real-time**: Supabase RLS ensures users only see their own data

## Usage

### Adding Data
```typescript
import { useGoalsStore } from "@/store/goals-store";

const { addGoal } = useGoalsStore();

await addGoal({
  title: "Emergency Fund",
  targetAmount: 10000,
  currentAmount: 5000,
  targetDate: "2025-12-31",
  category: "Savings"
});
```

### Reading Data
```typescript
const { goals, loading, error } = useGoalsStore();
```

### Authentication
```typescript
import { useAuthStore } from "@/store/auth-store";

const { signIn, signOut, user } = useAuthStore();
```

## Security

- **Row Level Security**: Each user can only access their own data
- **User ID**: All records include `user_id` field linking to auth.users
- **JWT Authentication**: Supabase handles token validation

## Development

1. Set up Supabase project and database
2. Run the schema.sql to create tables
3. Update environment variables
4. Start development server: `npm run dev`

The app will automatically handle user authentication and data isolation.
