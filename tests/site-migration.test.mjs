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
