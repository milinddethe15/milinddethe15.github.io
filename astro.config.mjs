import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Markdown images live in public/, so Astro can't optimize them — at least
// make them lazy so post pages don't front-load every screenshot.
function lazyImages() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'element' && node.tagName === 'img') {
        node.properties.loading = 'lazy';
        node.properties.decoding = 'async';
      }
      (node.children ?? []).forEach(walk);
    };
    walk(tree);
  };
}

export default defineConfig({
  site: 'https://milinddethe15.tech',
  // 'ignore' so /resume works with or without the trailing slash in every
  // environment; built pages still emit directory URLs with slashes.
  trailingSlash: 'ignore',
  redirects: {
    '/resume': 'https://drive.google.com/file/d/1BbZS8mHuxcgBiR5ZlOw5_cPORrJ6X3wj/view?usp=sharing',
  },
  integrations: [sitemap()],
  build: {
    // The whole site's CSS is small; inlining it removes the only
    // render-blocking request.
    inlineStylesheets: 'always',
  },
  markdown: {
    rehypePlugins: [lazyImages],
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
