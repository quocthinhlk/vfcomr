import type {
  ChurchPlantingProjectionItem,
  StepsChartItem,
} from '../services/churchPlantingProjection.service';

export const STEP_COUNT = 6;
export const ROW_COUNT = 9;

/**
 * "2026-02-10" (or "2026-02-10T00:00:00Z") → local midnight of that day.
 * `new Date("2026-02-10")` is UTC midnight, so west of UTC (the Americas) it
 * showed and re-saved the day before.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!match) {
    return null;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

/** Local Date → "YYYY-MM-DD"; null for no date (the API rejects ""). */
export function formatApiDate(date: Date | null | undefined): string | null {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Date for display ("-" when empty), without the UTC day shift. */
export function formatDisplayDate(value: string | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) {
    return '-';
  }
  return date.toLocaleDateString();
}

/** The web's default pioneering date: six months after preparation. */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

/**
 * Records created on the web only have the *_original dates (the current
 * ones are null until edited), so fall back to them like the web does.
 */
export function preparationDateOf(p: Pick<
  ChurchPlantingProjectionItem,
  'start_date_preparation' | 'start_date_preparation_original'
> | null | undefined): string | null {
  return p ? p.start_date_preparation || p.start_date_preparation_original || null : null;
}

export function pioneeringDateOf(p: Pick<
  ChurchPlantingProjectionItem,
  'start_date_pioneering' | 'start_date_pioneering_original'
> | null | undefined): string | null {
  return p ? p.start_date_pioneering || p.start_date_pioneering_original || null : null;
}

/**
 * Steps done out of 6. The list (without completed_steps) returns [] and old
 * records may have fewer flags; a step counts as done when it has a completed
 * date, which is what the web toggles.
 */
export function completedStepsOf(
  p: Pick<ChurchPlantingProjectionItem, 'steps_completed' | 'steps_date_completed'> | null | undefined,
): {done: number; total: number} {
  let done = 0;
  for (let i = 0; i < STEP_COUNT; i++) {
    const flag = p?.steps_completed?.[i];
    const date = (p?.steps_date_completed as Record<string, string | null> | undefined)?.[
      `step${i + 1}_date_completed`
    ];
    if (flag || date) {
      done += 1;
    }
  }
  return {done, total: STEP_COUNT};
}

