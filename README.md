# junseongpyo.github.io

Personal academic website of Junseong Pyo.

Built with plain HTML/CSS, [htmx](https://htmx.org/) for partial loading, and
[Eleventy](https://www.11ty.dev/) for blog generation.

## Structure

```
index.html        # Layout, styles, TOC, publications data
styles.css        # Shared site styles
pages/            # Resume content loaded by htmx
blog/index.njk    # Blog listing page
posts/            # Markdown blog posts
_includes/        # Eleventy layouts
figures/          # Paper figures
```

## Development

```bash
npm install
npm run dev
```

Local preview runs at the URL printed by Eleventy, usually
`http://localhost:8080/` or the next available port.

`npm run dev` starts Eleventy's local server and watcher together. When you save
a Markdown file in `posts/`, Eleventy rebuilds `_site/` automatically and the
browser preview updates.

## Writing

Create a new Markdown draft with the local CLI:

```bash
npm run new-post
```

It asks for a title, group, slug, description, and tags, then creates a file in
`posts/`. The group is a single value and becomes part of the URL:

```txt
/blog/<group>/<slug>/
```

You can also create a Markdown file manually in `posts/`. Use a lowercase slug
for the filename and URL:

```md
---
layout: layouts/post.njk
title: My New Post
description: Short summary shown on the blog index.
date: 2026-04-26
group: mldl2026
tags:
  - notes
---

Write the post body here in Markdown.
```

Recommended flow:

```bash
# 1. Write a post
npm run new-post
$EDITOR posts/my-new-post.md

# 2. Preview locally with the watcher
npm run dev

# 3. Build before publishing
npm run build
```

Commit and push after the build succeeds. GitHub Actions will build `_site/`
and deploy it to GitHub Pages.
