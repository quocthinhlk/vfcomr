# Monthly Data Module - API Verification

## API Overview

### 1. Get Week Numbers
**Endpoint:** `GET /api/v1/week-numbers?year=2026&month=3&church_id=76`

**Response:**
```json
{
    "success": true,
    "data": {
        "year": 2026,
        "month": 3,
        "weeks": [
            {
                "week_number": 9,
                "is_reported": false
            },
            ...
        ]
    },
    "message": "Request was successful"
}
```

**Implementation Status:** ✅ CORRECT
- Location: `monthlydata.service.ts` - `getWeekNumbers()` and `getWeekInfo()`
- Function: `getWeekNumbers()` returns `Promise<number[]>`
- Function: `getWeekInfo()` returns `Promise<WeekInfo[]>` with is_reported status
- Interfaces: `WeekInfo`, `GetWeekNumbersData`, `GetWeekNumbersResponse`

---

### 2. Get Weekly Report
**Endpoint:** `GET /api/v1/weekly-reports/churches/{church_id}?year=2025&week_number=27`

**Response:**
```json
{
    "success": true,
    "data": {
        "church_id": 76,
        "year": 2025,
        "week_number": 27,
        "currency_id": 152,
        "worship_sessions": [
            {
                "id": 72,
                "name": "Main Service",
                "day_name": "Sunday",
                "time": "09:30:00",
                "attendance": {
                    "total_attendance": 175,
                    "adult_attendance": 95,
                    "youth_attendance": 50,
                    "child_attendance": 30,
                    "number_of_service_for_children": 1
                }
            }
        ],
        "church_metrics": {
            "being_actively_discipled": 25,
            "number_of_cell_groups": 5,
            ...
        }
    },
    "message": "Request was successful"
}
```

**Implementation Status:** ✅ CORRECT
- Location: `monthlydata.service.ts` - `getWeeklyReport()`
- Function: Returns `Promise<WeeklyReportData>`
- Interfaces: `WeeklyReportData`, `WorshipSession`, `WorshipSessionAttendance`, `ChurchMetrics`
- API Call: `GET /weekly-reports/churches/${churchId}` with params `{ year, week_number: weekNumber }`

---

### 3. Create/Update Weekly Report
**Endpoint:** `POST /api/v1/weekly-reports/churches/{church_id}`

**Request Body:**
```json
{
  "year": 2025,
  "week_number": 27,
  "worship_sessions": [
    {
      "id": 72,
      "attendance": {
        "adult_attendance": 95,
        "youth_attendance": 50,
        "child_attendance": 30,
        "number_of_service_for_children": 1
      }
    }
  ],
  "church_metrics": {
    "being_actively_discipled": 25,
    "number_of_cell_groups": 5,
    ...
  }
}
```

**Implementation Status:** ✅ CORRECT
- Location: `monthlydata.service.ts` - `createOrUpdateWeeklyReport()`
- Function: Accepts `churchId` and `CreateWeeklyReportPayload`
- Payload Interface: `CreateWeeklyReportPayload`
  - Contains: `year`, `week_number`, `worship_sessions[]`, `church_metrics`
- API Call: `POST /weekly-reports/churches/${churchId}`

---

## Data Flow Summary

### MonthlyDataSelectScreen
1. User selects Year and Month
2. Calls `getWeekNumbers(year, month, churchId)`
3. API returns weeks array with `is_reported` status
4. User selects weeks and navigates to MonthlyDataEntryScreen

### MonthlyDataEntryScreen
1. Receives route params: `churchId`, `year`, `month`, `weekNumbers[]`
2. Gets `churchId` from `AsyncStorage.getItem('selectedChurchId')`
3. For each week:
   - Loads via `getWeeklyReport(churchId, year, weekNumber)`
   - Displays worship sessions and church metrics
   - User edits data
4. On Save:
   - Calls `createOrUpdateWeeklyReport(churchId, payload)`
   - Payload structure matches API expectations

---

## Church ID Source
✅ **CORRECT**: `churchId` is taken from `AsyncStorage` which is set from `DashboardPastorLeaderScreen`
- DashboardPastorLeaderScreen saves: `AsyncStorage.setItem('selectedChurchId', String(churchId))`
- MonthlyDataSelectScreen retrieves: `AsyncStorage.getItem('selectedChurchId')`
- MonthlyDataEntryScreen retrieves: `AsyncStorage.getItem('selectedChurchId')`

---

## Verification Checklist

- [x] GetWeekNumbers API correctly implemented
- [x] GetWeekInfo API correctly implemented (bonus for is_reported)
- [x] GetWeeklyReport API correctly implemented
- [x] CreateOrUpdateWeeklyReport API correctly implemented
- [x] Interfaces match API response structure
- [x] Church ID correctly sourced from AsyncStorage (selected church)
- [x] Request parameters match API spec
- [x] Response payload structure matches API spec

---

## Conclusion
✅ **ALL IMPLEMENTATIONS ARE CORRECT**

The code already properly implements all the APIs you specified:
1. Week numbers retrieval with is_reported status
2. Weekly report fetching with full data structure
3. Weekly report creation/update with proper payload structure
4. Church ID is correctly managed across screens

No changes needed. The module is ready for use!
