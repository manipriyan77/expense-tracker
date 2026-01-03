# Month Selector Restriction Update

## Overview
Updated the MonthSelector component to restrict navigation to exactly 7 months back from the current month. Users can no longer navigate beyond this limit.

## Change Summary

### Previous Behavior
- Users could navigate indefinitely into the past using the Previous button
- Only the dropdown was limited to 7 months

### New Behavior
- Users can only navigate within the last 7 months (including current month)
- Previous button is disabled when at the oldest allowed month
- Next button is disabled when at the current month
- Both buttons now have clear visual feedback when disabled

## Technical Implementation

### File Modified
`components/ui/month-selector.tsx`

### New Functions Added

1. **`getOldestAllowedMonth()`**
   - Calculates the oldest month users can navigate to
   - Formula: Current month - (monthsToShow - 1)
   - Example: If current month is January 2026, oldest is July 2025 (7 months back)

2. **`isOldestMonth()`**
   - Checks if the currently selected month is the oldest allowed
   - Returns true if user is at the 7-month limit
   - Used to disable the Previous button

### Updated Functions

**`handlePrevMonth()`**
```typescript
const handlePrevMonth = () => {
  const newDate = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() - 1,
    1
  );
  const oldestMonth = getOldestAllowedMonth();
  
  // Don't allow going before the oldest allowed month
  if (newDate >= oldestMonth) {
    onMonthChange(newDate);
  }
};
```

**Previous Button**
```typescript
<Button
  variant="outline"
  size="icon"
  onClick={handlePrevMonth}
  disabled={isOldestMonth()}  // NEW: Disabled when at limit
  className="h-9 w-9"
>
  <ChevronLeft className="h-4 w-4" />
</Button>
```

## Behavior Examples

### Scenario 1: Current Month is January 2026
- **Allowed Range:** July 2025 → January 2026 (7 months)
- **Dropdown Shows:** 
  - January 2026 (Current)
  - December 2025
  - November 2025
  - October 2025
  - September 2025
  - August 2025
  - July 2025
- **When at July 2025:** Previous button is disabled
- **When at January 2026:** Next button is disabled

### Scenario 2: Navigation Attempt Beyond Limit
- User is viewing **July 2025** (oldest month)
- Previous button is **grayed out and disabled**
- Clicking does nothing
- Tooltip: Button appears disabled (can add tooltip in future)

### Scenario 3: Mid-Range Navigation
- User is viewing **October 2025**
- Previous button is **enabled** (can go to September, August, July)
- Next button is **enabled** (can go to November, December, January)
- Both buttons work normally

## User Experience Improvements

1. **Visual Feedback**
   - Disabled buttons are grayed out
   - Clear indication when limit is reached
   - Consistent behavior across all pages

2. **Data Consistency**
   - All pages (Transactions, Budgets) respect the same 7-month limit
   - Dropdown and navigation buttons always stay in sync
   - No confusion about available date range

3. **Performance**
   - Only 7 months of data loaded at any time
   - Prevents accidental navigation to very old data
   - Keeps UI responsive

## Configuration

The restriction automatically adjusts based on the `monthsToShow` prop:

```typescript
<MonthSelector
  selectedMonth={selectedMonth}
  onMonthChange={setSelectedMonth}
  monthsToShow={7}  // This determines the limit
/>
```

- `monthsToShow={7}` → Can go back 7 months
- `monthsToShow={12}` → Can go back 12 months
- `monthsToShow={3}` → Can go back 3 months

## Testing Checklist

- [✓] Previous button disabled at oldest month
- [✓] Next button disabled at current month
- [✓] Cannot navigate beyond 7 months back
- [✓] Dropdown only shows allowed months
- [✓] Mid-range navigation works normally
- [✓] Button states update correctly
- [✓] Visual feedback is clear
- [✓] No linter errors

## Edge Cases Handled

1. **Year Boundaries:** Works correctly across year changes (e.g., Jan 2026 → Jul 2025)
2. **Current Month:** Always includes current month as newest
3. **Month Rollover:** Handles month arithmetic correctly
4. **Initial Load:** Starts at current month by default
5. **Disabled State:** Buttons properly disabled, no accidental clicks

## Future Enhancements

Potential improvements for consideration:

1. **Tooltip on Hover:**
   ```typescript
   <Button
     disabled={isOldestMonth()}
     title={isOldestMonth() ? "Cannot go back further than 7 months" : ""}
   >
   ```

2. **Custom Range Dialog:**
   - Add "Custom Range" button
   - Allow manual date entry
   - Validate against 7-month limit

3. **Keyboard Shortcuts:**
   - Left Arrow: Previous month
   - Right Arrow: Next month
   - Home: Current month
   - End: Oldest month

4. **Animation:**
   - Smooth transition when changing months
   - Fade in/out effect for disabled state

## Files Modified

1. `components/ui/month-selector.tsx`
   - Added `getOldestAllowedMonth()` function
   - Added `isOldestMonth()` function
   - Updated `handlePrevMonth()` with limit check
   - Added `disabled` prop to Previous button

## Migration Notes

No breaking changes. Existing implementations will automatically:
- Respect the 7-month limit
- Show disabled state correctly
- Continue working as before

---

**Date:** January 3, 2026  
**Status:** ✅ Complete  
**Type:** Enhancement - User Experience Improvement

