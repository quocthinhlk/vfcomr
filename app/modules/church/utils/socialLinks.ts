/** Profile URL of a bare handle, per platform. */
const SOCIAL_BASE = {
  facebook: 'https://facebook.com/',
  instagram: 'https://instagram.com/',
  twitter: 'https://x.com/',
  youtube: 'https://youtube.com/@',
  tiktok: 'https://tiktok.com/@',
};

export type SocialPlatform = keyof typeof SOCIAL_BASE;

/**
 * Social links are often stored as a handle ("newlifechurch", "@newlife"):
 * those open the platform's profile page (as "https://newlifechurch" they
 * opened a host that doesn't exist). A URL or a domain is opened as typed.
 */
export function socialUrl(platform: SocialPlatform, value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (/[./]/.test(raw)) {
    return `https://${raw}`;
  }
  return `${SOCIAL_BASE[platform]}${encodeURIComponent(raw.replace(/^@+/, ''))}`;
}
