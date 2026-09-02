# Pages CMS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public-site content domain editable through hosted Pages CMS, render that content into the existing academic homepage at build time, and remove the blog completely.

**Architecture:** Store editable content in six focused JSON files under `_data/`, describe those files with structured forms in `.pages.yml`, and render them through Nunjucks section templates into one static homepage. Keep GitHub Actions and Eleventy, remove htmx and browser-side content generation, and provide an unlinked `/admin` redirect to the hosted Pages CMS repository route.

**Tech Stack:** Eleventy 3, Nunjucks, Pages CMS hosted app, JSON, YAML, Node.js built-in test runner, GitHub Actions, GitHub Pages

---

## File Map

**Create**

- `_data/site.json` — identity, metadata, profile image, and contact links.
- `_data/about.json` — About heading, introduction, research topics, and closing.
- `_data/publications.json` — publication section labels and publication entries.
- `_data/research.json` — research-experience and education entries.
- `_data/work.json` — work-experience entries.
- `_data/misc.json` — projects, awards, patents, and grouped skills.
- `_includes/sections/about.njk` — render About data only.
- `_includes/sections/publications.njk` — group and render publication data.
- `_includes/sections/research.njk` — render research and education data.
- `_includes/sections/work.njk` — render work data.
- `_includes/sections/misc.njk` — render projects, awards, patents, and skills.
- `index.njk` — render the full homepage document and include each section.
- `.pages.yml` — define Pages CMS media sources and structured editors.
- `admin/index.html` — redirect to hosted Pages CMS with a fallback link.
- `tests/site-migration.test.mjs` — validate data, rendered output, CMS config, admin entry, and blog removal.

**Modify**

- `.eleventy.js` — retain only static-homepage passthrough, filters, and output configuration.
- `package.json` and `package-lock.json` — add the test script and YAML parser; remove `new-post`.
- `README.md` — document Pages CMS editing and local build/test commands; remove blog instructions.
- `styles.css` — remove blog-only rules while preserving homepage and responsive rules.

**Delete**

- `index.html`
- `pages/about.html`
- `pages/publications.html`
- `pages/research.html`
- `pages/work.html`
- `pages/misc.html`
- `blog/index.njk`
- `_includes/layouts/blog-base.njk`
- `_includes/layouts/post.njk`
- `_includes/lib/toc.js`
- `scripts/new-post.mjs`
- `posts/posts.11tydata.js`
- `posts/welcome.md`
- `posts/lecture2.md`
- `posts/image.png`
- `posts/image-1.png`
- `posts/image-2.png`
- `posts/image-3.png`
- `posts/image-4.png`

## Canonical Data Shapes

Use these shapes consistently in JSON, Nunjucks, Pages CMS fields, and tests.

```js
// site.json
{
  name, subtitle, description,
  profile: { src, alt },
  contacts: [{ label, url }]
}

// about.json
{
  heading, introductionHtml,
  topics: [{ title, body }],
  closing
}

// publications.json
{
  heading, internationalHeading, domesticHeading,
  items: [{
    category, title, venueAbbreviation, venueName, year,
    track, note, status, showEqualContributionNote,
    authors: [{ name, owner, equalContribution }],
    tags: [string],
    links: [{ label, url }],
    figure
  }]
}

// research.json
{
  experienceHeading,
  experiences: [{ organization, organizationUrl, period, role, location, highlights: [string] }],
  educationHeading,
  education: [{ institution, institutionUrl, period, degree, location, details: [string] }]
}

// work.json
{
  heading,
  entries: [{ organization, organizationUrl, team, period, role, location, highlights: [string] }]
}

// misc.json
{
  projectsHeading,
  projects: [{ title, period, subtitle, highlights: [string], links: [{ label, url }] }],
  awardsHeading,
  awards: [{ title, subtitle, organizer, year }],
  patentsHeading,
  patents: [{ title, applicationNumber, filed, year }],
  skillsHeading,
  skillGroups: [{ label, values: [string] }]
}
```

Optional string values are stored as empty strings rather than omitted keys so
Pages CMS round-trips each file predictably. Copy all existing visible content
exactly from `index.html` and `pages/*.html`; only convert HTML entities such as
`&middot;` and `&mdash;` into their Unicode characters when the template no longer
needs markup.

### Task 1: Add the Content Contract and Migrate Existing Content

**Files:**

