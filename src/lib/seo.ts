import { siteConfig } from '@/config/site';
import { url } from './utils';

export interface SeoProps {
  title?: string;
  description?: string;
  /** Path or absolute URL for the social image */
  image?: string;
  /** Override canonical URL (defaults to current page) */
  canonical?: string;
  type?: 'website' | 'article';
  publishedAt?: Date;
  updatedAt?: Date;
  noindex?: boolean;
}

/** The deployed origin: astro.config `site` (env-overridable) with a config fallback. */
const SITE = import.meta.env.SITE ?? siteConfig.url;

/** Absolute URL for an internal path, respecting both `site` and `base`. */
export function absoluteUrl(path: string): string {
  return new URL(url(path), SITE).toString();
}

/** Compose a full page title: "Page · Site" (homepage keeps its own title). */
export function pageTitle(title?: string): string {
  if (!title) return siteConfig.title;
  return `${title} · ${siteConfig.name}`;
}

type JsonLd = Record<string, unknown>;

export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.title,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function personSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.author.name,
    email: `mailto:${siteConfig.author.email}`,
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.author.avatar),
    sameAs: siteConfig.social.map((s) => s.href).filter((href) => !href.startsWith('mailto:')),
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedAt: Date;
  updatedAt?: Date;
  tags?: string[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    ...(opts.image ? { image: absoluteUrl(opts.image) } : {}),
    datePublished: opts.publishedAt.toISOString(),
    ...(opts.updatedAt ? { dateModified: opts.updatedAt.toISOString() } : {}),
    ...(opts.tags?.length ? { keywords: opts.tags.join(', ') } : {}),
    author: {
      '@type': 'Person',
      name: siteConfig.author.name,
      url: siteConfig.url,
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
