# milinddethe15.tech

Personal site, built with [Astro](https://astro.build). Dark, minimal, and fast:
all CSS is inlined, fonts are self-hosted, icons are inline SVG, and the site
ships **zero JavaScript** (the only third-party request is the Cloudflare
Web Analytics beacon).

## Local setup

```sh
npm install
npm run dev       # dev server at localhost:4321
npm run build     # static build into dist/
npm run preview   # serve the production build
```

## Writing a post

Add a markdown file under `src/content/posts/`. The file path becomes the URL:
`src/content/posts/my-post.md` → `/posts/my-post/`.

```markdown
---
title: "My Post"
date: 2026-08-09
description: "One-line summary for SEO and the RSS feed."
tags: ["some-tag"]
---

Content here.
```

Projects and experience live in `src/data/site.ts`.

## Deploy

Pushes to `main` build and deploy to GitHub Pages via
`.github/workflows/deploy.yml`.
