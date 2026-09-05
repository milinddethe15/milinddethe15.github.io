# milinddethe15.tech

Personal site, built with [Astro](https://astro.build) on the **Astro Mono**
theme — monochrome, typography-first, dark/light, near-zero JS. Styling is
Tailwind v4, code blocks are Expressive Code, and fonts are self-hosted through
Fontsource.

## Local setup

```sh
npm install
npm run dev       # dev server at localhost:4321
npm run build     # static build into dist/
npm run preview   # serve the production build
npm run check     # astro check (types + templates)
npm run lint      # eslint
npm run format    # prettier
```

Node 22.12 or newer.

## Configuration

Everything site-level — name, bio, social links, navigation, analytics, feature
toggles — lives in [`src/config/site.ts`](src/config/site.ts). Experience and
open-source highlights shown on the homepage live in
[`src/data/resume.ts`](src/data/resume.ts).

## Writing a post

Add a markdown file under `src/content/posts/`. The file path becomes the URL:
`src/content/posts/my-post.md` → `/posts/my-post`.

```markdown
---
title: 'My Post'
date: 2026-08-09
description: 'One-line summary for SEO and the RSS feed.'
tags: ['some-tag']
series: 'Optional series name' # groups posts with a "See also in" block
image: /images/cover.png # optional, also used for Open Graph
---

Content here.
```

`.mdx` works too, and posts can use the `<Callout>` and `<Tabs>` components.

## Adding a project

Add a markdown file under `src/content/projects/`. Frontmatter only is enough —
a project gets its own `/projects/<slug>` page only when the file has a body.

```markdown
---
title: My Project
description: What it does, in a sentence.
image: /images/my-project.png # .webm/.mp4 render as an autoplaying video
skills: ['Go', 'Kubernetes']
sourceCode: https://github.com/milinddethe15/my-project
order: 1 # lower comes first
featured: true # show it on the homepage
---
```

## Deploy

Cloudflare Pages builds and deploys `main` automatically (`npm run build`,
output `dist/`). `public/_headers` sets the security and caching headers, and
`public/_redirects` handles `/resume` plus the `/index.xml` → `/rss.xml` feed
redirect left over from the Hugo era.
