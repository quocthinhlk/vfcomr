import {
  GoalMetricField,
  GoalPeriodDetailRow,
  GoalSectionKey,
} from '../services/overseerGoals.service';

export const GOAL_SECTION_OPTIONS: Array<{
  key: GoalSectionKey;
  title: string;
}> = [
  {key: 'home_church_goals', title: 'Home Church Goals'},
  {key: 'home_church_planting_goals', title: 'Home Church Planting Goals'},
  {key: 'nation_goals', title: 'Nation Goals'},
  {key: 'region_goals', title: 'Region Goals'},
];

export const GOAL_METRIC_OPTIONS: Array<{
  key: GoalMetricField;
  label: string;
}> = [
  {
    key: 'percent_of_churches_doing_church_planting',
    label: '% Churches Doing Church Planting',
  },
  {key: 'percent_new_church_plants', label: '% New Church Plants'},
  {
    key: 'percent_of_churches_reporting_on_omr',
    label: '% Churches Reporting on OMR',
  },
  {key: 'percent_of_churches_mfp', label: '% Churches MFP'},
  {
    key: 'percent_of_churches_giving_conference_fund',
    label: '% Churches Giving Conference Fund',
  },
  {
    key: 'percent_of_churches_liw_classes',
    label: '% Churches with LIW Classes',
  },
  {key: 'percent_of_churches_cell_groups', label: '% Churches with Cell Groups'},
  {
    key: 'percent_of_churches_50_69_percent_in_cell_groups',
    label: '% Churches 50-69% in Cell Groups',
  },
  {
    key: 'percent_of_churches_70_89_percent_in_cell_groups',
    label: '% Churches 70-89% in Cell Groups',
  },
  {
    key: 'percent_of_churches_90_100_percent_in_cell_groups',
    label: '% Churches 90-100% in Cell Groups',
  },
  {key: 'percent_of_churches_growing', label: '% Churches Growing'},
  {
    key: 'percent_of_churches_growing_by_10_19_percent',
    label: '% Churches Growing by 10-19%',
  },
  {
    key: 'percent_of_churches_growing_by_20_100_percent',
    label: '% Churches Growing by 20-100%',
  },
  {
    key: 'percent_of_churches_childrens_programmes',
    label: "% Churches with Children's Programmes",
  },
  {
    key: 'percent_of_churches_childrens_outreaches',
    label: "% Churches with Children's Outreaches",
  },
  {
    key: 'percent_of_churches_training_leaders',
    label: '% Churches Training Leaders',
  },
];

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatGoalRangeLabel(item: Pick<
  GoalPeriodDetailRow,
  'start_month' | 'start_year' | 'end_month' | 'end_year'
>) {
  const startMonth = MONTH_LABELS[item.start_month - 1] || String(item.start_month);
  const endMonth = MONTH_LABELS[item.end_month - 1] || String(item.end_month);
  return `${startMonth} ${item.start_year} - ${endMonth} ${item.end_year}`;
}

export function countFilledGoalMetrics(item: GoalPeriodDetailRow) {
  return GOAL_METRIC_OPTIONS.reduce((count, metric) => {
    return item[metric.key] === null ? count : count + 1;
  }, 0);
}

export function countRedGoalMetrics(item: GoalPeriodDetailRow) {
  return GOAL_METRIC_OPTIONS.reduce((count, metric) => {
    return item[`${metric.key}_is_red`] ? count + 1 : count;
  }, 0);
}
