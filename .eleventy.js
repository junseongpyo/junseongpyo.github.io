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
  eleventyConfig.ignores.add("tests/**");

  eleventyConfig.addFilter("tagColorClass", (tag = "") => {
    const paletteSize = 8;
    const hash = String(tag)
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);

    return `tag-color-${(hash % paletteSize) + 1}`;
  });

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
