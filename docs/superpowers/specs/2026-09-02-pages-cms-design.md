# Pages CMS Content Management Design

## Goal

Make all content on the personal academic website editable through the hosted
Pages CMS application while keeping GitHub as the source of truth and GitHub
Pages as the deployment target. The public website will not expose an edit
control. A visitor who knows `/admin` can reach the CMS entry page, but only a
GitHub account with repository write access can save changes.

The website will no longer include a blog. Blog content, templates, scripts,
documentation, assets, and styles will be removed.

## Current State

The website uses Eleventy and GitHub Pages. The home page is a plain HTML shell
that loads `pages/*.html` fragments with htmx. Several fragments contain data
inside JavaScript arrays and render it in the browser. Blog posts are Markdown
files rendered through Eleventy layouts.

This structure is difficult to model in a form-based CMS because content,
presentation markup, and browser-side rendering logic are mixed together.

## Selected Approach

Convert site content into structured JSON files under `_data/` and render it at
build time with Eleventy and Nunjucks templates. Define matching Pages CMS forms
in a root `.pages.yml` file. Continue using the existing GitHub Actions workflow
to build and deploy every content commit.

This is preferred over either exposing the existing HTML in a code editor or
building a flexible page-builder schema. Structured forms provide a useful CMS
experience, while a fixed schema protects the intentionally simple academic-site
layout.

## Content Model

Content will be divided by editing domain:

```text
_data/
├── site.json
├── about.json
├── publications.json
├── research.json
├── work.json
└── misc.json
```

- `site.json` stores the name, subtitle, metadata description, profile image,
  image alt text, and contact links.
- `about.json` stores the section label, introduction, research topics, and
  closing text.
- `publications.json` stores a top-level publication list. Each publication has
  its category, title, venue abbreviation and full name, year, optional note or
  status, authors, tags, links, and optional figure. Author objects explicitly
  record whether the author is the site owner and whether an equal-contribution
  marker applies.
- `research.json` stores separate research-experience and education lists.
- `work.json` stores work entries with organization details and bullet points.
- `misc.json` stores projects, awards, patents, and grouped skills or languages.

Lists will preserve their repository order unless the existing presentation
requires deterministic grouping. Publication categories remain International
and Domestic, and entries are displayed in descending year order within their
category.

The Pages CMS configuration will expose required fields, select inputs for
closed vocabularies such as publication category and tags, nested object lists,
image selectors, and optional URL fields. Reusable field components will be used
where they make the configuration clearer.

## Rendering Architecture

The browser-side htmx fragment loading and JavaScript data rendering will be
replaced with build-time output:

```text
index.njk
└── _includes/sections/
    ├── about.njk
    ├── publications.njk
    ├── research.njk
    ├── work.njk
    └── misc.njk
```

`index.njk` owns the document shell, header, analytics, section anchors, table
of contents, and small progressive-enhancement scripts. Section templates only
render their corresponding data domain. The generated page contains all visible
content before JavaScript runs, improving resilience and preserving indexable
HTML.

The current visual design, responsive behavior, section IDs, external-link
behavior, and content order will remain. The current publication count does not
need pagination, so all publications will be rendered without `Show more`.

## CMS Entry Point and Security

`admin/index.html` will be a small, unlinked page that redirects to the hosted
Pages CMS application and includes a fallback link if automatic navigation is
blocked. The public header and table of contents will not link to `/admin`.

The hidden route is only a convenience and is not a security boundary. Pages
CMS authenticates through GitHub, and repository write permission controls who
can save content. Content remains in Git, so edits are reviewable and reversible
through repository history.

## Media

Pages CMS media configuration will use the existing repository asset locations
for the profile and publication figures, or a single clearly defined media root
if the Pages CMS schema requires one. Stored public paths must match Eleventy's
passthrough-copy output. Existing non-blog images and their URLs will remain
valid.

Images contained in `posts/` are blog assets and will be removed with the blog.

## Blog Removal

Remove the following blog-only concerns:

- `blog/`
- `posts/`, including post images and metadata helpers
- blog layouts under `_includes/layouts/`
- blog-only heading/TOC helper code when no longer referenced
- `scripts/new-post.mjs`
- blog collection, Markdown rendering customizations, and blog filters from the
  Eleventy configuration
- `new-post` package script
- blog workflow instructions in `README.md`
- blog-only CSS selectors

Eleventy and its GitHub Actions deployment remain because they render the CMS
data into the static website.

## Data Flow

1. The owner visits `/admin` and continues to the hosted Pages CMS application.
2. Pages CMS authenticates the owner with GitHub and reads `.pages.yml`.
3. The owner edits a structured form and saves it.
4. Pages CMS commits the changed JSON or media file to the repository.
5. The existing GitHub Actions workflow runs the Eleventy build.
6. GitHub Pages publishes the generated `_site` artifact.

If the CMS configuration is unavailable, the deployed public website continues
to work. If a new content commit fails the build, the previously deployed Pages
artifact remains the public version while the failed workflow exposes the
problem.

## Validation and Verification

Implementation will be driven by checks that initially fail against the current
site and pass after the migration. Verification will cover:

- every JSON data file is syntactically valid and has the required top-level
  shape;
- Eleventy builds successfully from a clean command invocation;
- the generated home page contains representative existing text, links, images,
  section IDs, and CMS-managed metadata;
- the generated `/admin/index.html` exists and provides the Pages CMS route;
- the generated site contains no htmx dependency, blog URL, or blog content;
- removed source files and blog-specific CSS/configuration do not remain;
- desktop and mobile layouts are visually inspected from a local production
  build.

The implementation will preserve the currently published content during data
migration. Any content discrepancy found by the checks or visual review will be
corrected before completion is reported.

## Out of Scope

- A custom CMS deployment or custom authentication service
- Inline editing directly inside the public home page
- Multiple editorial roles or a pull-request approval workflow
- A general-purpose page builder
- Reintroducing blog functionality

