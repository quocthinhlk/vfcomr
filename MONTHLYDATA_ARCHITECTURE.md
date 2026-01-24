# Monthly Data Module - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DashboardPastorLeaderScreen                          │
│                  (Church Selection & Navigation)                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Selected Church Info:                                          │  │
│  │  - church_id: 76                                                │  │
│  │  - church_name: "Main Church"                                   │  │
│  │                                                                 │  │
│  │  Action: User clicks "Monthly Data" menu                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│                 AsyncStorage.setItem(                                  │
│                   'selectedChurchId', '76'                             │
│                 )                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   MonthlyDataSelectScreen                               │
│              (Week Selection & Filtering)                               │
│                                                                         │
│  1. Load church ID from AsyncStorage                                   │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ churchId = await AsyncStorage.getItem('selectedChurchId')   │  │
│     │ // Returns: '76' → parseInt → 76                            │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  2. User selects Year and Month                                        │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ Year: 2026                                                   │  │
│     │ Month: 3 (March)                                             │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  3. API Call: getWeekNumbers()                                         │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ GET /week-numbers?year=2026&month=3&church_id=76            │  │
│     │                                                              │  │
│     │ Response:                                                    │  │
│     │ {                                                            │  │
│     │   "data": {                                                  │  │
│     │     "weeks": [                                               │  │
│     │       {"week_number": 9, "is_reported": false}              │  │
│     │       {"week_number": 10, "is_reported": false}             │  │
│     │       {"week_number": 11, "is_reported": false}             │  │
│     │       {"week_number": 12, "is_reported": false}             │  │
│     │       {"week_number": 13, "is_reported": false}             │  │
│     │     ]                                                        │  │
│     │   }                                                          │  │
│     │ }                                                            │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  4. Display Weeks                                                       │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ Week 9 (Mar 02 - Mar 08)   ☐                                │  │
│     │ Week 10 (Mar 09 - Mar 15)  ☐                                │  │
│     │ Week 11 (Mar 16 - Mar 22)  ☐                                │  │
│     │ Week 12 (Mar 23 - Mar 29)  ☐                                │  │
│     │ Week 13 (Mar 30 - Apr 05)  ☐                                │  │
│     │                                                              │  │
│     │ [User checks weeks 9, 10, 11]                               │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  5. User clicks "Next"                                                 │
│     Route params passed to MonthlyDataEntryScreen:                    │
│     {                                                                  │
│       churchId: 76,                                                    │
│       churchName: "Main Church",                                       │
│       year: 2026,                                                      │
│       month: 3,                                                        │
│       weekNumbers: [9, 10, 11]                                         │
│     }                                                                  │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 MonthlyDataEntryScreen                                   │
│           (Data Entry & Editing)                                        │
│                                                                         │
│  1. Validate Route Params                                              │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ Extract from route params:                                   │  │
│     │ - year: 2026                                                 │  │
│     │ - month: 3                                                   │  │
│     │ - weekNumbers: [9, 10, 11]                                   │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  2. Load Church ID (Fallback)                                          │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ Try: AsyncStorage.getItem('selectedChurchId')               │  │
│     │ Fallback: Use routeChurchId from params                      │  │
│     │ Result: churchId = 76                                        │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  3. Load Initial Data (First Week)                                     │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ API Call: getWeeklyReport(76, 2026, 9)                      │  │
│     │                                                              │  │
│     │ GET /weekly-reports/churches/76                             │  │
│     │     ?year=2026&week_number=9                                │  │
│     │                                                              │  │
│     │ Response: WeeklyReportData {                                │  │
│     │   church_id: 76,                                            │  │
│     │   year: 2026,                                               │  │
│     │   week_number: 9,                                           │  │
│     │   worship_sessions: [                                       │  │
│     │     {                                                        │  │
│     │       id: 72,                                               │  │
│     │       name: "Main Service",                                 │  │
│     │       day_name: "Sunday",                                   │  │
│     │       time: "09:30:00",                                     │  │
│     │       attendance: {                                         │  │
│     │         total_attendance: 175,                              │  │
│     │         adult_attendance: 95,                               │  │
│     │         youth_attendance: 50,                               │  │
│     │         child_attendance: 30,                               │  │
│     │         number_of_service_for_children: 1                   │  │
│     │       }                                                      │  │
│     │     }                                                        │  │
│     │   ],                                                         │  │
│     │   church_metrics: {                                         │  │
│     │     being_actively_discipled: 25,                           │  │
│     │     number_of_cell_groups: 5,                               │  │
│     │     ... (12 more metrics)                                   │  │
│     │   }                                                          │  │
│     │ }                                                            │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  4. Display Week 9 Data                                                │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ Week 9 (Mar 02 - Mar 08)     [< Week 9 / Week 10 >]         │  │
│     │                                                              │  │
│     │ WORSHIP SESSIONS:                                            │  │
│     │ ─────────────────────────────────────────────────────────    │  │
│     │ Main Service (Sunday 09:30)                                  │  │
│     │   Adults: [95________________]                              │  │
│     │   Youth:  [50________________]                              │  │
│     │   Children: [30________________]                            │  │
│     │   Services: [1_]                                            │  │
│     │                                                              │  │
│     │ CHURCH METRICS:                                              │  │
│     │ ─────────────────────────────────────────────────────────    │  │
│     │ Actively Discipled: [25___]                                 │  │
│     │ Cell Groups: [5___]                                         │  │
│     │ ... (12 more input fields)                                  │  │
│     │                                                              │  │
│     │ [Edit Data]                                                 │  │
│     │                                                              │  │
│     │ [← Previous] [Save] [Next →]                                │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  5. User Edits Data                                                    │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ Worship Sessions:                                            │  │
│     │   Main Service Adults: 95 → 100                              │  │
│     │                                                              │  │
│     │ Church Metrics:                                              │  │
│     │   Actively Discipled: 25 → 30                                │  │
│     │                                                              │  │
│     │ State: MonthlyDataContext stores edited data                │  │
│     │ Key: "76_2026_9"                                             │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  6. Navigate Between Weeks                                             │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ User clicks "Next →"                                         │  │
│     │                                                              │  │
│     │ Preload Week 10 in background                                │  │
│     │ API Call: getWeeklyReport(76, 2026, 10)                     │  │
│     │                                                              │  │
│     │ Display Week 10 data (same form layout)                      │  │
│     │ User can now edit Week 10                                    │  │
│     │                                                              │  │
│     │ Navigation works: Week 9 → Week 10 → Week 11                │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  7. User Clicks "Save"                                                 │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ For each modified week:                                      │  │
│     │                                                              │  │
│     │ Prepare Payload:                                             │  │
│     │ {                                                            │  │
│     │   "year": 2026,                                              │  │
│     │   "week_number": 9,                                          │  │
│     │   "worship_sessions": [                                      │  │
│     │     {                                                        │  │
│     │       "id": 72,                                              │  │
│     │       "attendance": {                                        │  │
│     │         "adult_attendance": 100,                             │  │
│     │         "youth_attendance": 50,                              │  │
│     │         "child_attendance": 30,                              │  │
│     │         "number_of_service_for_children": 1                  │  │
│     │       }                                                      │  │
│     │     }                                                        │  │
│     │   ],                                                         │  │
│     │   "church_metrics": {                                        │  │
│     │     "being_actively_discipled": 30,                          │  │
│     │     "number_of_cell_groups": 5,                              │  │
│     │     ...                                                      │  │
│     │   }                                                          │  │
│     │ }                                                            │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  8. API Call: Save All Weeks                                           │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ For each modified week (9, 10, 11):                          │  │
│     │                                                              │  │
│     │ POST /weekly-reports/churches/76                            │  │
│     │ Body: {...payload for week 9...}                             │  │
│     │                                                              │  │
│     │ POST /weekly-reports/churches/76                            │  │
│     │ Body: {...payload for week 10...}                            │  │
│     │                                                              │  │
│     │ POST /weekly-reports/churches/76                            │  │
│     │ Body: {...payload for week 11...}                            │  │
│     │                                                              │  │
│     │ Each returns: Success Response                               │  │
│     └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                         │
│  9. Show Success Message                                               │
│     ┌──────────────────────────────────────────────────────────────┐  │
│     │ ✓ Data saved successfully!                                   │  │
│     │                                                              │  │
│     │ Context is cleared                                           │  │
│     │ User can navigate back or select new weeks                   │  │
│     └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌──────────────────────────────────────────────────────────────┐
│           MonthlyDataContext (React Context)                 │
│                                                              │
│  Purpose: Persist edited data during session                │
│  Lifetime: Mounted on App root                              │
│                                                              │
│  State Structure:                                            │
│  {                                                           │
│    weekData: Map<                                            │
│      "76_2026_9" → {                                         │
│        worshipSessions: [...],                               │
│        churchMetrics: {...}                                  │
│      },                                                      │
│      "76_2026_10" → {...},                                   │
│      "76_2026_11" → {...}                                    │
│    >                                                         │
│  }                                                           │
│                                                              │
│  Functions:                                                  │
│  • getWeekData(churchId, year, weekNumber)                  │
│  • setWeekData(churchId, year, weekNumber, data)            │
│  • clearData(churchId?, year?)                              │
└──────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│  If Weekly Report Doesn't Exist                             │
│  (e.g., first time entering data for a week)                │
│                                                             │
│  API Call: getWeeklyReport(churchId, year, weekNumber)     │
│       ↓                                                     │
│  [Error: 404 Not Found]                                     │
│       ↓                                                     │
│  Caught Exception:                                          │
│  {                                                          │
│    church_id: churchId,                                    │
│    year: year,                                              │
│    week_number: weekNumber,                                 │
│    worship_sessions: [],   // Empty array                   │
│    church_metrics: {}      // Empty object                  │
│  }                                                          │
│       ↓                                                     │
│  Display Empty Form with Worship Sessions List              │
│  User can now fill in the data                              │
│  On Save: createOrUpdateWeeklyReport() creates new record   │
└─────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
MonthlyDataEntryScreen
    ├── monthlydata.service.ts
    │   ├── getWeeklyReport()
    │   ├── createOrUpdateWeeklyReport()
    │   └── getWorshipSessionsFromWeeklyReport()
    ├── MonthlyDataContext
    │   └── useMonthlyData()
    ├── AsyncStorage
    │   └── selectedChurchId
    └── React Navigation
        └── route params

MonthlyDataSelectScreen
    ├── monthlydata.service.ts
    │   ├── getWeekNumbers()
    │   └── getWeekInfo()
    ├── AsyncStorage
    │   └── selectedChurchId
    └── React Navigation
        └── navigate to MonthlyDataEntryScreen
```

---

**Last Updated:** 2026-01-24
**Status:** ✅ Production Ready
