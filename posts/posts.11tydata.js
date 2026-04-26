const { readFileSync } = require("node:fs");
const { extractMarkdownHeadings, slugify } = require("../_includes/lib/toc");

module.exports = {
  eleventyComputed: {
    groupSlug: (data) => slugify(data.group || "notes"),
    permalink: (data) => {
      const group = slugify(data.group || "notes");
      const slug = slugify(data.slug || data.page.fileSlug);

      return `/blog/${group}/${slug}/`;
    },
    toc: (data) => {
      const source = readFileSync(data.page.inputPath, "utf8");
      return extractMarkdownHeadings(source);
    },
  },
};
