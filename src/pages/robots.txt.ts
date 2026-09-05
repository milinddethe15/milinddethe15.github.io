import type { APIContext } from 'astro';
import { absoluteUrl } from '@/lib/seo';

export function GET(_context: APIContext) {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
