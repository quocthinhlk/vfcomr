import {
  GoalMetricField,
  GoalPeriodDetailRow,
  GoalSectionKey,
} from '../services/overseerGoals.service';

export type GoalSectionTitleKey =
  | 'goalSectionOverseerHomeChurch'
  | 'goalSectionHomeChurchesChurchPlanting'
  | 'goalSectionNationalGoals'
  | 'goalSectionOverseerRegions';

export type GoalMetricLabelKey =
  | 'goalMetric1ChurchPlanting'
  | 'goalMetric2NewChurchPlants'
  | 'goalMetric3ReportingOnOmr'
  | 'goalMetric4HavingMfp'
  | 'goalMetric5GivingConferenceFund'
  | 'goalMetric6LiwClasses'
  | 'goalMetric7LifeGroups'
  | 'goalMetric71LifeGroups50To69'
  | 'goalMetric72LifeGroups70To89'
  | 'goalMetric73LifeGroups90To100'
  | 'goalMetric8ChurchesGrowing'
  | 'goalMetric81Growing10To19'
  | 'goalMetric82Growing20To100'
  | 'goalMetric9ChildrensProgrammes'
  | 'goalMetric10ChildrensOutreaches'
  | 'goalMetric11TrainingLeaders';

export const GOAL_SECTION_OPTIONS: Array<{
  key: GoalSectionKey;
  titleKey: GoalSectionTitleKey;
}> = [
  {key: 'home_church_goals', titleKey: 'goalSectionOverseerHomeChurch'},
  {
    key: 'home_church_planting_goals',
    titleKey: 'goalSectionHomeChurchesChurchPlanting',
  },
  {key: 'nation_goals', titleKey: 'goalSectionNationalGoals'},
  {key: 'region_goals', titleKey: 'goalSectionOverseerRegions'},
];

export const GOAL_METRIC_OPTIONS: Array<{
  key: GoalMetricField;
  labelKey: GoalMetricLabelKey;
}> = [
  {
    key: 'percent_of_churches_doing_church_planting',
    labelKey: 'goalMetric1ChurchPlanting',
  },
  {key: 'percent_new_church_plants', labelKey: 'goalMetric2NewChurchPlants'},
  {
    key: 'percent_of_churches_reporting_on_omr',
    labelKey: 'goalMetric3ReportingOnOmr',
  },
  {key: 'percent_of_churches_mfp', labelKey: 'goalMetric4HavingMfp'},
  {
    key: 'percent_of_churches_giving_conference_fund',
    labelKey: 'goalMetric5GivingConferenceFund',
  },
  {
    key: 'percent_of_churches_liw_classes',
    labelKey: 'goalMetric6LiwClasses',
  },
  {
    key: 'percent_of_churches_cell_groups',
    labelKey: 'goalMetric7LifeGroups',
  },
  {
    key: 'percent_of_churches_50_69_percent_in_cell_groups',
    labelKey: 'goalMetric71LifeGroups50To69',
  },
  {
    key: 'percent_of_churches_70_89_percent_in_cell_groups',
    labelKey: 'goalMetric72LifeGroups70To89',
  },
  {
    key: 'percent_of_churches_90_100_percent_in_cell_groups',
    labelKey: 'goalMetric73LifeGroups90To100',
  },
  {key: 'percent_of_churches_growing', labelKey: 'goalMetric8ChurchesGrowing'},
  {
    key: 'percent_of_churches_growing_by_10_19_percent',
    labelKey: 'goalMetric81Growing10To19',
  },
  {
    key: 'percent_of_churches_growing_by_20_100_percent',
    labelKey: 'goalMetric82Growing20To100',
  },
  {
    key: 'percent_of_churches_childrens_programmes',
    labelKey: 'goalMetric9ChildrensProgrammes',
  },
  {
    key: 'percent_of_churches_childrens_outreaches',
    labelKey: 'goalMetric10ChildrensOutreaches',
  },
  {
    key: 'percent_of_churches_training_leaders',
    labelKey: 'goalMetric11TrainingLeaders',
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

/** Some API strings arrive as UTF-8 bytes decoded as Latin-1 (e.g. "RegiÃ£o"). */
export function repairText(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!/[ÃÂ]/.test(text)) {
    return text;
  }
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code > 0xff) {
      return text;
    }
    bytes.push(code);
  }
  try {
    const decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    return decoded.includes('\uFFFD') ? text : decoded;
  } catch {
    return text;
  }
}
