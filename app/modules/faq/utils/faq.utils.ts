import type {FAQTag} from '../services/faq.service';

/**
 * Tags as the web saves them: trimmed, empty ones dropped and repeats removed
 * ignoring case (the API stored "qa" and "QA" as two tags).
 */
export function buildFaqTags(raw: string[]): {tag_name: string}[] {
  const seen = new Set<string>();
  const out: {tag_name: string}[] = [];
  raw.forEach(value => {
    const name = String(value ?? '').trim().replace(/\s+/g, ' ');
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push({tag_name: name});
    }
  });
  return out;
}

/** Saved tags for the form (old FAQs carry an empty tag). */
export const tagNames = (tags: FAQTag[] | null | undefined) =>
  (tags ?? []).map(tag => tag.tag_name ?? '').filter(name => name.trim());

export type FAQField = 'questionHeader' | 'answer' | 'languageId';

/**
 * API field errors → form fields. POST names them question_header / answer /
 * language_id, PATCH QuestionHeader / Answer / LanguageID.
 */
export function faqFieldErrors(
  errors: Record<string, string> | null | undefined,
): Partial<Record<FAQField, string>> {
  const out: Partial<Record<FAQField, string>> = {};
  Object.entries(errors ?? {}).forEach(([key, message]) => {
    const k = key.replace(/_/g, '').toLowerCase();
    if (k === 'questionheader') {
      out.questionHeader = message;
    } else if (k === 'answer') {
      out.answer = message;
    } else if (k === 'languageid') {
      out.languageId = message;
    }
  });
  return out;
}
