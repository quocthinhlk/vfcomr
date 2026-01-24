# MonthlyDataSelectScreen - Debug & Fix Status

## Current Status: 🔧 Under Investigation

The screen is loading indefinitely. I've added comprehensive debugging to identify the issue.

## What I Did

### 1. Added Detailed Console Logging
- Every step of the initialization is logged with `[DEBUG]` prefix
- Shows which API calls are made
- Shows response status and data
- Shows which step might be hanging

### 2. Added 15-Second Timeout
- If loading takes longer than 15 seconds, it automatically stops
- Shows error: `[DEBUG] ⏱️ TIMEOUT: Church info loading took too long`
- Forces `setLoading(false)` so form displays

### 3. Disabled Church Name Fetch (Temporary)
- The church details API call (`GET /churches/{id}`) is commented out
- This helps identify if that's what's causing the hang
- If the screen now displays the form → that API is the culprit

### 4. Enhanced Loading Screen
- Shows `churchId` value (or "null")
- Shows `loading` state value
- Helps verify if state is changing or stuck

## How to Debug

### Step 1: Check Console Logs

Open your device console and look for messages starting with `[DEBUG]`:

```
[DEBUG] Starting church info load...
[DEBUG] Checking AsyncStorage...
[DEBUG] AsyncStorage savedChurchId: null
[DEBUG] No saved church ID, fetching from dashboard...
[DEBUG] Calling dashboard API...
[DEBUG] Dashboard response received: 200
[DEBUG] Dashboard data: {...}
[DEBUG] Extracted church_id: 76
[DEBUG] ✓ Using default church ID from dashboard: 76
[DEBUG] ✓ Setting churchId: 76
[DEBUG] ✓ Church info load complete
[DEBUG] Setting loading to false
```

### Step 2: Identify Where It Stops

**If you DON'T see ANY [DEBUG] messages:**
- Problem: useEffect isn't running
- Check: Component hasn't mounted
- Check: Navigation might be preventing it

**If it stops after "Calling dashboard API...":**
- Problem: Dashboard API is hanging or failing
- Fix: Check network, check API endpoint

**If it stops after extracting church_id but before setting it:**
- Problem: setState might be stuck
- Fix: This is unexpected, report it

**If form now displays (after disabling church name fetch):**
- Problem: The `GET /churches/{id}` API is hanging
- Fix: Either add timeout to that call, or remove it

### Step 3: Report Findings

Tell me:
1. What's the last `[DEBUG]` message you see?
2. Does the form display after 15 seconds (with "[DEBUG] ⏱️ TIMEOUT")?
3. With church name fetch disabled, does the form show?

## Possible Solutions

### Solution 1: If Church Name Fetch is the Problem

Keep it commented out (already done):
```typescript
// Church name fetch disabled - form displays immediately
// This is fine - church name is optional
```

### Solution 2: If Dashboard API is Hanging

Add timeout to dashboard call:
```typescript
const timeoutId = setTimeout(() => {
  throw new Error('Dashboard API timeout');
}, 10000);

try {
  const dashboardRes = await api.get('dashboard');
  clearTimeout(timeoutId);
  // ... rest of code
} catch (error) {
  clearTimeout(timeoutId);
  // ... error handling
}
```

### Solution 3: If AsyncStorage is Hanging

Skip AsyncStorage and go straight to dashboard:
```typescript
// Skip AsyncStorage check
// const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
// Always fetch from dashboard
let id = null;
try {
  const dashboardRes = await api.get('dashboard');
  id = dashboardRes?.data?.data?.dashboard_indicators?.church_id;
}
```

## Temporary Workarounds

### Workaround 1: Display Form Immediately

Change this:
```typescript
if (mounted) {
  setChurchId(id);
}
```

To this:
```typescript
if (mounted) {
  setChurchId(id);
  setLoading(false);  // Show form right away
}
```

This displays the form immediately even if church name takes time.

### Workaround 2: Skip All Optional Data

Only set churchId, skip everything else:
```typescript
setChurchId(id);
// Skip church name, skip details
setLoading(false);
```

### Workaround 3: Remove Dashboard Fallback

If dashboard is the problem:
```typescript
// Remove dashboard API call
// Just use AsyncStorage or use a hardcoded ID
let id = 76; // hardcoded for testing
setChurchId(id);
setLoading(false);
```

## Next Steps

1. **Check console logs** - Tell me what you see
2. **Note if form displays after 15 seconds** - Timeout working?
3. **Test if removing church name fetch helps** - Already done
4. **If still hanging, try workarounds above**

## Files Modified

```
app/modules/monthlydata/screens/MonthlyDataSelectScreen.tsx
  Lines 104-209: Added debugging and timeout
  Lines 172-190: Commented out church name fetch (temporary)
  Lines 287-296: Enhanced loading screen with state display
```

## Console Log Reference

Look for these exact messages in console:

```
✅ SUCCESS MESSAGES:
[DEBUG] ✓ Using default church ID from dashboard: 76
[DEBUG] ✓ Setting churchId: 76
[DEBUG] ✓ Church info load complete
[DEBUG] Setting loading to false

❌ ERROR MESSAGES:
[DEBUG] ✗ Could not get default church ID from dashboard
[DEBUG] ⏱️ TIMEOUT: Church info loading took too long
[DEBUG] Error fetching dashboard data: ...
```

## Expected Behavior

After your test:
1. Open MonthlyDataSelectScreen
2. Should see loading spinner with "churchId: 76, loading: true"
3. After a few seconds, should see "churchId: 76, loading: false"
4. Form should display with Year and Month dropdowns
5. Select year and month → week numbers should appear

If this doesn't happen, check console and report findings.

---

**Status:** Debugging in progress - Need console logs to identify the exact issue
