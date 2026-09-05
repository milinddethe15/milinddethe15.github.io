/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Prefix an internal absolute path with the configured `base`.
 * With the default base ('/') this is a no-op; on subpath deployments
 * (e.g. GitHub Pages project sites) it becomes '/repo-name/path'.
 * Absolute URLs are returned untouched.
 */
export function url(path: string): string {
  if (isExternal(path)) return path;
  return withTrailingSlash(`${BASE}${path}`);
}

/**
 * Append the trailing slash Astro's directory output is served under, so no
 * internal link pays for a 308. Files (anything whose last segment has an
 * extension, e.g. /rss.xml) and query/hash suffixes are left untouched.
 */
function withTrailingSlash(href: string): string {
  const mark = href.search(/[?#]/);
  const pathname = mark === -1 ? href : href.slice(0, mark);
  const suffix = mark === -1 ? '' : href.slice(mark);
  if (pathname === '' || pathname.endsWith('/')) return href;
  if (pathname.slice(pathname.lastIndexOf('/') + 1).includes('.')) return href;
  return `${pathname}/${suffix}`;
}

/** True for absolute URLs (http, https, mailto, protocol-relative). */
export function isExternal(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

/** URL-safe slug from arbitrary text (used for tags and series). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/** "January 2, 2026" */
export function formatDate(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** ISO date string (for <time datetime>) */
export function isoDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

/** Estimated reading time in whole minutes from raw markdown. */
export function readingTimeMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 215));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render a tiny subset of inline Markdown — links, `code`, **bold**, *em* —
 * to HTML. Used for short config strings such as `author.info`.
 */
export function inlineMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const external = isExternal(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${external ? href : url(href)}"${attrs}>${label}</a>`;
  });
  return html;
}
