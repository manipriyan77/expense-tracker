import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Card Skeleton
function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="pt-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

// Transaction Skeleton
function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-4 flex-1">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  )
}

// Chart Skeleton
function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-end space-x-2 h-48">
        {[...Array(7)].map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  )
}

// Table Skeleton
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex space-x-4 items-center p-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-8 w-16 ml-auto" />
        </div>
      ))}
    </div>
  )
}

// Dashboard Stats Skeleton
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

// List Page Skeleton — dark header + KPI strip + transaction rows
// Used by: Expenses, Incomes, Recurring, Insights, Health Score, Cashflow
function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Dark header */}
      <div className="bg-slate-900 dark:bg-black text-white px-4 pt-4 pb-6">
        <Skeleton className="h-3 w-28 bg-slate-700 mb-2" />
        <Skeleton className="h-7 w-40 bg-slate-600 mb-1" />
        <Skeleton className="h-3 w-24 bg-slate-700" />
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2">
              <Skeleton className="h-3 w-16 bg-slate-700" />
              <Skeleton className="h-5 w-20 bg-slate-600" />
            </div>
          ))}
        </div>
      </div>
      {/* List rows */}
      <div className="px-4 pt-4 space-y-2">
        <Skeleton className="h-9 w-full rounded-lg bg-muted mb-3" />
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <div className="space-y-1.5 items-end flex flex-col">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-2.5 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export {
  Skeleton,
  CardSkeleton,
  TransactionSkeleton,
  ChartSkeleton,
  TableSkeleton,
  StatsSkeleton,
  ListPageSkeleton,
}
