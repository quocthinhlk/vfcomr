# MonthlyDataSelectScreen - Debug Guide

## Current Issue

Screen is stuck on loading - no form displays.

## How to Debug

### Step 1: Check Console Logs

Open your mobile app console/debugger and look for `[DEBUG]` messages:

```
[DEBUG] Starting church info load...
[DEBUG] Checking AsyncStorage...
[DEBUG] AsyncStorage savedChurchId: null  (or a number like "76")
[DEBUG] No saved church ID, fetching from dashboard...
[DEBUG] Calling dashboard API...
[DEBUG] Dashboard response received: 200
[DEBUG] Dashboard data: {...}
[DEBUG] Extracted church_id: 76
[DEBUG] ✓ Using default church ID from dashboard: 76
[DEBUG] ✓ Setting churchId: 76
[DEBUG] Fetching church details...
[DEBUG] Church details response: 200
[DEBUG] ✓ Church info load complete
[DEBUG] Setting loading to false
```

### Step 2: Identify Which Step Fails

#### If you see "[DEBUG] Starting church info load..." but nothing after:
- Problem: AsyncStorage access is hanging
- Solution: Check AsyncStorage permissions

#### If you see up to "Calling dashboard API..." then stops:
- Problem: Dashboard API is not responding
- Solution: 
  - Check network connection
  - Check if API credentials are valid
  - Check if user is authenticated

#### If you see "Dashboard response received: 200" but not the church_id:
- Problem: Response structure is wrong
- Solution: The dashboard API response format might have changed
- Check: `response.data.data.dashboard_indicators.church_id`

#### If you see the church_id but form doesn't display:
- Problem: Something after churchId is hanging
- Solution: Likely the church details API call
- Check: `GET /churches/{id}` endpoint

###Step 3: Timeout Safety

I've added a **15-second timeout** that will force `setLoading(false)` even if something hangs.

If you see this message:
```
[DEBUG] ⏱️ TIMEOUT: Church info loading took too long
```

Then one of the API calls is taking too long or hanging indefinitely.

## Quick Fixes to Try

### Fix 1: Skip Church Details (Temporary)

If the church name fetch is hanging, we can disable it:

```typescript
// Comment out the church details fetch
/*
console.log('[DEBUG] Fetching church details...');
try {
  const res = await api.get(`churches/${id}`);
  ...
}
*/
```

### Fix 2: Set Loading False Immediately

If you want form to display right away:

```typescript
// Add this right after setting churchId
if (mounted) {
  setChurchId(id);
  setLoading(false);  // ← Show form immediately
}
```

###Fix 3: Check API Endpoints

Verify these endpoints are working:
1. `GET /api/v1/dashboard` - Must return `dashboard_indicators.church_id`
2. `GET /api/v1/churches/{id}` - Must return church details

## What to Send Me

Please provide:

1. **Console logs** - Copy all `[DEBUG]` messages from console
2. **Last successful log** - What's the last `[DEBUG]` message you see?
3. **Network tab** - Check if requests are pending/failed in network tab
4. **Timeout message** - Do you see the 15-second timeout message?

## Next Steps

Once we know which API is hanging, we can:
- Add a request timeout
- Modify the endpoint
- Skip optional calls
- Debug the API directly

---

**Quick Test:** Open console on your device and check if you see ANY `[DEBUG]` messages. That will tell us if the useEffect is even running.

If no `[DEBUG]` messages appear → the component isn't mounted or useEffect isn't firing
If `[DEBUG]` messages appear → the issue is in one of the API calls
