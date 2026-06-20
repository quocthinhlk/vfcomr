export const parseWeekEndDate = (label: string) => {
  if (!label) {
    return null;
  }

  const rangeMatch = label.match(/^\s*(.*?)\s*[–-]\s*(.*?)\s*$/);
  const endPart = rangeMatch?.[2]?.trim();
  const yearMatch = label.match(/(\d{4})\s*$/);
  if (!endPart || !yearMatch) {
    return null;
  }

  const normalized = /\d{4}$/.test(endPart)
    ? endPart
    : `${endPart} ${yearMatch[1]}`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatWeekEndLabel = (label: string, locale: string) => {
  const date = parseWeekEndDate(label);
  if (!date) {
    return label;
  }

  const day = date.getDate();
  const month = date.toLocaleString(locale, {month: 'short'});
  const year = String(date.getFullYear()).slice(-2);

  return `${day} ${month} ${year}`;
};

/** Short date for tooltips, e.g. "02 Feb". */
export const formatWeekTooltipDate = (label: string, locale: string) => {
  const date = parseWeekEndDate(label);
  if (!date) {
    return label;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString(locale, {month: 'short'});

  return `${day} ${month}`;
};
