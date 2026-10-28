/**
 * Repairs text the API stored as UTF-8 bytes read as Latin-1 (mojibake), e.g.
 * "PortuguÃªs" → "Português". Text that isn't such a pair-up is returned as is.
 */
export function fixMojibake(text: string): string {
  if (!text || !/[ÃÂÅÆÐÑØÙÚÛÜÝÞß][\u0080-¿]/.test(text)) {
    return text;
  }
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0xff) {
      return text; // Real Unicode beyond Latin-1: not mojibake.
    }
    bytes.push(code);
  }
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const need = b < 0x80 ? 0 : b >= 0xc2 && b < 0xe0 ? 1 : b >= 0xe0 && b < 0xf0 ? 2 : b >= 0xf0 && b < 0xf5 ? 3 : -1;
    if (need < 0 || i + need >= bytes.length) {
      return text;
    }
    let cp = need === 0 ? b : b & (0xff >> (need + 2));
    for (let k = 1; k <= need; k++) {
      const c = bytes[i + k];
      if (c === undefined || (c & 0xc0) !== 0x80) {
        return text;
      }
      cp = (cp << 6) | (c & 0x3f);
    }
    out += String.fromCodePoint(cp);
    i += need + 1;
  }
  return out;
}

/** "--- Sarawak" (a tree level shown with dashes) → "Sarawak". */
export function stripTreePrefix(text: string): string {
  return text.replace(/^[\s\-–—]+/, '').trim() || text;
}
