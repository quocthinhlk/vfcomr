# MonthlyDataSelectScreen - Bug Fix Summary

## Issue Found

The screen was getting stuck in loading mode and hitting the catch block because:

1. **Church details API call was failing** (`GET /churches/{id}`)
2. **Error was caught and blocked the whole flow** - causing loading never to complete
3. **Screen never displayed** - user couldn't access year/month selection form

## Root Cause

```typescript
// BEFORE (Line 151)
const res = await api.get(`churches/${id}`);  // ← Could fail
const churchData = res?.data?.data;
if (churchData?.name && mounted) {
  setChurchName(churchData.name);
}
// If this fails, entire useEffect fails → catch block → loading stuck

// AFTER (Line 150-160)
try {
  const res = await api.get(`churches/${id}`);  // ← Wrapped in try/catch
  const churchData = res?.data?.data;
  if (churchData?.name && mounted) {
    setChurchName(churchData.name);
  }
} catch (e) {
  console.warn('Could not fetch church name, using default:', e);
  // Continue without church name - it's optional
}
```

## Solution Implemented

### Key Changes

1. **Moved church name fetch into its own try/catch**
   - Now it's optional - doesn't block the main flow
   - If it fails, we just continue without the name

2. **Always set loading to false in finally block**
   - Ensures loading spinner disappears even if something fails
   - Screen displays form with or without church name

3. **Moved churchId set outside the try block**
   - `setChurchId(id)` happens before church name fetch
   - Even if name fetch fails, churchId is already set
   - Year/month selection can now work

### Code Changes

**File:** `app/modules/monthlydata/screens/MonthlyDataSelectScreen.tsx` (Lines 148-166)

```typescript
// FIXED FLOW
setChurchId(id);  // ← Set IMMEDIATELY, not inside try

// Fetch church name (optional - don't block if it fails)
try {
  const res = await api.get(`churches/${id}`);
  const churchData = res?.data?.data;
  if (churchData?.name && mounted) {
    setChurchName(churchData.name);  // ← Name is optional
  }
} catch (e) {
  console.warn('Could not fetch church name, using default:', e);
  // Continue without church name - it's optional
}

// ... outer catch handles other errors ...
} finally {
  if (mounted) setLoading(false);  // ← ALWAYS turn off loading
}
```

## User Experience - BEFORE vs AFTER

### BEFORE ❌
```
1. User clicks "Monthly Data"
2. Screen loads MonthlyDataSelectScreen
3. Fetches church ID from Dashboard ✓
4. Tries to fetch church name ✗ (fails)
5. Entire useEffect fails → catch block
6. Loading never ends
7. User stuck on loading screen forever
```

### AFTER ✅
```
1. User clicks "Monthly Data"
2. Screen loads MonthlyDataSelectScreen
3. Fetches church ID from Dashboard ✓
4. Sets churchId immediately
5. Tries to fetch church name (optional)
6. If fails: logs warning, continues
7. Loading ends → Form displays
8. User can select Year and Month ✓
9. Form displays weeks ✓
```

## What Gets Fixed

✅ **Screen now displays immediately**
- Form with Year and Month dropdowns visible
- Week selector appears after selecting year/month
- No stuck loading screen

✅ **Church name is optional**
- Shows if available (from churches/{id} API)
- Screen works fine without it
- Graceful degradation

✅ **Error handling is robust**
- Individual errors don't block the flow
- Always sets loading to false
- Console logs for debugging

## Testing Steps

### Test 1: Verify Screen Displays
```
1. Open app
2. Navigate to Monthly Data
3. Expected: Year/Month form displays immediately
4. Result: ✅ No stuck loading screen
```

### Test 2: Select Year and Month
```
1. Form is visible
2. Click Year dropdown → Select 2026
3. Click Month dropdown → Select March
4. Expected: Week numbers load below
5. Result: ✅ Shows weeks [9, 10, 11, 12, 13]
```

### Test 3: Select Weeks and Next
```
1. Weeks are displayed
2. Check weeks 9, 10, 11
3. Click "Next"
4. Expected: Navigate to MonthlyDataEntryScreen
5. Result: ✅ Data entry form loads
```

## Church ID Flow (Verified)

```
1. AsyncStorage check → 'selectedChurchId'
2. If found & valid → USE IT
3. If empty → GET /api/v1/dashboard
4. Extract → dashboard_indicators.church_id
5. Use → setChurchId(id)
6. Display → Year/Month form ready
✓ Working correctly
```

## Files Changed

```
app/modules/monthlydata/screens/
  └── MonthlyDataSelectScreen.tsx
      Lines 148-166: Fixed error handling
      - Wrapped church name fetch in try/catch
      - Move churchId set outside church details fetch
      - Ensure loading always ends
```

## Console Output

When everything works:
```
Using default church ID from dashboard: 76
```

If church name fetch fails (but continues):
```
Could not fetch church name, using default: Error: Network error
```

## Status

🟢 **FIXED AND READY**

- Issue: ✅ Resolved
- Screen Display: ✅ Working
- Form Interaction: ✅ Working
- Week Selection: ✅ Working
- Testing: ✅ Verified

---

**Summary:** The screen was getting stuck because the optional church name fetch was causing the entire useEffect to fail. The fix wraps this fetch in its own try/catch so errors don't block the main flow. The form now displays immediately and works correctly even if church name fails to load.
