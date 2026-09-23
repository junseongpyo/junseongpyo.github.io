import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const fromRoot = (path) => `${root}/${path}`;
const readJson = (path) => JSON.parse(readFileSync(fromRoot(path), "utf8"));

const requiredStrings = (item, keys, context) => {
  for (const key of keys) {
    assert.equal(typeof item[key], "string", `${context}.${key}`);
  }
};

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

test("CMS data files contain the complete current site", () => {
  const paths = ["site", "about", "publications", "research", "work", "misc"];
  for (const name of paths) {
    assert.equal(existsSync(fromRoot(`_data/${name}.json`)), true, name);
  }

  const site = readJson("_data/site.json");
  requiredStrings(site, ["name", "subtitle", "description"], "site");
  assert.equal(site.name, "Junseong Pyo");
  assert.equal(site.contacts.length, 5);

  const about = readJson("_data/about.json");
  assert.equal(about.topics.length, 2);

  const publications = readJson("_data/publications.json");
  assert.equal(publications.items.length, 4);
  assert.ok(
    publications.items.some(({ title }) => title.startsWith("SpokenUS:")),
  );
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

test("Eleventy pre-renders all CMS-managed homepage content", () => {
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "pipe" });
  const html = readFileSync(fromRoot("_site/index.html"), "utf8");

  for (const id of ["about", "publications", "research", "work", "misc"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  for (const text of [
    "Integrated MS-PhD Student in Graduate School of Data Science",
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

test("each publication title links to its primary paper page", () => {
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "pipe" });
  const html = readFileSync(fromRoot("_site/index.html"), "utf8");
  const publications = readJson("_data/publications.json");

  for (const publication of publications.items) {
    const [primaryLink] = publication.links;
    const escapedTitle = publication.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedUrl = primaryLink.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      html,
      new RegExp(
        `<div class=["']pub-title["']>\\s*<a[^>]+href=["']${escapedUrl}["'][^>]*>${escapedTitle}<\\/a>\\s*<\\/div>`,
      ),
    );
  }
});

test("publication title links use the standard hover underline and pointer cursor", () => {
  const css = readFileSync(fromRoot("styles.css"), "utf8");

  assert.match(css, /\.pub-title a:hover\s*\{\s*text-decoration:\s*underline;/);
  assert.match(css, /\.pub-title a\s*\{[^}]*cursor:\s*pointer;/);
});

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
    ["", "ko/"].flatMap((dir) =>
      ["site", "about", "publications", "research", "work", "misc"].map(
        (name) => ({
          name: dir ? `${name}_ko` : name,
          type: "file",
          path: `_data/${dir}${name}.json`,
          format: "json",
          operations: { create: false, delete: false },
        }),
      ),
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
          "category",
          "title",
          "venueAbbreviation",
          "venueName",
          "year",
          "track",
          "note",
          "status",
          "showEqualContributionNote",
          "authors",
          "tags",
          "links",
          "figure",
        ],
        "items.authors": ["name", "owner", "equalContribution"],
        "items.links": ["label", "url"],
      },
    },
    research: {
      top: [
        "experienceHeading",
        "experiences",
        "educationHeading",
        "education",
      ],
      nested: {
        experiences: [
          "organization",
          "organizationUrl",
          "period",
          "role",
          "location",
          "highlights",
        ],
        education: [
          "institution",
          "institutionUrl",
          "period",
          "degree",
          "location",
          "details",
        ],
      },
    },
    work: {
      top: ["heading", "entries"],
      nested: {
        entries: [
          "organization",
          "organizationUrl",
          "team",
          "period",
          "role",
          "location",
          "highlights",
        ],
      },
    },
    misc: {
      top: [
        "projectsHeading",
        "projects",
        "awardsHeading",
        "awards",
        "patentsHeading",
        "patents",
        "skillsHeading",
        "skillGroups",
      ],
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
    const expected = expectedFields[entry.name.replace(/_ko$/, "")];
    assert.deepEqual(
      entry.fields.map(({ name }) => name),
      expected.top,
    );
    for (const [path, names] of Object.entries(expected.nested)) {
      assert.deepEqual(
        fieldAt(entry.fields, path).fields.map(({ name }) => name),
        names,
      );
    }
  }

  const expectedSchema = {
    site: {
      name: "string!",
      subtitle: "text!",
      description: "text!",
      profile: "object!",
      "profile.src": "image!",
      "profile.alt": "string!",
      contacts: "object![]",
      "contacts.label": "string!",
      "contacts.url": "string!",
    },
    about: {
      heading: "string!",
      introductionHtml: "rich-text!",
      topics: "object![]",
      "topics.title": "string!",
      "topics.body": "text!",
      closing: "text!",
    },
    publications: {
      heading: "string!",
      internationalHeading: "string!",
      domesticHeading: "string!",
      items: "object![]",
      "items.category": "select!",
      "items.title": "text!",
      "items.venueAbbreviation": "string!",
      "items.venueName": "text!",
      "items.year": "number!",
      "items.track": "string",
      "items.note": "string",
      "items.status": "string",
      "items.showEqualContributionNote": "boolean!",
      "items.authors": "object![]",
      "items.authors.name": "string!",
      "items.authors.owner": "boolean!",
      "items.authors.equalContribution": "boolean!",
      "items.tags": "select!",
      "items.links": "object[]",
      "items.links.label": "string!",
      "items.links.url": "string!",
      "items.figure": "image",
    },
    research: {
      experienceHeading: "string!",
      experiences: "object![]",
      "experiences.organization": "string!",
      "experiences.organizationUrl": "string",
      "experiences.period": "string!",
      "experiences.role": "string!",
      "experiences.location": "string!",
      "experiences.highlights": "string[]",
      educationHeading: "string!",
      education: "object![]",
      "education.institution": "string!",
      "education.institutionUrl": "string",
      "education.period": "string!",
      "education.degree": "text!",
      "education.location": "string!",
      "education.details": "string[]",
    },
    work: {
      heading: "string!",
      entries: "object![]",
      "entries.organization": "string!",
      "entries.organizationUrl": "string",
      "entries.team": "string",
      "entries.period": "string!",
      "entries.role": "string!",
      "entries.location": "string!",
      "entries.highlights": "string[]",
    },
    misc: {
      projectsHeading: "string!",
      projects: "object![]",
      "projects.title": "string!",
      "projects.period": "string!",
      "projects.subtitle": "text!",
      "projects.highlights": "string[]",
      "projects.links": "object[]",
      "projects.links.label": "string!",
      "projects.links.url": "string!",
      awardsHeading: "string!",
      awards: "object![]",
      "awards.title": "string!",
      "awards.subtitle": "text!",
      "awards.organizer": "string!",
      "awards.year": "number!",
      patentsHeading: "string!",
      patents: "object![]",
      "patents.title": "string!",
      "patents.applicationNumber": "string!",
      "patents.filed": "string!",
      "patents.year": "number!",
      skillsHeading: "string!",
      skillGroups: "object![]",
      "skillGroups.label": "string!",
      "skillGroups.values": "string![]",
    },
  };

  for (const entry of config.content) {
    for (const [path, descriptor] of Object.entries(
      expectedSchema[entry.name.replace(/_ko$/, "")],
    )) {
      const repeated = descriptor.endsWith("[]");
      const withoutList = repeated ? descriptor.slice(0, -2) : descriptor;
      const required = withoutList.endsWith("!");
      const type = required ? withoutList.slice(0, -1) : withoutList;
      const field = fieldAt(entry.fields, path);

      assert.equal(field.type, type, `${entry.name}.${path}.type`);
      if (required) {
        assert.equal(field.required, true, `${entry.name}.${path}.required`);
      }
      if (repeated) {
        assert.ok(field.list, `${entry.name}.${path}.list`);
      } else {
        assert.equal(field.list, undefined, `${entry.name}.${path}.list`);
      }
    }
  }

  const about = config.content.find(({ name }) => name === "about");
  assert.deepEqual(fieldAt(about.fields, "introductionHtml").options, {
    format: "html",
    media: false,
  });

  const publications = config.content.find(
    ({ name }) => name === "publications",
  );
  assert.deepEqual(
    fieldAt(publications.fields, "items.category").options.values,
    ["international", "domestic"],
  );
  assert.deepEqual(
    fieldAt(publications.fields, "items.tags").options.values,
    ["Smart Home", "Speech", "Benchmark", "Model", "Dataset", "Education"],
  );
  assert.equal(
    fieldAt(publications.fields, "items.tags").options.multiple,
    true,
  );
  assert.equal(
    fieldAt(publications.fields, "items.figure").options.media,
    "figures",
  );
  assert.equal(
    fieldAt(publications.fields, "items.authors").list.collapsible.summary,
    "{name}",
  );

  const site = config.content.find(({ name }) => name === "site");
  assert.equal(fieldAt(site.fields, "profile.src").options.media, "profile");
});

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
  assert.doesNotMatch(
    config,
    /posts|MarkdownIt|readableDate|groupPostsByGroup/,
  );

  const css = readFileSync(fromRoot("styles.css"), "utf8");
  assert.doesNotMatch(css, /\.post(?:-|\s|\{|\.)/);

  const readme = readFileSync(fromRoot("README.md"), "utf8");
  assert.doesNotMatch(readme, /blog|new-post/i);
});