/** Search by proposed church, town or leader name (case and accents tolerant). */
export function filterProjections(
  items: ChurchPlantingProjectionItem[],
  query: string,
): ChurchPlantingProjectionItem[] {
  const normalize = (s: string | null | undefined) =>
    (s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const q = normalize(query.trim());
  if (!q) {
    return items;
  }
  return items.filter(p =>
    [p.proposed_church_name, p.town, p.proposed_leader_name].some(v => normalize(v).includes(q)),
  );
}

/** Population: digits only ("1,500" pasted → "1500"; parseInt gave 1). */
export function sanitizePopulation(text: string): string {
  return text.replace(/\D/g, '').slice(0, 12);
}

export function parsePopulation(text: string): number | null {
  const digits = sanitizePopulation(text);
  return digits ? Number(digits) : null;
}

/** Distance: a number with an optional decimal part ("2,5" → "2.5"). */
export function sanitizeDistance(text: string): string {
  const cleaned = text.replace(',', '.').replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return (rest.length ? `${whole}.${rest.join('')}` : whole).slice(0, 10);
}

/** Old step values were saved with "\r" line breaks, which Android draws badly. */
export function normalizeLineBreaks(text: string | null | undefined): string {
  return (text || '').replace(/\r\n?/g, '\n');
}

export type ProjectionFormValues = {
  town: string;
  countryId: number | null;
  proposedChurchName: string;
  proposedLeaderName: string;
  population: string;
  startDatePreparation: Date | null;
  startDatePioneering: Date | null;
  distanceToTown: string;
  distanceToTownUnit: string;
};

export type ProjectionFormField = keyof ProjectionFormValues;

export const EMPTY_PROJECTION_FORM: ProjectionFormValues = {
  town: '',
  countryId: null,
  proposedChurchName: '',
  proposedLeaderName: '',
  population: '',
  startDatePreparation: null,
  startDatePioneering: null,
  distanceToTown: '',
  distanceToTownUnit: 'km',
};

/**
 * Required fields as on the web: town, nation, church and leader names; the
 * start dates when creating (the web's edit form leaves them optional).
 * Distance and population are optional (107 records have no distance, which
 * made them impossible to edit in the app).
 */
export function validateProjectionForm(
  values: ProjectionFormValues,
  mode: 'create' | 'edit',
): Partial<Record<ProjectionFormField, boolean>> {
  const invalid: Partial<Record<ProjectionFormField, boolean>> = {};
  if (!values.town.trim()) {
    invalid.town = true;
  }
  if (!values.countryId) {
    invalid.countryId = true;
  }
  if (!values.proposedChurchName.trim()) {
    invalid.proposedChurchName = true;
  }
  if (!values.proposedLeaderName.trim()) {
    invalid.proposedLeaderName = true;
  }
  if (mode === 'create') {
    if (!values.startDatePreparation) {
      invalid.startDatePreparation = true;
    }
    if (!values.startDatePioneering) {
      invalid.startDatePioneering = true;
    }
  }
  return invalid;
}

export function formValuesFromProjection(p: ChurchPlantingProjectionItem): ProjectionFormValues {
  return {
    town: p.town || '',
    countryId: p.country_id || null,
    proposedChurchName: p.proposed_church_name || '',
    proposedLeaderName: p.proposed_leader_name || '',
    population: p.population != null ? String(p.population) : '',
    startDatePreparation: parseApiDate(preparationDateOf(p)),
    startDatePioneering: parseApiDate(pioneeringDateOf(p)),
    distanceToTown: p.distance_to_town || '',
    distanceToTownUnit: p.distance_to_town_unit === 'miles' ? 'miles' : 'km',
  };
}

function commonPayload(values: ProjectionFormValues) {
  return {
    town: values.town.trim(),
    country_id: values.countryId as number,
    proposed_church_name: values.proposedChurchName.trim(),
    proposed_leader_name: values.proposedLeaderName.trim(),
    population: parsePopulation(values.population),
    distance_to_town: values.distanceToTown.trim(),
    distance_to_town_unit: values.distanceToTownUnit || 'km',
  };
}

/** New projection: the planned dates are both the current and the original ones. */
export function buildCreatePayload(values: ProjectionFormValues, churchId: number) {
  const prep = formatApiDate(values.startDatePreparation) as string;
  const pioneer = formatApiDate(values.startDatePioneering) as string;
  return {
    church_id: churchId,
    ...commonPayload(values),
    start_date_preparation: prep,
    start_date_preparation_original: prep,
    start_date_pioneering: pioneer,
    start_date_pioneering_original: pioneer,
  };
}

/**
 * Edit changes the current dates only; the *_original dates are the first
 * plan and stay as they were (the app used to overwrite them on every save).
 */
export function buildUpdatePayload(
  values: ProjectionFormValues,
  original: ChurchPlantingProjectionItem,
) {
  return {
    church_id: original.church_id,
    ...commonPayload(values),
    start_date_preparation: formatApiDate(values.startDatePreparation),
    start_date_preparation_original: original.start_date_preparation_original || null,
    start_date_pioneering: formatApiDate(values.startDatePioneering),
    start_date_pioneering_original: original.start_date_pioneering_original || null,
    user_id: original.user_id || undefined,
  };
}

/** Key of a step field, e.g. stepKey(2, 'date_proposed') → "step2_date_proposed". */
export const stepKey = (step: number, field: string) =>
  `step${step}_${field}` as keyof StepsChartItem;

/**
 * Whole steps chart as the web sends it: titles, per-step dates, values and
 * completed flags (steps 7-9 only have flags). `*_date_proposed_original` is
 * sent back unchanged.
 */
export function buildStepsPayload(chart: StepsChartItem): Record<string, unknown> {
  const c = chart as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {
    date_proposed: c.date_proposed ?? null,
    date_completed: c.date_completed ?? null,
  };
  for (let row = 1; row <= ROW_COUNT; row++) {
    payload[`row${row}_title`] = c[`row${row}_title`] ?? '';
  }
  for (let step = 1; step <= STEP_COUNT; step++) {
    for (const field of ['date_proposed', 'date_proposed_original', 'date_completed']) {
      payload[`step${step}_${field}`] = c[`step${step}_${field}`] || null;
    }
    for (let row = 1; row <= ROW_COUNT; row++) {
      payload[`step${step}_row${row}_value`] = c[`step${step}_row${row}_value`] ?? null;
      payload[`step${step}_row${row}_completed`] = c[`step${step}_row${row}_completed`] ?? null;
    }
  }
  for (let step = STEP_COUNT + 1; step <= 9; step++) {
    for (let row = 1; row <= ROW_COUNT; row++) {
      payload[`step${step}_row${row}_completed`] = c[`step${step}_row${row}_completed`] ?? null;
    }
  }
  return payload;
}
