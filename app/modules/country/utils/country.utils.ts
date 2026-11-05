import {COUNTRY_NAME_MAX} from '../services/country.service';

export type CountryNameError = 'required' | 'tooLong' | 'duplicate';

/** Required (the API saves a name of spaces) and at most 255 characters (SQL error above). */
export function validateCountryName(name: string): CountryNameError | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'required';
  }
  if (trimmed.length > COUNTRY_NAME_MAX) {
    return 'tooLong';
  }
  return null;
}

/** The name as saved: trimmed, inner runs of spaces collapsed. */
export function cleanCountryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** "Country name already exists" from POST, so it shows under the field. */
export function isDuplicateNameError(error: any): boolean {
  const message = String(error?.response?.data?.message ?? error?.message ?? '');
  return /already exists/i.test(message);
}
