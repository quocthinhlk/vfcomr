import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';

export interface OverseerGoalPeriodItem {
  id: number;
  user_id: number;
  user_name: string;
  local_church_id: number;
  local_church_name: string;
  nation_id: number;
  nation_name: string;
  start_year: number;
  end_year: number;
  created: string;
  modified: string;
}

export interface ListOverseerGoalPeriodsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListOverseerGoalPeriodsResponse {
  success: boolean;
  data: {
    items: OverseerGoalPeriodItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export async function listOverseerGoalPeriods(
  params: ListOverseerGoalPeriodsParams = {},
) {
  const response = await api.get<ListOverseerGoalPeriodsResponse>('goal-periods', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? DEFAULT_PAGE_LIMIT,
      search: params.search?.trim() || undefined,
    },
  });

  return response.data;
}

export interface GoalPeriodPayload {
  user_id: number;
  local_church_id: number;
  nation_id: number;
  start_year: number;
  end_year: number;
}

export interface GoalPeriodDetailItem extends OverseerGoalPeriodItem {
  church_network?: string | null;
  geographical_region?: string | null;
  church_region?: string | null;
  language_region?: string | null;
}

export type GoalMetricField =
  | 'percent_of_churches_doing_church_planting'
  | 'percent_new_church_plants'
  | 'percent_of_churches_reporting_on_omr'
  | 'percent_of_churches_mfp'
  | 'percent_of_churches_giving_conference_fund'
  | 'percent_of_churches_liw_classes'
  | 'percent_of_churches_cell_groups'
  | 'percent_of_churches_50_69_percent_in_cell_groups'
  | 'percent_of_churches_70_89_percent_in_cell_groups'
  | 'percent_of_churches_90_100_percent_in_cell_groups'
  | 'percent_of_churches_growing'
  | 'percent_of_churches_growing_by_10_19_percent'
  | 'percent_of_churches_growing_by_20_100_percent'
  | 'percent_of_churches_childrens_programmes'
  | 'percent_of_churches_childrens_outreaches'
  | 'percent_of_churches_training_leaders';

export type GoalMetricBooleanField = `${GoalMetricField}_is_red`;

export type GoalPeriodDetailRow = {
  id: number;
  goal_periods_id: number;
  start_month: number;
  start_year: number;
  end_month: number;
  end_year: number;
  created: string;
  modified: string;
} & {
  [K in GoalMetricField]: number | null;
} & {
  [K in GoalMetricBooleanField]: boolean;
};

export type GoalSectionKey =
  | 'home_church_goals'
  | 'home_church_planting_goals'
  | 'nation_goals'
  | 'region_goals';

export interface GoalPeriodDetailData {
  goal_period: GoalPeriodDetailItem;
  home_church_goals: GoalPeriodDetailRow[];
  home_church_planting_goals: GoalPeriodDetailRow[];
  nation_goals: GoalPeriodDetailRow[];
  region_goals: GoalPeriodDetailRow[];
}

export interface GoalPeriodDetailResponse {
  success: boolean;
  data: GoalPeriodDetailData;
  message: string;
}

export interface GoalPeriodBatchUpdatePayload {
  home_church_goals: GoalPeriodDetailRow[];
  home_church_planting_goals: GoalPeriodDetailRow[];
  nation_goals: GoalPeriodDetailRow[];
  region_goals: GoalPeriodDetailRow[];
}

export async function getOverseerGoalPeriodDetail(id: number) {
  const response = await api.get<GoalPeriodDetailResponse>(`goal-periods/${id}`);
  return response.data;
}

export async function createOverseerGoalPeriod(payload: GoalPeriodPayload) {
  const response = await api.post('goal-periods', payload);
  return response.data;
}

export async function updateOverseerGoalPeriodParameters(
  id: number,
  payload: Omit<GoalPeriodPayload, 'user_id'>,
) {
  const response = await api.patch(`goal-periods/${id}`, payload);
  return response.data;
}

export async function updateOverseerGoalPeriodDetailsBatch(
  id: number,
  payload: GoalPeriodBatchUpdatePayload,
) {
  const response = await api.patch(`goal-periods/${id}/details-batch`, payload);
  return response.data;
}

export async function deleteOverseerGoalPeriod(id: number) {
  const response = await api.delete(`goal-periods/${id}`);
  return response.data;
}
