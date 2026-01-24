# Monthly Data Module - Implementation Guide

## Overview

The Monthly Data module handles weekly reporting for churches within the VFCOMR app. It provides a complete flow for:
1. **Selecting weeks** to enter data for (by year and month)
2. **Entering/editing** worship session attendance and church metrics
3. **Saving** the weekly report data to the backend

## API Integration

### 1. Get Week Numbers
Retrieves available weeks for a given year, month, and church

**Endpoint:** `GET /api/v1/week-numbers?year={year}&month={month}&church_id={churchId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 3,
    "weeks": [
      { "week_number": 9, "is_reported": false },
      { "week_number": 10, "is_reported": false }
    ]
  },
  "message": "Request was successful"
}
```

**Service Functions:**
```typescript
// Returns only week numbers (simplified)
const weekNumbers = await getWeekNumbers(2026, 3, churchId);
// Returns [9, 10, 11, 12, 13]

// Returns week info with is_reported status
const weekInfo = await getWeekInfo(2026, 3, churchId);
// Returns [{week_number: 9, is_reported: false}, ...]
```

### 2. Get Weekly Report
Retrieves complete data for a specific week

**Endpoint:** `GET /api/v1/weekly-reports/churches/{churchId}?year={year}&week_number={weekNumber}`

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
      // ... other metrics
    }
  },
  "message": "Request was successful"
}
```

**Service Function:**
```typescript
const report = await getWeeklyReport(churchId, 2025, 27);
// Returns WeeklyReportData with all worship sessions and metrics
```

### 3. Create/Update Weekly Report
Saves weekly report data

**Endpoint:** `POST /api/v1/weekly-reports/churches/{churchId}`

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
    // ... other metrics
  }
}
```

**Service Function:**
```typescript
const payload: CreateWeeklyReportPayload = {
  year: 2025,
  week_number: 27,
  worship_sessions: [...],
  church_metrics: {...}
};
await createOrUpdateWeeklyReport(churchId, payload);
```

## Data Flow

### User Journey

```
1. User navigates to Monthly Data from Dashboard
   ↓
2. MonthlyDataSelectScreen
   - User selects Year
   - User selects Month
   - App calls getWeekNumbers(year, month, churchId)
   - Weeks are displayed with checkboxes
   - User selects one or more weeks
   - User clicks "Next"
   ↓
3. MonthlyDataEntryScreen
   - App loads first week's data via getWeeklyReport()
   - Worship sessions are displayed
   - Church metrics form is displayed
   - User edits data for current week
   - User can navigate between selected weeks
   - User clicks "Save"
   - App calls createOrUpdateWeeklyReport() for each modified week
   - Success confirmation is shown
```

## Church ID Management

The church ID is managed through AsyncStorage and is sourced from the Dashboard:

```typescript
// In DashboardPastorLeaderScreen
// When user selects a church:
await AsyncStorage.setItem('selectedChurchId', String(churchId));

// In MonthlyDataSelectScreen & MonthlyDataEntryScreen
// Retrieve the saved church ID:
const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
const churchId = parseInt(savedChurchId, 10);

// Use in all API calls:
await getWeekNumbers(year, month, churchId);
await getWeeklyReport(churchId, year, weekNumber);
await createOrUpdateWeeklyReport(churchId, payload);
```

## Key Features

### 1. Week Selection
- Display weeks with `is_reported` status (visual indicator for reported weeks)
- Multi-select weeks to enter data for multiple weeks at once
- Automatic sorting by week number

### 2. Worship Sessions
- Display all configured worship sessions for the church
- Input attendance for each session:
  - Adult attendance
  - Youth attendance
  - Child attendance
  - Number of services for children
- Auto-calculate total attendance

### 3. Church Metrics
- 14 configurable metrics:
  - Discipleship: `being_actively_discipled`, `number_of_leaders_in_training_for_cpm`
  - Cell Groups: `number_of_cell_groups`, `cell_group_weekly_attendance`
  - Education: `number_of_liw_classes`, `liw_total_students`
  - Prayer: `number_of_prayer_meetings`, `prayer_meeting_weekly_attendance`
  - New Members: `weekly_decisions_made`, `weekly_water_baptism`
  - Giving: `giving_in_local_currency`, `giving_in_usd`, `mfp_in_local_currency`, `mfp_in_usd`

### 4. Data Persistence
- Context-based state management (MonthlyDataContext)
- Stores edited data in memory during session
- Supports navigation between weeks without losing edits
- Saves to backend via API when user confirms

### 5. Error Handling
- Graceful fallback to empty data if report doesn't exist (creates new report)
- User-friendly error messages
- API error details logged to console
- Retry capability

## TypeScript Interfaces

### Data Types
```typescript
// Week information with reporting status
export interface WeekInfo {
  week_number: number;
  is_reported: boolean;
}

// Worship session attendance data
export interface WorshipSessionAttendance {
  adult_attendance: number | null;
  youth_attendance: number | null;
  child_attendance: number | null;
  number_of_service_for_children: number | null;
  total_attendance?: number | null;
}

// Individual worship session
export interface WorshipSession {
  id: number;
  name: string;
  day_name: string;
  time: string;
  attendance: WorshipSessionAttendance;
}

// Church metrics for a week
export interface ChurchMetrics {
  being_actively_discipled: number | null;
  number_of_cell_groups: number | null;
  cell_group_weekly_attendance: number | null;
  number_of_leaders_in_training_for_cpm: number | null;
  number_of_liw_classes: number | null;
  liw_total_students: number | null;
  number_of_prayer_meetings: number | null;
  prayer_meeting_weekly_attendance: number | null;
  weekly_decisions_made: number | null;
  weekly_water_baptism: number | null;
  giving_in_local_currency: number | null;
  giving_in_usd: number | null;
  mfp_in_local_currency: number | null;
  mfp_in_usd: number | null;
}

// Complete weekly report
export interface WeeklyReportData {
  church_id: number;
  year: number;
  week_number: number;
  currency_id?: number;
  worship_sessions: WorshipSession[];
  church_metrics: ChurchMetrics;
}
```

## File Locations

- **Service Functions:** `app/modules/monthlydata/services/monthlydata.service.ts`
- **Week Selection UI:** `app/modules/monthlydata/screens/MonthlyDataSelectScreen.tsx`
- **Data Entry UI:** `app/modules/monthlydata/screens/MonthlyDataEntryScreen.tsx`
- **State Management:** `app/modules/monthlydata/context/MonthlyDataContext.tsx`

## Testing Notes

When testing the module, ensure:
1. Church is selected and saved to AsyncStorage in Dashboard
2. Year and month have available weeks in the database
3. Weekly report data exists (or API supports creating new reports)
4. User has proper permissions to save reports
5. Network connectivity is available for API calls

## Future Enhancements

The infrastructure supports these future features:
1. **Visual indicators for reported weeks** - Use `is_reported` from `getWeekInfo()`
2. **Batch operations** - `batchCreateOrUpdateWeeklyReports()` is already implemented
3. **Last 4 weeks summary** - `getLast4WeeksReports()` is already implemented
4. **Offline support** - Data is stored in context, can be persisted locally
5. **Concurrent editing** - Multiple users editing different weeks simultaneously

---

**Module Status:** ✅ **PRODUCTION READY**

All APIs are correctly implemented and tested against specifications.
