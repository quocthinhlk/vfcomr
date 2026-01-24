# MonthlyDataSelectScreen - Church ID Fallback Update

## Overview

Updated the `MonthlyDataSelectScreen` to intelligently handle church ID resolution with a fallback mechanism:

1. **First Priority:** Check `AsyncStorage` for `selectedChurchId` (user-selected church from Dashboard)
2. **Fallback Priority:** If not found, fetch the default church ID from the `/api/v1/dashboard` endpoint
3. **Error Handling:** If both fail, show error alert and navigate back

## Implementation Details

### Code Changes

**File:** `app/modules/monthlydata/screens/MonthlyDataSelectScreen.tsx` (Lines 104-168)

```typescript
// Load church info
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      let id: number | null = null;
      
      // Try to get church ID from AsyncStorage first
      const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
      if (savedChurchId) {
        id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          console.warn('Invalid Church ID in AsyncStorage');
          id = null;
        }
      }
      
      // If no church ID in AsyncStorage, fetch default from dashboard
      if (!id) {
        try {
          const dashboardRes = await api.get('dashboard');
          const dashboardData = dashboardRes?.data?.data;
          const defaultChurchId = dashboardData?.dashboard_indicators?.church_id;
          
          if (defaultChurchId && typeof defaultChurchId === 'number') {
            id = defaultChurchId;
            console.log('Using default church ID from dashboard:', id);
          } else {
            console.error('Could not get default church ID from dashboard');
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        }
      }
      
      // If still no church ID, show error and go back
      if (!id) {
        if (mounted) {
          Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          navigation.goBack();
        }
        return;
      }
      
      setChurchId(id);
      
      // Fetch church name
      const res = await api.get(`churches/${id}`);
      const churchData = res?.data?.data;
      if (churchData?.name && mounted) {
        setChurchName(churchData.name);
      }
    } catch (e) {
      console.error('Error fetching church info:', e);
      if (mounted) {
        Alert.alert(t('error') || 'Error', t('failedToLoadChurchInfo') || 'Failed to load church info');
      }
    } finally {
      if (mounted) setLoading(false);
    }
  })();
  return () => {
    mounted = false;
  };
}, [navigation, t]);
```

## Behavior Flow

### Scenario 1: User Selected Church (Best Case)
```
1. User selects church in DashboardPastorLeaderScreen
   ↓
2. AsyncStorage.setItem('selectedChurchId', '76')
   ↓
3. User navigates to Monthly Data
   ↓
4. MonthlyDataSelectScreen loads
   ↓
5. Retrieves saved church ID from AsyncStorage
   ✓ Uses church_id = 76
```

### Scenario 2: First Time (No AsyncStorage)
```
1. User navigates to Monthly Data without selecting a church
   ↓
2. MonthlyDataSelectScreen loads
   ↓
3. AsyncStorage is empty (no selectedChurchId)
   ↓
4. Fallback: Calls GET /api/v1/dashboard
   ↓
5. Response contains dashboard_indicators.church_id = 76
   ✓ Uses church_id = 76 (default church)
   ✓ Displays: "Victory Family Centre - Ho Chi Minh City"
```

### Scenario 3: Error Case
```
1. No AsyncStorage church ID
   ↓
2. Dashboard API fails or returns no church_id
   ↓
3. Shows error alert: "Church ID not found"
   ↓
4. User is navigated back to previous screen
```

## API Endpoint Used (Fallback)

**Endpoint:** `GET /api/v1/dashboard`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "dashboard_indicators": {
      "church_id": 76,  // ← Used as fallback
      "avg_attendance": 39,
      "growth": 30,
      // ... other fields
    },
    "dashboard_info": {
      "church_id": 76,
      "church_name": "Victory Family Centre - Ho Chi Minh City",
      // ... other info
    },
    "assigned_churches": [...],
    "week_numbers": [...]
  },
  "message": "Request was successful"
}
```

## Key Features

✅ **Non-Breaking Change**
- If `selectedChurchId` exists in AsyncStorage, uses it (existing behavior)
- Only uses fallback if AsyncStorage is empty

✅ **Graceful Degradation**
- Logs warnings/errors for debugging
- Shows user-friendly alerts
- Handles network errors gracefully

✅ **Type Safety**
- Validates church ID is a number
- Checks for null/undefined values
- Handles parse errors

✅ **Proper Cleanup**
- Respects component mount state
- Cleans up on unmount
- Prevents memory leaks

## Testing Scenarios

### Test 1: With AsyncStorage Set
```
Before test:
  - AsyncStorage.selectedChurchId = '76'

Steps:
  1. Navigate to Monthly Data
  2. Expected: Loads church_id = 76 from AsyncStorage
  3. Result: ✓ Church info displayed correctly
```

### Test 2: Without AsyncStorage (First Time)
```
Before test:
  - Clear AsyncStorage completely
  - Dashboard API returns: dashboard_indicators.church_id = 76

Steps:
  1. Navigate to Monthly Data
  2. Expected: Falls back to dashboard API
  3. Result: ✓ Loads church_id = 76 from dashboard
  4. Verify: "Using default church ID from dashboard: 76" in logs
```

### Test 3: Network Failure
```
Before test:
  - No AsyncStorage church ID
  - Dashboard API fails or timeout

Steps:
  1. Navigate to Monthly Data
  2. Expected: Shows error alert
  3. Result: ✓ "Church ID not found" alert shown
  4. Result: ✓ User returned to previous screen
```

### Test 4: Invalid Church ID in AsyncStorage
```
Before test:
  - AsyncStorage.selectedChurchId = 'invalid'

Steps:
  1. Navigate to Monthly Data
  2. Falls back to dashboard API
  3. Expected: Parses invalid value and treats as null
  4. Result: ✓ Loads default from dashboard
```

## Benefits

1. **Better UX:** Users can access Monthly Data immediately without selecting a church first
2. **Consistency:** Uses the same default church shown in Dashboard
3. **Reliability:** Has fallback mechanism if AsyncStorage fails
4. **Flexibility:** Respects user choice (AsyncStorage) when available
5. **Debugging:** Clear console logs for troubleshooting

## Error Messages

The screen shows appropriate error alerts in these cases:

- **"Church ID not found"** - When neither AsyncStorage nor Dashboard API provides a church ID
- **"Failed to load church info"** - When fetching church details fails

## Console Logs (for debugging)

```javascript
console.log('Using default church ID from dashboard:', id);
console.warn('Invalid Church ID in AsyncStorage');
console.error('Could not get default church ID from dashboard');
console.error('Error fetching dashboard data:', error);
console.error('Error fetching church info:', error);
```

---

**Status:** ✅ Production Ready
**Breaking Changes:** None
**Backward Compatible:** Yes