- Create: `tests/site-migration.test.mjs`
- Create: `_data/site.json`
- Create: `_data/about.json`
- Create: `_data/publications.json`
- Create: `_data/research.json`
- Create: `_data/work.json`
- Create: `_data/misc.json`
- Modify: `package.json`

- [ ] **Step 1: Write a failing data-contract test**

Create `tests/site-migration.test.mjs` with Node's built-in test runner. Include
the helpers and assertions below, expanding each list assertion to check the
required fields from the canonical shapes above.

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fromRoot = (path) => `${root}/${path}`;
const readJson = (path) => JSON.parse(readFileSync(fromRoot(path), "utf8"));

const requiredStrings = (item, keys, context) => {
  for (const key of keys) {
    assert.equal(typeof item[key], "string", `${context}.${key}`);
  }
};

test("CMS data files contain the complete current site", () => {
  const paths = ["site", "about", "publications", "research", "work", "misc"];
  for (const name of paths) {
    assert.equal(existsSync(fromRoot(`_data/${name}.json`)), true, name);
  }

  const site = readJson("_data/site.json");
  requiredStrings(site, ["name", "subtitle", "description"], "site");
  assert.equal(site.name, "Junseong Pyo");
  assert.equal(site.contacts.length, 4);

  const about = readJson("_data/about.json");
  assert.equal(about.topics.length, 2);

  const publications = readJson("_data/publications.json");
  assert.equal(publications.items.length, 4);
  assert.ok(publications.items.some(({ title }) => title.startsWith("SpokenUS:")));
  for (const [index, publication] of publications.items.entries()) {
    requiredStrings(
      publication,
      ["category", "title", "venueAbbreviation", "venueName"],
      `publications.items[${index}]`,
    );
    assert.equal(typeof publication.year, "number");
    assert.equal(typeof publication.showEqualContributionNote, "boolean");
    assert.ok(publication.authors.length > 0);
    assert.equal(publication.authors.filter(({ owner }) => owner).length, 1);
  }

  const research = readJson("_data/research.json");
  assert.equal(research.experiences.length, 2);
  assert.equal(research.education.length, 2);

  const work = readJson("_data/work.json");
  assert.equal(work.entries.length, 2);

  const misc = readJson("_data/misc.json");
  assert.equal(misc.projects.length, 2);
  assert.equal(misc.awards.length, 6);
  assert.equal(misc.patents.length, 1);
  assert.equal(misc.skillGroups.length, 2);
});
```

- [ ] **Step 2: Run the test and verify the intended failure**

Run: `node --test tests/site-migration.test.mjs`

Expected: FAIL because `_data/site.json` does not exist.

- [ ] **Step 3: Create the six JSON files from the current source**

Populate every field in the canonical shapes. Preserve these presentation
semantics explicitly in data:

- `owner: true` for Junseong Pyo and false for every other author.
- `equalContribution: true` only where the current author string ends in `*`.
- `showEqualContributionNote: true` only for SpokenUS, matching the current
  publication-level `coFirst` flag. SpeakerSleuth keeps its starred author but
  does not gain a note that is not currently displayed.
- `category` must be `international` or `domestic`.
- `tags` must use `Smart Home`, `Speech`, `Benchmark`, `Model`, `Dataset`, or
  `Education`.
- Convert each publication's primary paper and GitHub values into `links` with
  the currently displayed labels.
- Preserve the commented-out B. F. Sword figure as an empty `figure`; do not
  expose unpublished presentation content merely because the image file exists.
- Preserve all current external URLs and visible dates verbatim.

- [ ] **Step 4: Add the repository test command**

Add this script without removing `build` or `dev` yet:

```json
"test": "node --test"
```

- [ ] **Step 5: Run the data test and verify it passes**

Run: `npm test`

Expected: PASS with one test and no warnings.

- [ ] **Step 6: Commit the data migration**

```bash
git add _data tests/site-migration.test.mjs package.json
git commit -m "Add structured site content data"
```

### Task 2: Render the Homepage from Data at Build Time

**Files:**

- Create: `index.njk`
- Create: `_includes/sections/about.njk`
- Create: `_includes/sections/publications.njk`
- Create: `_includes/sections/research.njk`
- Create: `_includes/sections/work.njk`
- Create: `_includes/sections/misc.njk`
- Modify: `.eleventy.js`
- Modify: `tests/site-migration.test.mjs`
- Delete: `index.html`

- [ ] **Step 1: Add a failing rendered-homepage test**

Add imports for `execFileSync` and a test that performs a fresh build before
reading output:

```js
import { execFileSync } from "node:child_process";

