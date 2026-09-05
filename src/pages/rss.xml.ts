import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteConfig } from '@/config/site';
import { getPosts } from '@/lib/content';
import { absoluteUrl } from '@/lib/seo';
import { url } from '@/lib/utils';

export async function GET(_context: APIContext) {
  const posts = siteConfig.features.posts ? await getPosts() : [];

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: absoluteUrl('/'),
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: post.data.externalLink ?? url(`/posts/${post.id}`),
      categories: post.data.tags,
      author: `${siteConfig.author.email} (${siteConfig.author.name})`,
      ...(siteConfig.posts.rssFullContent && post.rendered?.html
        ? { content: post.rendered.html }
        : {}),
    })),
    customData: '<language>en-us</language>',
  });
}
