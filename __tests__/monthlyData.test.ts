/** Monthly data entry: number fields, week edits and the batch save payload. */
import {
  applyMetricEdit,
  applySessionEdit,
  buildBatchPayloads,
  calculateTotalAttendance,
  emptyWeek,
  formatNumber,
  mergeWorshipSessions,
  parseNumber,
} from '../app/modules/monthlydata/utils/monthlyData.utils';
import type {WeeklyReportData, WorshipSession} from '../app/modules/monthlydata/services/monthlydata.service';

const session = (id: number, adult: number | null = null): WorshipSession => ({
  id,
  name: `S${id}`,
  day_name: 'Sunday',
  time: '10:00:00',
  attendance: {
    adult_attendance: adult,
    youth_attendance: null,
    child_attendance: null,
    number_of_service_for_children: null,
    total_attendance: adult,
  },
});

const week = (n: number, sessions: WorshipSession[], metrics: any = {}): WeeklyReportData => ({
  church_id: 76,
  year: 2026,
  week_number: n,
  worship_sessions: sessions,
  church_metrics: metrics,
});

describe('number fields', () => {
  it('parses what the field shows and what is typed', () => {
    expect(parseNumber('1,234,567')).toBe(1234567);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('   ')).toBeNull();
    expect(parseNumber('0')).toBe(0);
    expect(parseNumber('007')).toBe(7);
  });

  it('deleting a digit from "1,234" keeps the remaining digits', () => {
    expect(parseNumber('1,23')).toBe(123);
  });

  it('a decimal part is dropped, not multiplied in (was 12.50 → 1250)', () => {
    expect(parseNumber('12.50')).toBe(12);
    expect(parseNumber('1,234.56')).toBe(1234);
    expect(parseNumber('12.')).toBe(12);
  });

  it('stays exact for long inputs', () => {
    expect(parseNumber('9'.repeat(20))).toBe(999999999999999);
    expect(Number.isSafeInteger(parseNumber('9'.repeat(20)))).toBe(true);
  });

  it('formats with thousands separators', () => {
    expect(formatNumber(99999999)).toBe('99,999,999');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('');
  });
});

describe('week edits', () => {
  it('attendance edits update the total; all zero is a total of 0, all empty is none', () => {
    const edited = applySessionEdit(week(1, [session(72, 20)]), 72, 'youth_attendance', 8);
    expect(edited.worship_sessions[0].attendance.total_attendance).toBe(28);
    expect(calculateTotalAttendance({adult_attendance: 0, youth_attendance: 0, child_attendance: 0})).toBe(0);
    expect(calculateTotalAttendance({adult_attendance: null, youth_attendance: null, child_attendance: null})).toBeNull();
  });

  it('only the edited session changes', () => {
    const edited = applySessionEdit(week(1, [session(1, 5), session(2, 6)]), 2, 'adult_attendance', 9);
    expect(edited.worship_sessions.map(s => s.attendance.adult_attendance)).toEqual([5, 9]);
  });

  it('changing a local giving amount clears its stale USD value', () => {
    const base = week(1, [], {giving_in_local_currency: 1000, giving_in_usd: 40, mfp_in_local_currency: 5, mfp_in_usd: 1});
    const edited = applyMetricEdit(base, 'giving_in_local_currency', 2000);
    expect(edited.church_metrics).toMatchObject({giving_in_local_currency: 2000, giving_in_usd: null, mfp_in_usd: 1});
    expect(applyMetricEdit(base, 'giving_in_local_currency', 1000).church_metrics.giving_in_usd).toBe(40);
    expect(applyMetricEdit(base, 'weekly_decisions_made', 3).church_metrics.giving_in_usd).toBe(40);
  });

  it('merges reported attendance into the church services', () => {
    const merged = mergeWorshipSessions([session(1), session(2)], [session(2, 30), session(9, 4)]);
    expect(merged.map(s => [s.id, s.attendance.adult_attendance])).toEqual([[1, null], [2, 30], [9, 4]]);
    expect(mergeWorshipSessions([], [session(3, 1)]).map(s => s.id)).toEqual([3]);
  });
});

describe('batch save payload', () => {
  const services = [session(72)];

  it('saves every week with its own data', () => {
    const data = new Map([
      [1, week(1, [session(72, 10)], {weekly_decisions_made: 1})],
      [2, week(2, [session(72, 20)], {weekly_decisions_made: 2})],
    ]);
    const result = buildBatchPayloads(76, 2026, [1, 2], data);
    expect(result.ok && result.payloads.map(p => [p.week_number, p.worship_sessions[0].attendance.adult_attendance, p.church_metrics.weekly_decisions_made])).toEqual([
      [1, 10, 1],
      [2, 20, 2],
    ]);
  });

  it('never saves a week that did not load (it used to get the current week\'s numbers)', () => {
    const data = new Map([[1, week(1, [session(72, 10)])]]);
    expect(buildBatchPayloads(76, 2026, [1, 2], data)).toEqual({ok: false, reason: 'notLoaded', weekNumber: 2});
  });

  it('checks Adults in every week, not only the one on screen', () => {
    const data = new Map([
      [1, week(1, [session(72, null)])],
      [2, week(2, [session(72, 20)])],
    ]);
    expect(buildBatchPayloads(76, 2026, [1, 2], data)).toEqual({ok: false, reason: 'missingAttendance', weekNumber: 1});
    expect(buildBatchPayloads(76, 2026, [1], new Map([[1, emptyWeek(76, 2026, 1, services)]]))).toMatchObject({ok: false});
  });
});
