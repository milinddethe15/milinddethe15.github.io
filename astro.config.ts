import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import tailwindcss from '@tailwindcss/vite';
import { siteConfig, RESUME_URL } from './src/config/site';
import { figureCaptions, externalLinks, prefixInternalLinks } from './src/lib/markdown-plugins';

// SITE_URL / BASE_PATH allow CI to override the deploy target without
// editing source. Locally they fall back to site.ts.
const site = process.env.SITE_URL ?? siteConfig.url;
const base = process.env.BASE_PATH ?? '/';
const normalizedBase = base.replace(/\/$/, '');

const sansStack =
  "'Space Grotesk Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const monoStack = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export default defineConfig({
  site,
  base,
  // Cloudflare Pages serves Astro's directory output at '/posts/', and the
  // previous site used that shape too — so slashes are the canonical form.
  trailingSlash: 'always',
  // Cloudflare Pages handles this server-side too (public/_redirects); the
  // generated page keeps /resume working on any other host.
  redirects: {
    '/resume': RESUME_URL,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  markdown: {
    // Sätteri hast plugins run for both .md and .mdx documents.
    processor: satteri({
      hastPlugins: [
        figureCaptions,
        externalLinks,
        // Components handle the base prefix via the url() helper; markdown
        // content can't, so on subpath deploys rewrite root-relative links.
        ...(normalizedBase ? [prefixInternalLinks(normalizedBase)] : []),
      ],
    }),
  },
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      plugins: [pluginLineNumbers()],
      defaultProps: {
        showLineNumbers: false,
      },
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) => (theme.type === 'dark' ? '.dark' : ':root:not(.dark)'),
      styleOverrides: {
        borderRadius: '6px',
        borderColor: 'var(--border)',
        codeFontFamily: monoStack,
        uiFontFamily: sansStack,
        codeFontSize: '0.8125rem',
        codeLineHeight: '1.7',
        codeBackground: 'var(--code-bg)',
        frames: {
          shadowColor: 'transparent',
          editorActiveTabIndicatorTopColor: 'var(--foreground)',
          editorTabBarBackground: 'var(--surface)',
          editorActiveTabBackground: 'var(--code-bg)',
          terminalTitlebarBackground: 'var(--surface)',
          terminalBackground: 'var(--code-bg)',
        },
      },
    }),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