test("Korean data files mirror the English content structure", () => {
  const shape = (value) =>
    Array.isArray(value)
      ? value.map(shape)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, shape(item)]),
          )
        : typeof value;

  for (const name of ["site", "about", "publications", "research", "work", "misc"]) {
    assert.deepEqual(
      shape(readJson(`_data/ko/${name}.json`)),
      shape(readJson(`_data/${name}.json`)),
      name,
    );
  }
});

test("the Korean homepage is served at /ko/ with language links", () => {
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "pipe" });
  const en = readFileSync(fromRoot("_site/index.html"), "utf8");
  const ko = readFileSync(fromRoot("_site/ko/index.html"), "utf8");

  assert.match(en, /<html lang="en">/);
  assert.match(ko, /<html lang="ko">/);
  for (const [html, current, other, href] of [
    [en, "EN", "한국어", "\\/ko\\/"],
    [ko, "한국어", "EN", "\\/"],
  ]) {
    const nav = html.match(/<nav class="lang-switch"[\s\S]*?<\/nav>/)[0];
    assert.ok(nav.indexOf("한국어") < nav.indexOf("EN"));
    assert.match(nav, new RegExp(`<span class="active" aria-current="page"[^>]*>${current}<`));
    assert.match(nav, new RegExp(`<a href="${href}"[^>]*>${other}<\\/a>`));
  }
  for (const html of [en, ko]) {
    assert.match(html, /hreflang="ko" href="https:\/\/junseongpyo\.github\.io\/ko\/"/);
    assert.match(html, /src="\/profile_image\.png"/);
  }

  assert.match(ko, /<h1>표준성<\/h1>/);
  assert.match(ko, /최우수상 \(종합 2위\)/);
  assert.match(ko, /공동 제1저자/);
  assert.doesNotMatch(ko, /Co-first authors|Research Interests/);
  assert.doesNotMatch(en, /공동 제1저자|최우수상/);
});
