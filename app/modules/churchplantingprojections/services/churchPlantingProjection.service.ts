import api from '../../../config/api';

export interface ChurchPlantingProjectionItem {
  id: number;
  church_id: number;
  town: string;
  country_id: number;
  proposed_church_name: string;
  proposed_leader_name: string;
  population: number | null;
  start_date_preparation: string;
  start_date_preparation_original: string;
  start_date_pioneering: string;
  start_date_pioneering_original: string;
  distance_to_town: string;
  distance_to_town_unit: string;
  user_id: number;
  steps_completed: boolean[];
  steps_date_completed: {
    step1_date_completed: string | null;
    step2_date_completed: string | null;
    step3_date_completed: string | null;
    step4_date_completed: string | null;
    step5_date_completed: string | null;
    step6_date_completed: string | null;
  };
  created: string;
  modified: string;
}

export interface ListChurchPlantingProjectionsResponse {
  success: boolean;
  data: {
    items: ChurchPlantingProjectionItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface GetChurchPlantingProjectionResponse {
  success: boolean;
  data: ChurchPlantingProjectionItem;
  message: string;
}

export interface StepsChartItem {
  id: number;
  church_planting_projection_id: number;
  date_proposed: string | null;
  date_completed: string | null;
  created: string;
  modified: string;
  row1_title: string;
  row2_title: string;
  row3_title: string;
  row4_title: string;
  row5_title: string;
  row6_title: string;
  row7_title: string;
  row8_title: string;
  row9_title: string;
  step1_date_proposed: string | null;
  step1_date_proposed_original: string | null;
  step1_date_completed: string | null;
  step1_row1_value: string | null;
  step1_row2_value: string | null;
  step1_row3_value: string | null;
  step1_row4_value: string | null;
  step1_row5_value: string | null;
  step1_row6_value: string | null;
  step1_row7_value: string | null;
  step1_row8_value: string | null;
  step1_row9_value: string | null;
  step1_row1_completed: boolean | null;
  step1_row2_completed: boolean | null;
  step1_row3_completed: boolean | null;
  step1_row4_completed: boolean | null;
  step1_row5_completed: boolean | null;
  step1_row6_completed: boolean | null;
  step1_row7_completed: boolean | null;
  step1_row8_completed: boolean | null;
  step1_row9_completed: boolean | null;
  step2_date_proposed: string | null;
  step2_date_proposed_original: string | null;
  step2_date_completed: string | null;
  step2_row1_value: string | null;
  step2_row2_value: string | null;
  step2_row3_value: string | null;
  step2_row4_value: string | null;
  step2_row5_value: string | null;
  step2_row6_value: string | null;
  step2_row7_value: string | null;
  step2_row8_value: string | null;
  step2_row9_value: string | null;
  step2_row1_completed: boolean | null;
  step2_row2_completed: boolean | null;
  step2_row3_completed: boolean | null;
  step2_row4_completed: boolean | null;
  step2_row5_completed: boolean | null;
  step2_row6_completed: boolean | null;
  step2_row7_completed: boolean | null;
  step2_row8_completed: boolean | null;
  step2_row9_completed: boolean | null;
  step3_date_proposed: string | null;
  step3_date_proposed_original: string | null;
  step3_date_completed: string | null;
  step3_row1_value: string | null;
  step3_row2_value: string | null;
  step3_row3_value: string | null;
  step3_row4_value: string | null;
  step3_row5_value: string | null;
  step3_row6_value: string | null;
  step3_row7_value: string | null;
  step3_row8_value: string | null;
  step3_row9_value: string | null;
  step3_row1_completed: boolean | null;
  step3_row2_completed: boolean | null;
  step3_row3_completed: boolean | null;
  step3_row4_completed: boolean | null;
  step3_row5_completed: boolean | null;
  step3_row6_completed: boolean | null;
  step3_row7_completed: boolean | null;
  step3_row8_completed: boolean | null;
  step3_row9_completed: boolean | null;
  step4_date_proposed: string | null;
  step4_date_proposed_original: string | null;
  step4_date_completed: string | null;
  step4_row1_value: string | null;
  step4_row2_value: string | null;
  step4_row3_value: string | null;
  step4_row4_value: string | null;
  step4_row5_value: string | null;
  step4_row6_value: string | null;
  step4_row7_value: string | null;
  step4_row8_value: string | null;
  step4_row9_value: string | null;
  step4_row1_completed: boolean | null;
  step4_row2_completed: boolean | null;
  step4_row3_completed: boolean | null;
  step4_row4_completed: boolean | null;
  step4_row5_completed: boolean | null;
  step4_row6_completed: boolean | null;
  step4_row7_completed: boolean | null;
  step4_row8_completed: boolean | null;
  step4_row9_completed: boolean | null;
  step5_date_proposed: string | null;
  step5_date_proposed_original: string | null;
  step5_date_completed: string | null;
  step5_row1_value: string | null;
  step5_row2_value: string | null;
  step5_row3_value: string | null;
  step5_row4_value: string | null;
  step5_row5_value: string | null;
  step5_row6_value: string | null;
  step5_row7_value: string | null;
  step5_row8_value: string | null;
  step5_row9_value: string | null;
  step5_row1_completed: boolean | null;
  step5_row2_completed: boolean | null;
  step5_row3_completed: boolean | null;
  step5_row4_completed: boolean | null;
  step5_row5_completed: boolean | null;
  step5_row6_completed: boolean | null;
  step5_row7_completed: boolean | null;
  step5_row8_completed: boolean | null;
  step5_row9_completed: boolean | null;
  step6_date_proposed: string | null;
  step6_date_proposed_original: string | null;
  step6_date_completed: string | null;
  step6_row1_value: string | null;
  step6_row2_value: string | null;
  step6_row3_value: string | null;
  step6_row4_value: string | null;
  step6_row5_value: string | null;
  step6_row6_value: string | null;
  step6_row7_value: string | null;
  step6_row8_value: string | null;
  step6_row9_value: string | null;
  step6_row1_completed: boolean | null;
  step6_row2_completed: boolean | null;
  step6_row3_completed: boolean | null;
  step6_row4_completed: boolean | null;
  step6_row5_completed: boolean | null;
  step6_row6_completed: boolean | null;
  step6_row7_completed: boolean | null;
  step6_row8_completed: boolean | null;
  step6_row9_completed: boolean | null;
  step7_row1_completed: boolean | null;
  step7_row2_completed: boolean | null;
  step7_row3_completed: boolean | null;
  step7_row4_completed: boolean | null;
  step7_row5_completed: boolean | null;
  step7_row6_completed: boolean | null;
  step7_row7_completed: boolean | null;
  step7_row8_completed: boolean | null;
  step7_row9_completed: boolean | null;
  step8_row1_completed: boolean | null;
  step8_row2_completed: boolean | null;
  step8_row3_completed: boolean | null;
  step8_row4_completed: boolean | null;
  step8_row5_completed: boolean | null;
  step8_row6_completed: boolean | null;
  step8_row7_completed: boolean | null;
  step8_row8_completed: boolean | null;
  step8_row9_completed: boolean | null;
  step9_row1_completed: boolean | null;
  step9_row2_completed: boolean | null;
  step9_row3_completed: boolean | null;
  step9_row4_completed: boolean | null;
  step9_row5_completed: boolean | null;
  step9_row6_completed: boolean | null;
  step9_row7_completed: boolean | null;
  step9_row8_completed: boolean | null;
  step9_row9_completed: boolean | null;
}

export interface GetStepsChartResponse {
  success: boolean;
  data: StepsChartItem;
  message: string;
}

export interface CreateChurchPlantingProjectionPayload {
  church_id: number;
  town: string;
  country_id: number;
  proposed_church_name: string;
  proposed_leader_name: string;
  population?: number | null;
  start_date_preparation: string;
  start_date_preparation_original: string;
  start_date_pioneering: string;
  start_date_pioneering_original: string;
  distance_to_town: string;
  distance_to_town_unit: string;
}

export interface UpdateChurchPlantingProjectionPayload {
  church_id: number;
  town: string;
  country_id: number;
  proposed_church_name: string;
  proposed_leader_name: string;
  population?: number | null;
  start_date_preparation: string;
  start_date_preparation_original: string;
  start_date_pioneering: string;
  start_date_pioneering_original: string;
  distance_to_town: string;
  distance_to_town_unit: string;
  user_id?: number;
}

export interface UpdateStepsChartPayload {
  date_proposed?: string | null;
  date_completed?: string | null;
  row1_title?: string;
  row2_title?: string;
  row3_title?: string;
  row4_title?: string;
  row5_title?: string;
  row6_title?: string;
  row7_title?: string;
  row8_title?: string;
  row9_title?: string;
  [key: string]: any; // For all step fields
}

export async function listChurchPlantingProjections(churchId: number, completedSteps?: boolean) {
  const response = await api.get<ListChurchPlantingProjectionsResponse>(
    `/church-planting-projections`,
    {
      params: {
        church_id: churchId,
        completed_steps: completedSteps !== undefined ? completedSteps : true,
      },
    },
  );
  return response.data;
}

export async function getChurchPlantingProjectionById(id: number) {
  const response = await api.get<GetChurchPlantingProjectionResponse>(
    `/church-planting-projections/${id}`,
  );
  return response.data;
}

export async function getStepsChartByProjectionId(id: number) {
  const response = await api.get<GetStepsChartResponse>(
    `/church-planting-projections/${id}/steps`,
  );
  return response.data;
}

export async function createChurchPlantingProjection(
  payload: CreateChurchPlantingProjectionPayload,
) {
  try {
    const response = await api.post(`/church-planting-projections`, payload);
    return response.data;
  } catch (err: any) {
    const message =
      err?.response?.data?.message || err?.message || 'Create Church Planting Projection failed';
    console.error('Create Church Planting Projection error:', message);
    throw new Error(message);
  }
}

export async function updateChurchPlantingProjection(
  id: number,
  payload: UpdateChurchPlantingProjectionPayload,
) {
  try {
    const response = await api.patch(`/church-planting-projections/${id}`, payload);
    return response.data;
  } catch (err: any) {
    const message =
      err?.response?.data?.message || err?.message || 'Update Church Planting Projection failed';
    console.error('Update Church Planting Projection error:', message);
    throw new Error(message);
  }
}

export async function deleteChurchPlantingProjection(id: number) {
  try {
    const response = await api.delete(`/church-planting-projections/${id}`);
    return response.data;
  } catch (err: any) {
    const message =
      err?.response?.data?.message || err?.message || 'Delete Church Planting Projection failed';
    console.error('Delete Church Planting Projection error:', message);
    throw new Error(message);
  }
}

export async function updateStepsChart(id: number, payload: UpdateStepsChartPayload) {
  try {
    const response = await api.patch(`/church-planting-projections/${id}/steps`, payload);
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Update Steps Chart failed';
    console.error('Update Steps Chart error:', message);
    throw new Error(message);
  }
}

