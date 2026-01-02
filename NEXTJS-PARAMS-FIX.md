# Next.js 15 Dynamic Route Params Fix

## Issue
Getting error when trying to delete budgets/goals:
```
{"error":"invalid input syntax for type uuid: \"undefined\""}
```

## Root Cause
Next.js 15 changed how dynamic route parameters work in the App Router. The `params` object is now a **Promise** that needs to be awaited, rather than a synchronous object.

### Before (Next.js 14 and earlier):
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // params.id is directly accessible
  const id = params.id;
}
```

### After (Next.js 15):
```typescript
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // params must be awaited
  const params = await context.params;
  const id = params.id;
}
```

## Solution
Updated all dynamic route handlers to await the params Promise.

## Files Fixed

### 1. Budgets API
**File:** `app/api/budgets/[id]/route.ts`
- ✅ PUT endpoint - Update budget
- ✅ DELETE endpoint - Delete budget

### 2. Goals API
**File:** `app/api/goals/[id]/route.ts`
- ✅ PUT endpoint - Update goal
- ✅ DELETE endpoint - Delete goal

### 3. Goal Transactions API
**File:** `app/api/goals/[id]/transactions/route.ts`
- ✅ GET endpoint - Fetch goal transactions

### 4. Budget Transactions API
**File:** `app/api/budgets/[id]/transactions/route.ts`
- ✅ GET endpoint - Fetch budget transactions

### 5. Transactions API
**File:** `app/api/transactions/[id]/route.ts`
- ✅ PUT endpoint - Update transaction
- ✅ DELETE endpoint - Delete transaction

### 6. Mutual Funds API
**File:** `app/api/mutual-funds/[id]/route.ts`
- ✅ PUT endpoint - Update mutual fund
- ✅ DELETE endpoint - Delete mutual fund

### 7. Stocks API
**File:** `app/api/stocks/[id]/route.ts`
- ✅ PUT endpoint - Update stock
- ✅ DELETE endpoint - Delete stock

## Code Pattern

### Standard Pattern for All Dynamic Routes:
```typescript
export async function METHOD(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // IMPORTANT: Await params
    const params = await context.params;
    
    // Now use params.id
    const { data, error } = await supabase
      .from("table_name")
      .method()
      .eq("id", params.id)
      .eq("user_id", user.id);
    
    // ... rest of logic
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Testing

After this fix, the following operations should work:

### Budgets:
- ✅ Edit budget
- ✅ Delete budget
- ✅ View budget details modal
- ✅ View budget transactions

### Goals:
- ✅ Edit goal
- ✅ Delete goal
- ✅ View goal details modal
- ✅ View goal transactions

### Transactions:
- ✅ Edit transaction
- ✅ Delete transaction (from list or modal)
- ✅ Update budget/goal amounts on delete

### Stocks & Mutual Funds:
- ✅ Edit stock/mutual fund
- ✅ Delete stock/mutual fund

## Why This Happened

Next.js 15 made this change to support:
1. **Better async handling** - Allows for async parameter resolution
2. **Improved performance** - Params can be loaded asynchronously
3. **Future compatibility** - Prepares for upcoming features

## Migration Guide

If you have other dynamic routes in your app, follow this pattern:

1. **Change the function signature:**
   ```typescript
   // Old
   { params }: { params: { id: string } }
   
   // New
   context: { params: Promise<{ id: string }> }
   ```

2. **Await params at the start of the function:**
   ```typescript
   const params = await context.params;
   ```

3. **Use params.id as normal:**
   ```typescript
   .eq("id", params.id)
   ```

## References

- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [Next.js Dynamic Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

## Summary

✅ All dynamic route handlers updated
✅ Params properly awaited in all endpoints
✅ Delete operations now working correctly
✅ No more "undefined" UUID errors
✅ All CRUD operations functional

The error is now fixed and all delete operations should work properly!

