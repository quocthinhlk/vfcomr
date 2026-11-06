import type {ResourceListItem} from '../services/resource.service';

/** Ids of the resources under `id` (any depth), from parent_id links. */
export function descendantIds(items: Pick<ResourceListItem, 'id' | 'parent_id'>[], id: number): Set<number> {
  const byParent = new Map<number, number[]>();
  items.forEach(item => {
    if (item.parent_id != null) {
      byParent.set(item.parent_id, [...(byParent.get(item.parent_id) ?? []), item.id]);
    }
  });
  const out = new Set<number>();
  const stack = [...(byParent.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop() as number;
    if (!out.has(next)) {
      out.add(next);
      stack.push(...(byParent.get(next) ?? []));
    }
  }
  return out;
}

/**
 * Parent choices: every resource except the one being edited and the ones
 * under it (picking one of those made a loop: the folder vanished from the
 * tree). Before, only the resource itself was left out.
 */
export function parentChoices(
  items: Pick<ResourceListItem, 'id' | 'parent_id' | 'name'>[],
  selfId?: number,
): {label: string; value: number}[] {
  const blocked = selfId != null ? descendantIds(items, selfId) : new Set<number>();
  return items
    .filter(item => item.id !== selfId && !blocked.has(item.id))
    .map(item => ({label: item.name?.trim() || `#${item.id}`, value: item.id}));
}

/** HTML from the old web shown as text ("&amp;", "&#39;", "<br>"). */
export function stripHtml(value: string | null | undefined, lineBreak = ' '): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/<br\s*\/?>/gi, lineBreak)
    .replace(/<\/p>/gi, lineBreak)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;|&lsquo;|&#39;|&#x27;|&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(lineBreak === '\n' ? /[ \t]+/g : /\s+/g, ' ')
    .trim();
}

/** Part number / sort order: a positive whole number, else the fallback. */
export function positiveInt(text: string, fallback = 1): number {
  const n = Number(String(text).trim());
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
