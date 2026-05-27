/** Persisted preference for Monthly Data Entry form density. */
export const MONTHLY_DATA_ENTRY_LAYOUT_STORAGE_KEY =
  '@vfcomr/monthly_data_entry_column_layout';

export type MonthlyDataEntryColumnLayout = 'single' | 'double';

/** Issue #64: default to single column (scroll down only). */
export const DEFAULT_MONTHLY_DATA_ENTRY_COLUMN_LAYOUT: MonthlyDataEntryColumnLayout =
  'single';

export function parseMonthlyDataEntryColumnLayout(
  raw: string | null,
): MonthlyDataEntryColumnLayout {
  if (raw === 'double') {
    return 'double';
  }
  return DEFAULT_MONTHLY_DATA_ENTRY_COLUMN_LAYOUT;
}

/** Fixed column widths for 1-column form rows (label | input). */
export const MONTHLY_DATA_ENTRY_SINGLE_LABEL_WIDTH = '70%' as const;
export const MONTHLY_DATA_ENTRY_SINGLE_INPUT_WIDTH = '30%' as const;

/** Fixed column width for 2-column paired rows. */
export const MONTHLY_DATA_ENTRY_DOUBLE_FIELD_WIDTH = '50%' as const;
