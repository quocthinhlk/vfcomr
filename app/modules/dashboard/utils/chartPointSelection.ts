export type SelectedChartPoint = {
  seriesKey: string;
  seriesName: string;
  color: string;
  weekIndex: number;
  value: number;
  cx: number;
  cy: number;
};

export type ChartDot = {
  key: string;
  cx: number;
  cy: number;
  index: number;
  value: number;
};

export const toggleChartPointSelection = (
  current: SelectedChartPoint | null,
  next: SelectedChartPoint,
): SelectedChartPoint | null => {
  if (
    current?.seriesKey === next.seriesKey &&
    current?.weekIndex === next.weekIndex
  ) {
    return null;
  }
  return next;
};
