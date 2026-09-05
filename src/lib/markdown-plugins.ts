/**
 * Sätteri hast plugins applied to every Markdown and MDX document
 * (wired up in astro.config.ts). They mirror the render hooks of the
 * classic Hugo setup this theme grew out of.
 */
import { defineHastPlugin } from 'satteri';
import type { Element, RootContent } from 'hast';

const isWhitespace = (node: RootContent) => node.type === 'text' && node.value.trim() === '';

/**
 * `![Caption](/image.png)` on its own line becomes
 * `<figure><img alt="Caption"><figcaption>Caption</figcaption></figure>`.
 * Images without alt text are left as they are.
 */
export const figureCaptions = defineHastPlugin({
  name: 'figure-captions',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      const alt = node.properties?.alt;
      if (typeof alt !== 'string' || alt.trim() === '') return;
      const parent = ctx.parent(node);
      if (!parent || parent.type !== 'element' || parent.tagName !== 'p') return;
      // Node identity is not stable across the visitor boundary, so count
      // meaningful children instead of comparing against `node`.
      if (parent.children.filter((child) => !isWhitespace(child)).length !== 1) return;

      const img: Element = {
        type: 'element',
        tagName: 'img',
        properties: { ...node.properties, loading: 'lazy', decoding: 'async' },
        children: [],
      };
      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['post-figure'] },
        children: [
          img,
          {
            type: 'element',
            tagName: 'figcaption',
            properties: { className: ['post-figcaption'] },
            children: [{ type: 'text', value: alt }],
          },
        ],
      };
      ctx.replaceNode(parent, figure);
    },
  },
});

/** External links open in a new tab with `rel="noopener noreferrer"`. */
export const externalLinks = defineHastPlugin({
  name: 'external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.href;
      if (typeof href !== 'string' || !/^(?:https?:)?\/\//i.test(href)) return;
      ctx.setProperty(node, 'target', '_blank');
      ctx.setProperty(node, 'rel', 'noopener noreferrer');
      ctx.setProperty(node, 'className', ['external-link']);
    },
  },
});

/**
 * On sub-path deployments (GitHub Pages project sites) rewrite root-relative
 * `href`/`src` values in Markdown, which can't use the `url()` helper.
 */
export function prefixInternalLinks(base: string) {
  return defineHastPlugin({
    name: 'prefix-internal-links-with-base',
    element: {
      filter: ['a', 'img', 'video', 'source'],
      visit(node, ctx) {
        for (const key of ['href', 'src', 'poster'] as const) {
          const value = node.properties?.[key];
          if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
            ctx.setProperty(node, key, `${base}${value}`);
          }
        }
      },
    },
  });
}
