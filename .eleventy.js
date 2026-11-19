module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy(".nojekyll");
  eleventyConfig.addPassthroughCopy("figures");
  eleventyConfig.addPassthroughCopy("fonts");
  eleventyConfig.addPassthroughCopy("profile_image.png");
  eleventyConfig.addPassthroughCopy("styles.css");

  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("docs/**");
  eleventyConfig.ignores.add("node_modules/**");

  eleventyConfig.addFilter("tagColorClass", (tag = "") => {
    const paletteSize = 8;
    const hash = String(tag)
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);

    return `tag-color-${(hash % paletteSize) + 1}`;
  });

  // Pages CMS stores profile images relative to the site root; make them
  // absolute so they also resolve from /ko/.
  eleventyConfig.addFilter("rootPath", (src = "") =>
    /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("/") ? src : `/${src}`,
  );

  // Priority tags always come first in this order; the rest follow alphabetically.
  const priorityTags = ["smart home", "robotics", "speech"];
  eleventyConfig.addFilter("sortTags", (tags = []) => {
    const rank = (tag) => {
      const index = priorityTags.indexOf(String(tag).toLowerCase());
      return index === -1 ? priorityTags.length : index;
    };
    return [...tags].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        String(a).localeCompare(String(b), undefined, { sensitivity: "base" }),
    );
  });

  eleventyConfig.addFilter("byCategory", (items = [], category = "") =>
    items.filter((item) => item.category === category),
  );

  eleventyConfig.addFilter("sortByYearDesc", (items = []) =>
    [...items].sort((a, b) => b.year - a.year),
  );

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    htmlTemplateEngine: false,
  };
};
