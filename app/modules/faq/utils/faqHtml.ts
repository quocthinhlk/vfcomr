/**
 * FAQ answers are HTML authored in the web editor (paragraphs, lists, entities,
 * `<img src="/uploads/...">`). Some newer ones are plain text.
 */

/** Host that serves the relative `/uploads/...` images inside FAQ answers. */
export const FAQ_ASSET_BASE_URL = 'https://vfc-omr.org';

const HTML_TAG_RE = /<\/?[a-z][\s\S]*?>/i;

export const isHtml = (value: string): boolean => HTML_TAG_RE.test(value || '');

/** HTML → readable plain text (for editing in a text field). */
export const convertHtmlToText = (html: string): string => {
  if (!html) {
    return '';
  }

  // In HTML, source line breaks (the API stores "\r\n") are just whitespace;
  // only tags like <br>/<p> are real breaks. Plain-text answers keep theirs.
  let text = isHtml(html)
    ? html.replace(/\s*\r?\n\s*/g, ' ')
    : html.replace(/\r\n?/g, '\n');

  // Replace block-level elements with newlines
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&rsquo;/g, '’');
  text = text.replace(/&lsquo;/g, '‘');
  text = text.replace(/&rdquo;/g, '”');
  text = text.replace(/&ldquo;/g, '“');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&hellip;/g, '…');
  text = text.replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  // Last, so "&amp;lt;" decodes to the literal "&lt;" and not "<".
  text = text.replace(/&amp;/g, '&');

  // Tidy whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');

  return text.trim();
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Plain text typed in the app → simple HTML, so line breaks survive on the web
 * (which renders `answer` as HTML): blank lines split paragraphs, single
 * newlines become `<br />`.
 */
export const textToHtml = (text: string): string =>
  text
    .trim()
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />\n')}</p>`)
    .join('\n');

const RELATIVE_UPLOAD_SRC_RE = /(\bsrc\s*=\s*["'])\/uploads\//gi;
const ABSOLUTE_UPLOAD_SRC_RE = new RegExp(
  `(\\bsrc\\s*=\\s*["'])${FAQ_ASSET_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/uploads/`,
  'gi',
);

/**
 * Stored answer → rich editor content: plain-text answers become paragraphs and
 * relative screenshots point at the site that serves them, so they show while
 * editing.
 */
export const toEditorHtml = (answer: string): string => {
  const html = isHtml(answer) ? answer : textToHtml(answer || '');
  return html.replace(RELATIVE_UPLOAD_SRC_RE, `$1${FAQ_ASSET_BASE_URL}/uploads/`);
};

/** Rich editor content → stored answer (undoes `toEditorHtml`; empty → ''). */
export const fromEditorHtml = (html: string): string => {
  const restored = (html || '').replace(ABSOLUTE_UPLOAD_SRC_RE, '$1/uploads/');
  return isAnswerEmpty(restored) ? '' : restored;
};

/** No visible text and no image (an emptied editor still leaves `<br>`s). */
export const isAnswerEmpty = (html: string): boolean =>
  !/<img\b/i.test(html || '') && !convertHtmlToText(html || '').trim();
