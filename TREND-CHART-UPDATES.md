# Trend Chart Updates - Multiple Classification Comparison

## Summary
Updated the TrendChart component and Redux store to support accumulating and comparing data from multiple API calls (up to 5 classifications simultaneously).

## Changes Made

### 1. Redux Store (`store/indicatorSlice.ts`)

#### New State Structure:
- Added `classificationData`: Object that stores data by classification (e.g., `{ "World": [...], "Country": [...] }`)
- Added `loadingClassifications`: Array to track which classifications are currently loading
- Maintains backward compatibility with existing `trendData` structure

#### Key Features:
- **Data Accumulation**: Each API call adds data to the store instead of replacing it
- **Classification Tracking**: Stores data separately for each classification
- **Automatic Merging**: Combines all classification data into `trendData` for the chart
- **Remove Classification**: New action `removeClassificationData` to remove specific classification data

### 2. TrendChart Component (`components/charts/TrendChart.tsx`)

#### New Features:
1. **Default to "World"**: Component now defaults to showing "World" classification on load
2. **Smart API Calls**: Only fetches data for newly selected classifications (no duplicate calls)
3. **Data Persistence**: Previous data remains visible when adding new classifications
4. **Maximum Limit**: Enforces 5 classification maximum with:
   - Visual counter: "(X/5 selected)"
   - Disabled options when limit is reached
   - Validation in onChange handler

#### User Experience Improvements:
- Each classification gets its own colored line on the chart
- Can compare up to 5 different classifications simultaneously
- Data accumulates as you select more classifications
- Removing a classification removes its data from the chart
- Clean slate when indicator or data source changes

## How It Works

### Flow Example:
1. **Initial Load**: User opens chart → "World" classification selected → API call for World data
2. **Add Classification**: User selects "Country" → API call for Country data → Both World and Country shown on chart
3. **Add More**: User selects "Region" → API call for Region data → All three shown on chart
4. **Remove One**: User deselects "World" → World data removed from chart → Only Country and Region remain
5. **Maximum Reached**: User has 5 classifications selected → Additional options are disabled

### Technical Details:

**API Call Management:**
```typescript
// Tracks which classifications have been fetched (using useRef to avoid re-renders)
fetchedClassificationsRef.current = new Set(['World', 'Country', ...])

// Only makes API call if not already fetched
if (!fetchedSet.has(classification)) {
  dispatch(fetchTrendData({ indicatorName, dataSourceName, classification }));
}
```

**Data Storage:**
```typescript
// Redux state structure
{
  classificationData: {
    "World": [{ year: 2020, value: 100 }, ...],
    "Country": [{ year: 2020, value: 95 }, ...],
    "Region": [{ year: 2020, value: 98 }, ...]
  },
  trendData: { TrendData: [...all combined...] }
}
```

**Chart Display:**
- Each classification becomes a separate line on the chart
- Colors are automatically assigned from the color palette
- Legend shows all selected classifications
- Tooltip shows all values for a given year

## Benefits

1. ✅ **No Data Loss**: Previous selections remain visible
2. ✅ **Efficient**: No duplicate API calls for already-fetched data
3. ✅ **User Control**: Can add/remove classifications at will
4. ✅ **Performance**: Limited to 5 classifications to prevent overload
5. ✅ **Clean**: Automatic cleanup when changing indicators

## Testing Checklist

- [ ] Default loads with "World" classification
- [ ] Selecting additional classification triggers API call
- [ ] Multiple classifications show different colored lines
- [ ] Removing classification removes its data from chart
- [ ] Maximum 5 classifications enforced
- [ ] Counter shows correct count (X/5)
- [ ] Options disabled when limit reached
- [ ] Data clears when changing indicators
- [ ] No duplicate API calls for same classification

