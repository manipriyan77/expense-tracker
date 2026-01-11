# Expense Tracker

A comprehensive personal finance management application built with Next.js 16, Supabase, and TypeScript.

## Features

✅ **Transaction Management** - Track income and expenses with detailed categorization
✅ **Budget Planning** - Set monthly budgets and track spending by category
✅ **Budget Templates** - Create reusable budget templates or use pre-built ones
✅ **Goal Tracking** - Set financial goals and monitor progress
✅ **Investment Tracking** - Track stocks and mutual funds
✅ **Net Worth Monitoring** - Track assets and liabilities
✅ **Debt Tracker** - Manage and track debt payments
✅ **Savings Challenges** - Create savings goals with milestone tracking
✅ **Analytics & Reports** - Visualize spending patterns and trends
✅ **Real-time Updates** - Live data synchronization across devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Charts**: Recharts
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- pnpm (recommended) or npm

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd expense-tracker
```

### 2. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Database Migrations

**Important**: You must run these migrations in your Supabase SQL Editor before using the app.

1. Open your Supabase project dashboard
2. Go to **SQL Editor** → **New Query**
3. Run the following migrations in order:

#### Step 4a: Base Schema
Copy and paste the contents of `database/schema.sql` and run it.

#### Step 4b: Missing Tables
Copy and paste the contents of `database/setup-missing-tables.sql` and run it.

#### Step 4c: Advanced Features (Budget Templates, etc.)
Copy and paste the contents of `database/migrations/add-advanced-features.sql` and run it.

#### Step 4d: Budget Templates Table (If Step 4c didn't work)
If you still can't create budget templates, run:
`database/migrations/create-budget-templates-table.sql`

#### Step 4e: Additional Migrations
Run these in order:
- `database/migrations/add-monthly-budgets.sql`
- `database/migrations/add-original-amount-to-liabilities.sql`

### 5. Run the Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Troubleshooting

### Budget Templates Not Working?

See `BUDGET_TEMPLATES_FIX.md` for detailed troubleshooting steps.

### Common Issues

1. **"relation does not exist" errors**: Run all database migrations in the correct order
2. **Authentication errors**: Check your Supabase environment variables
3. **RLS Policy errors**: Make sure Row Level Security policies were created with the migrations

## Project Structure

```
expense-tracker/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main app pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # UI components (shadcn)
│   └── ...               # Feature components
├── database/              # Database schemas and migrations
│   ├── schema.sql        # Base schema
│   ├── setup-missing-tables.sql
│   └── migrations/       # Migration files
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Helper functions
├── store/                 # Zustand state management
└── public/               # Static assets

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
