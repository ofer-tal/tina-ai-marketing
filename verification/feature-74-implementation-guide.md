# Feature #74 Implementation Guide: Filter content by date range

**Date:** 2026-01-14
**Feature:** Filter content by date range
**Status:** ⏸️ SKIPPED (Moved to priority 340)

## Reason for Skipping

This feature requires significant new UI implementation that was not present in the codebase:
- Date picker component needs to be added
- Date range state management needs to be implemented
- Filtering logic needs to be extended for date ranges

## What Needs to Be Implemented

### 1. UI Components Required

**Date Range Picker:**
Add to the filter bar in `frontend/src/pages/ContentLibrary.jsx`:

```jsx
<FilterSelect
  value={filters.dateRange}
  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
>
  <option value="all">All Time</option>
  <option value="today">Today</option>
  <option value="last7days">Last 7 Days</option>
  <option value="last30days">Last 30 Days</option>
  <option value="last90days">Last 90 Days</option>
  <option value="custom">Custom Range</option>
</FilterSelect>

// When "custom" is selected, show date inputs:
{filters.dateRange === 'custom' && (
  <>
    <FilterInput
      type="date"
      value={filters.customStartDate}
      onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
      placeholder="Start Date"
    />
    <FilterInput
      type="date"
      value={filters.customEndDate}
      onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
      placeholder="End Date"
    />
  </>
)}
```

### 2. State Management

Update the filters state in ContentLibrary component:

```javascript
const [filters, setFilters] = useState({
  platform: 'all',
  status: 'all',
  search: '',
  dateRange: 'all',           // New field
  customStartDate: '',        // New field
  customEndDate: ''           // New field
});
```

### 3. Client-Side Filtering Logic

Add date range filtering to the mock data fallback (in the catch block):

```javascript
// Apply date range filter
if (filters.dateRange !== 'all') {
  const now = new Date();
  let startDate;

  switch (filters.dateRange) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'last7days':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'last30days':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'last90days':
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    case 'custom':
      if (filters.customStartDate) {
        startDate = new Date(filters.customStartDate);
      }
      break;
  }

  if (startDate) {
    mockPosts = mockPosts.filter(post => {
      const postDate = new Date(post.scheduledAt);
      const endDate = filters.customEndDate
        ? new Date(filters.customEndDate)
        : new Date();

      return postDate >= startDate && postDate <= endDate;
    });
  }
}
```

### 4. API Integration

Update the fetchPosts function to send date range parameters:

```javascript
const params = new URLSearchParams();
// ... existing params ...

if (filters.dateRange !== 'all') {
  params.append('dateRange', filters.dateRange);
  if (filters.dateRange === 'custom') {
    if (filters.customStartDate) {
      params.append('startDate', filters.customStartDate);
    }
    if (filters.customEndDate) {
      params.append('endDate', filters.customEndDate);
    }
  }
}
```

### 5. Backend API Support

The backend API endpoint needs to support date range filtering:

**File:** `backend/api/content.js`

Add to the existing GET /api/content/posts endpoint:

```javascript
// Date range filtering
if (req.query.dateRange && req.query.dateRange !== 'all') {
  const now = new Date();
  let startDate;

  switch (req.query.dateRange) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'last7days':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'last30days':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'last90days':
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    case 'custom':
      startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      break;
  }

  if (startDate) {
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    query.scheduledAt = {
      $gte: startDate,
      $lte: endDate
    };
  }
}
```

## Test Plan

Once implemented, test the following:

1. **Navigate to /content/library** - Verify page loads
2. **Click date range dropdown** - Verify options appear
3. **Select "Last 7 days"** - Verify only posts in range display
4. **Select "Last 30 days"** - Verify correct posts display
5. **Select "Custom Range"** - Verify date inputs appear
6. **Enter custom dates** - Verify posts within range display
7. **Reset to "All Time"** - Verify all posts display

## Implementation Priority

This feature should be implemented when:
- Basic filtering (platform, status, search) is fully tested
- MongoDB connection is established
- Date picker component is selected/implemented

## Dependencies

- **Requires:** MongoDB connection for real data
- **Requires:** Date picker component or HTML5 date inputs
- **Builds on:** Feature #72 (client-side filtering)

## Estimated Effort

- Frontend UI: 1-2 hours
- Backend API: 30 minutes
- Testing: 1 hour
- **Total:** 2.5-3.5 hours

## Notes

- The scheduledAt field is already present in the MarketingPost schema
- Date filtering logic is straightforward with JavaScript Date objects
- Consider using a library like `react-datepicker` or `date-fns` for better UX
- Preset options (Today, Last 7 Days, etc.) provide better UX than manual dates
- Custom range should be optional for power users

## When to Implement

Recommended to implement after:
1. MongoDB connection is established
2. Basic content library features are working
3. Platform and status filtering are fully tested

Skip to priority 340 to allow focus on core features first.