test("Eleventy pre-renders all CMS-managed homepage content", () => {
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "pipe" });
  const html = readFileSync(fromRoot("_site/index.html"), "utf8");

  for (const id of ["about", "publications", "research", "work", "misc"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  for (const text of [
    "Ph.D. Student in Graduate School of Data Science",
    "SpokenUS: A Spoken User Simulator",
    "LG Electronics",
    "DIVE 2026",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(html, /htmx(?:\.min)?\.js|hx-get=|pages\/about\.html/);
  assert.match(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']Junseong Pyo/,
  );
  assert.match(html, /href=["']https:\/\/arxiv\.org\/abs\/2603\.16783["']/);
  assert.match(html, /src=["']\/figures\/spokenus\.png["']/);
  assert.match(html, /<strong>Junseong Pyo\*<\/strong>/);
  assert.ok(html.indexOf("SpokenUS:") < html.indexOf("SimuHome:"));
});
```

- [ ] **Step 2: Run the test and verify the intended failure**

Run: `node --test tests/site-migration.test.mjs`

Expected: FAIL because the current `index.html` only contains htmx placeholders,
not publication or experience text.

- [ ] **Step 3: Create focused section templates**

Use the existing class names so the current stylesheet continues to apply.
Template rules:

- `about.njk`: render `about.introductionHtml | safe`; escape ordinary topic
  titles and bodies normally.
- `publications.njk`: filter items by category, sort each category by descending
  year with an Eleventy `sortByYearDesc` filter, render tags with
  `tagColorClass`, bold authors where `owner` is true, append `*` where
  `equalContribution` is true, and show the co-first note only when the
  publication-level `showEqualContributionNote` is true. Render every link from
  `links` and an optional figure.
- `research.njk`: render experience and education lists with optional links and
  omit empty detail/highlight lists.
- `work.njk`: join organization and team visually while keeping them separate in
  data; render optional organization links and bullet lists.
- `misc.njk`: render each subsection in file order; join award subtitle and
  organizer visually; render project link lists with the existing separators.

Do not generate markup with JavaScript. Apply Nunjucks `| escape` to every
ordinary CMS string and URL, retaining `| safe` only for the intentionally rich
`about.introductionHtml` value.

- [ ] **Step 4: Replace the document shell**

Delete `index.html` and create `index.njk`. Copy the current document structure,
analytics snippet, profile layout, table of contents, scroll spy, and external
link enhancement. Replace literal header values with `site.*`, and replace each
htmx placeholder with the corresponding section include:

```njk
<section id="about">{% include "sections/about.njk" %}</section>
<section id="publications">{% include "sections/publications.njk" %}</section>
<section id="research">{% include "sections/research.njk" %}</section>
<section id="work">{% include "sections/work.njk" %}</section>
<section id="misc">{% include "sections/misc.njk" %}</section>
```

Keep the table-of-contents interface labels static as `About`, `Publications`,
`Research Experience`, `Work Experience`, and `Misc`; content headings such as
`Research Interests` are not navigation labels. Do not add a Blog or Admin
navigation item.

- [ ] **Step 5: Add only the filters needed by the homepage**

Retain the existing `tagColorClass` behavior and add:

```js
eleventyConfig.addFilter("sortByYearDesc", (items = []) =>
  [...items].sort((a, b) => b.year - a.year),
);
```

Keep the existing blog configuration temporarily so this task isolates homepage
rendering from blog removal.

- [ ] **Step 6: Run tests and inspect generated markup**

Run: `npm test`

Expected: PASS for the data and pre-rendered homepage tests.

Run: `rg 'htmx|hx-get|pages/about\.html' _site/index.html`

Expected: no matches and exit status 1.

- [ ] **Step 7: Commit the static homepage**

```bash
git add index.html index.njk _includes/sections .eleventy.js tests/site-migration.test.mjs
git commit -m "Render homepage from structured data"
```

### Task 3: Configure Structured Pages CMS Editors

**Files:**

- Create: `.pages.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tests/site-migration.test.mjs`

- [ ] **Step 1: Install a YAML parser used by configuration tests**

Run: `npm install --save-dev yaml`

Expected: `yaml` appears in `devDependencies` and the lockfile updates.

- [ ] **Step 2: Add a failing Pages CMS configuration test**

```js
import { parse as parseYaml } from "yaml";

const fieldAt = (fields, path) => {
  let currentFields = fields;
  let current;
  for (const segment of path.split(".")) {
    current = currentFields.find(({ name }) => name === segment);
    assert.ok(current, `missing field ${path}`);
    currentFields = current.fields || [];
  }
  return current;
};

test("Pages CMS exposes every editable data domain", () => {
  const config = parseYaml(readFileSync(fromRoot(".pages.yml"), "utf8"));
  assert.deepEqual(
    config.media.map(({ name, input, output }) => ({ name, input, output })),
    [
      { name: "profile", input: ".", output: "/" },
      { name: "figures", input: "figures", output: "/figures" },
    ],
  );

  assert.deepEqual(
    config.content.map(({ name, type, path, format, operations }) => ({
      name,
      type,
      path,
      format,
      operations,
    })),
    ["site", "about", "publications", "research", "work", "misc"].map(
      (name) => ({
        name,
        type: "file",
        path: `_data/${name}.json`,
        format: "json",
        operations: { create: false, delete: false },
      }),
    ),
  );

  assert.equal(config.settings.content.merge, false);

  const expectedFields = {
    site: {
      top: ["name", "subtitle", "description", "profile", "contacts"],
      nested: { profile: ["src", "alt"], contacts: ["label", "url"] },
    },
    about: {
      top: ["heading", "introductionHtml", "topics", "closing"],
      nested: { topics: ["title", "body"] },
    },
    publications: {
      top: ["heading", "internationalHeading", "domesticHeading", "items"],
      nested: {
        items: [
          "category", "title", "venueAbbreviation", "venueName", "year",
          "track", "note", "status", "showEqualContributionNote", "authors",
          "tags", "links", "figure",
        ],
        "items.authors": ["name", "owner", "equalContribution"],
        "items.links": ["label", "url"],
      },
    },
    research: {
      top: ["experienceHeading", "experiences", "educationHeading", "education"],
      nested: {
        experiences: ["organization", "organizationUrl", "period", "role", "location", "highlights"],
        education: ["institution", "institutionUrl", "period", "degree", "location", "details"],
      },
    },
    work: {
      top: ["heading", "entries"],
      nested: {
        entries: ["organization", "organizationUrl", "team", "period", "role", "location", "highlights"],
      },
    },
    misc: {
      top: ["projectsHeading", "projects", "awardsHeading", "awards", "patentsHeading", "patents", "skillsHeading", "skillGroups"],
      nested: {
        projects: ["title", "period", "subtitle", "highlights", "links"],
        "projects.links": ["label", "url"],
        awards: ["title", "subtitle", "organizer", "year"],
        patents: ["title", "applicationNumber", "filed", "year"],
        skillGroups: ["label", "values"],
      },
    },
  };

  for (const entry of config.content) {
    const expected = expectedFields[entry.name];
    assert.deepEqual(entry.fields.map(({ name }) => name), expected.top);
    for (const [path, names] of Object.entries(expected.nested)) {
      assert.deepEqual(fieldAt(entry.fields, path).fields.map(({ name }) => name), names);
    }
  }

  // `!` means required and `[]` means repeated. This table covers every field,
  // including nested values, so a name-correct but shape-incorrect CMS schema
  // cannot pass.
  const expectedSchema = {
    site: {
      name: "string!", subtitle: "text!", description: "text!",
      profile: "object!", "profile.src": "image!", "profile.alt": "string!",
      contacts: "object![]", "contacts.label": "string!", "contacts.url": "string!",
    },
    about: {
      heading: "string!", introductionHtml: "rich-text!", topics: "object![]",
      "topics.title": "string!", "topics.body": "text!", closing: "text!",
    },
    publications: {
      heading: "string!", internationalHeading: "string!", domesticHeading: "string!",
      items: "object![]", "items.category": "select!", "items.title": "text!",
      "items.venueAbbreviation": "string!", "items.venueName": "text!",
      "items.year": "number!", "items.track": "string", "items.note": "string",
      "items.status": "string", "items.showEqualContributionNote": "boolean!",
      "items.authors": "object![]", "items.authors.name": "string!",
      "items.authors.owner": "boolean!", "items.authors.equalContribution": "boolean!",
      "items.tags": "select!", "items.links": "object[]",
      "items.links.label": "string!", "items.links.url": "string!",
      "items.figure": "image",
    },
    research: {
      experienceHeading: "string!", experiences: "object![]",
      "experiences.organization": "string!", "experiences.organizationUrl": "string",
      "experiences.period": "string!", "experiences.role": "string!",
      "experiences.location": "string!", "experiences.highlights": "string[]",
      educationHeading: "string!", education: "object![]",
      "education.institution": "string!", "education.institutionUrl": "string",
      "education.period": "string!", "education.degree": "text!",
      "education.location": "string!", "education.details": "string[]",
    },
    work: {
      heading: "string!", entries: "object![]", "entries.organization": "string!",
      "entries.organizationUrl": "string", "entries.team": "string",
      "entries.period": "string!", "entries.role": "string!",
      "entries.location": "string!", "entries.highlights": "string[]",
    },
    misc: {
      projectsHeading: "string!", projects: "object![]", "projects.title": "string!",
      "projects.period": "string!", "projects.subtitle": "text!",
      "projects.highlights": "string[]", "projects.links": "object[]",
      "projects.links.label": "string!", "projects.links.url": "string!",
      awardsHeading: "string!", awards: "object![]", "awards.title": "string!",
      "awards.subtitle": "text!", "awards.organizer": "string!", "awards.year": "number!",
      patentsHeading: "string!", patents: "object![]", "patents.title": "string!",
      "patents.applicationNumber": "string!", "patents.filed": "string!",
      "patents.year": "number!", skillsHeading: "string!", skillGroups: "object![]",
      "skillGroups.label": "string!", "skillGroups.values": "string![]",
    },
  };

  for (const entry of config.content) {
    for (const [path, descriptor] of Object.entries(expectedSchema[entry.name])) {
      const repeated = descriptor.endsWith("[]");
      const withoutList = repeated ? descriptor.slice(0, -2) : descriptor;
      const required = withoutList.endsWith("!");
      const type = required ? withoutList.slice(0, -1) : withoutList;
      const field = fieldAt(entry.fields, path);

      assert.equal(field.type, type, `${entry.name}.${path}.type`);
      if (required) assert.equal(field.required, true, `${entry.name}.${path}.required`);
      if (repeated) assert.ok(field.list, `${entry.name}.${path}.list`);
      if (!repeated) assert.equal(field.list, undefined, `${entry.name}.${path}.list`);
    }
  }

  const about = config.content.find(({ name }) => name === "about");
  assert.deepEqual(fieldAt(about.fields, "introductionHtml").options, {
    format: "html",
    media: false,
  });

  const publications = config.content.find(({ name }) => name === "publications");
  assert.deepEqual(fieldAt(publications.fields, "items.category").options.values, [
    "international",
    "domestic",
  ]);
  assert.deepEqual(fieldAt(publications.fields, "items.tags").options.values, [
    "Smart Home", "Speech", "Benchmark", "Model", "Dataset", "Education",
  ]);
  assert.equal(fieldAt(publications.fields, "items.tags").options.multiple, true);
  assert.equal(fieldAt(publications.fields, "items.figure").options.media, "figures");
  assert.equal(fieldAt(publications.fields, "items.authors").list.collapsible.summary, "{name}");

  const site = config.content.find(({ name }) => name === "site");
  assert.equal(fieldAt(site.fields, "profile.src").options.media, "profile");
});
```

- [ ] **Step 3: Run the test and verify the intended failure**

Run: `npm test`

Expected: FAIL because `.pages.yml` does not exist.

- [ ] **Step 4: Create `.pages.yml` with two media sources**

Use:

```yaml
media:
  - name: profile
    label: Profile image
    input: .
    output: /
    categories: [image]
    extensions: [png, jpg, jpeg, webp, avif]
  - name: figures
    label: Publication figures
    input: figures
    output: /figures
    categories: [image]
    extensions: [png, jpg, jpeg, webp, avif, svg]
```

Then add six `type: file`, `format: json` content entries whose field trees match
the canonical data shapes exactly. Apply `type`, `required`, and `list` exactly
as specified by the `expectedSchema` table in Step 2. Use these editor controls:

| Data field | Pages CMS field |
| --- | --- |
| Required short strings | `type: string`, `required: true` |
| Optional or multiline plain text | `type: text` |
| `about.introductionHtml` | `type: rich-text`, `options.format: html`, `options.media: false` |
| Years | `type: number`, `required: true` |
| Nested records | `type: object` with explicit child `fields` |
| Ordered repeated records | `type: object`, `list.collapsible.summary` using title/name tokens |
| String lists | `type: string`, `list: true` |
| Publication category | `type: select` with `international` and `domestic` |
| Publication tags | `type: select`, `options.multiple: true`, with the six approved tags |
| Boolean author markers | `type: boolean` |
| `site.profile.src` | `type: image`, `options.media: profile` |
| Publication `figure` | `type: image`, `options.media: figures` |

Set `settings.content.merge: false` so the CMS schema remains the authoritative
shape. Every fixed file entry must explicitly include the following because
Pages CMS otherwise allows fixed files to be created or deleted:

```yaml
operations:
  create: false
  delete: false
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`

Expected: PASS for data, homepage, and Pages CMS configuration.

- [ ] **Step 6: Commit the CMS configuration**

```bash
git add .pages.yml package.json package-lock.json tests/site-migration.test.mjs
git commit -m "Configure Pages CMS content editors"
```

### Task 4: Add the Hidden Admin Entry Point

**Files:**

- Create: `admin/index.html`
- Modify: `.eleventy.js`
- Modify: `tests/site-migration.test.mjs`

- [ ] **Step 1: Add a failing admin-output test**

```js
test("the unlinked admin route opens the hosted repository editor", () => {
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "pipe" });
  const admin = readFileSync(fromRoot("_site/admin/index.html"), "utf8");
  const home = readFileSync(fromRoot("_site/index.html"), "utf8");
  const cmsUrl =
    "https://app.pagescms.org/junseongpyo/junseongpyo.github.io/main";

  assert.match(admin, new RegExp(cmsUrl.replaceAll(".", "\\.")));
  assert.match(admin, /http-equiv=["']refresh["']/i);
  assert.doesNotMatch(home, /href=["']\/admin\/?["']/);
});
```

- [ ] **Step 2: Run the test and verify the intended failure**

Run: `npm test`

Expected: FAIL because `_site/admin/index.html` does not exist.

- [ ] **Step 3: Create a resilient redirect page**

Create a small, accessible document containing:

- `<meta name="robots" content="noindex, nofollow">`;
- an immediate meta refresh to the verified hosted route
  `https://app.pagescms.org/junseongpyo/junseongpyo.github.io/main`;
- a visible fallback link to the same route;
- a brief note that GitHub authorization is required;
- no analytics script.

Add `admin` as an Eleventy passthrough-copy target if the current input handling
does not already emit it verbatim.

- [ ] **Step 4: Run tests and verify the redirect target responds**

Run: `npm test`

Expected: PASS.

Run:

```bash
curl -sS -I --max-time 15 \
  https://app.pagescms.org/junseongpyo/junseongpyo.github.io/main
```

Expected: HTTP 200 with a Pages CMS response. Network failure should be reported
as an external verification limitation, not worked around with a different URL.

- [ ] **Step 5: Commit the admin entry point**

```bash
git add admin/index.html .eleventy.js tests/site-migration.test.mjs
git commit -m "Add Pages CMS admin entry point"
```

### Task 5: Remove the Blog, htmx Fragments, and Dead Code

**Files:**

- Modify: `.eleventy.js`
- Modify: `package.json`
- Modify: `styles.css`
- Modify: `README.md`
- Modify: `tests/site-migration.test.mjs`
- Delete: every file listed under **Delete** in the file map except `index.html`,
  which Task 2 already removes.

- [ ] **Step 1: Add a failing source-cleanup test**

```js
test("blog and fragment implementation are completely removed", () => {
  for (const path of [
    "blog",
    "posts",
    "pages",
    "scripts/new-post.mjs",
    "_includes/layouts/blog-base.njk",
    "_includes/layouts/post.njk",
    "_includes/lib/toc.js",
  ]) {
    assert.equal(existsSync(fromRoot(path)), false, path);
  }

  const packageJson = readJson("package.json");
  assert.equal("new-post" in packageJson.scripts, false);

  const config = readFileSync(fromRoot(".eleventy.js"), "utf8");
  assert.doesNotMatch(config, /posts|MarkdownIt|readableDate|groupPostsByGroup/);

  const css = readFileSync(fromRoot("styles.css"), "utf8");
  assert.doesNotMatch(css, /\.post(?:-|\s|\{|\.)/);

  const readme = readFileSync(fromRoot("README.md"), "utf8");
  assert.doesNotMatch(readme, /blog|new-post/i);
});
```

- [ ] **Step 2: Run the test and verify the intended failure**

Run: `npm test`

Expected: FAIL because the blog, fragments, and blog configuration still exist.

- [ ] **Step 3: Delete blog and obsolete fragment files**

Delete the explicit paths in the file map. Do not delete `figures/bfsword.png`:
it is not inside the blog and may be used by a future publication update.

- [ ] **Step 4: Simplify the Eleventy configuration**

Remove the blog collection, date filters, grouping filter, Markdown renderer,
heading extraction, post-image passthrough rules, `pages` passthrough, and test
ignore that is no longer necessary. Retain:

- favicon, `.nojekyll`, figures, fonts, profile image, styles, and admin
  passthrough;
- `tagColorClass` and `sortByYearDesc` filters;
- input/include/output directory configuration.

- [ ] **Step 5: Remove blog scripts and CSS**

Remove `new-post` from `package.json`. Remove selectors used only by blog lists,
post pages, blog TOCs, and Markdown content. Keep shared `.site-title-link`,
`.pub-*`, `.toc`, responsive rules, and homepage classes even if their names
originally appeared in a blog layout.

Run `npm install --package-lock-only` if necessary so the lockfile matches
`package.json` without changing installed package versions.

- [ ] **Step 6: Rewrite the README around CMS editing**

Document:

1. sign in at `https://app.pagescms.org` and install/authorize its GitHub App;
2. select `junseongpyo/junseongpyo.github.io` and branch `main`;
3. edit one of the six fixed content files and save;
4. GitHub Actions deploys the commit;
5. `/admin` is an unlinked convenience redirect, not access control;
6. local commands are `npm install`, `npm run dev`, `npm test`, and
   `npm run build`.

- [ ] **Step 7: Clean generated output, then run tests and build**

Eleventy does not remove stale output from deleted source routes. Remove only the
generated `_site` directory before verifying blog removal:

```bash
node -e "require('node:fs').rmSync('_site', { recursive: true, force: true })"
npm test
npm run build
```

Expected: all tests PASS and Eleventy exits 0.

Run: `rg -i 'blog|new-post|htmx|hx-get' _site README.md package.json .eleventy.js`

Expected: no matches and exit status 1.

- [ ] **Step 8: Commit the cleanup**

```bash
git add -A
git commit -m "Remove blog and obsolete client rendering"
```

### Task 6: Production and Visual Verification

**Files:**

- Modify only if verification reveals a scoped defect.

- [ ] **Step 1: Run the full automated verification from a clean output**

Remove only the generated `_site` directory, then run:

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: tests PASS, build exits 0, `git diff --check` emits nothing, and status
shows no unintended source changes. `_site` is ignored and may be regenerated.

- [ ] **Step 2: Run the local production server**

Run: `npm run dev`

Expected: Eleventy reports a local URL and watches without template errors.

- [ ] **Step 3: Inspect desktop rendering**

Open the local homepage at approximately 1440 px width and verify:

- header text, contact links, and profile crop match the current site;
- all five section anchors and sticky table of contents work;
- author emphasis, equal-contribution markers, tags, links, and figures render;
- entries are grouped and ordered as designed;
- no Blog or Edit/Admin control appears.

- [ ] **Step 4: Inspect mobile rendering**

At approximately 390 px width, verify the existing responsive layout remains
readable: profile/header stacking, publication figures, entry dates, contact
links, and hidden/repositioned table of contents must behave as before.

- [ ] **Step 5: Inspect the admin route**

Open `/admin/` and verify it navigates to the hosted Pages CMS repository route.
Do not sign in, install the GitHub App, or make an external content commit as
part of automated implementation; those are explicit owner actions.

- [ ] **Step 6: Confirm requirements against the design**

Re-read
`docs/superpowers/specs/2026-09-02-pages-cms-design.md` and confirm every in-scope
item has corresponding code or verification evidence. Report the owner-only
Pages CMS GitHub App installation as the sole post-implementation setup step.

- [ ] **Step 7: Commit any verification-only fixes**

If Steps 1–6 required scoped fixes, rerun all affected checks and commit them:

```bash
git add <exact-fixed-paths>
git commit -m "Fix Pages CMS migration verification issues"
```

If no fixes were required, do not create an empty commit.
