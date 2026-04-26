const MarkdownIt = require("markdown-it");
const { cleanHeadingText, slugify, uniqueSlug } = require("./_includes/lib/toc");

function tokenText(token) {
  if (!token.children) return "";

  return token.children
    .map((child) => child.content || "")
    .join("");
}

function isExternalOrRootPath(src) {
  return /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("/") || src.startsWith("#");
}

function isImageOnlyParagraph(tokens, idx) {
  const inlineToken = tokens[idx + 1] || tokens[idx - 1];
  if (!inlineToken || inlineToken.type !== "inline" || !inlineToken.children) {
    return false;
  }

  const meaningfulChildren = inlineToken.children.filter((child) => {
    return child.type !== "text" || child.content.trim();
  });

  return meaningfulChildren.length === 1 && meaningfulChildren[0].type === "image";
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("figures");
  eleventyConfig.addPassthroughCopy("fonts");
  eleventyConfig.addPassthroughCopy("pages");
  eleventyConfig.addPassthroughCopy({ "posts/*.png": "blog" });
  eleventyConfig.addPassthroughCopy({ "posts/*.jpg": "blog" });
  eleventyConfig.addPassthroughCopy({ "posts/*.jpeg": "blog" });
  eleventyConfig.addPassthroughCopy({ "posts/*.gif": "blog" });
  eleventyConfig.addPassthroughCopy({ "posts/*.webp": "blog" });
  eleventyConfig.addPassthroughCopy({ "posts/*.avif": "blog" });
  eleventyConfig.addPassthroughCopy({ "posts/*.svg": "blog" });
  eleventyConfig.addPassthroughCopy("styles.css");

  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("node_modules/**");
  eleventyConfig.ignores.add("tests/**");

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("posts/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  eleventyConfig.addFilter("readableDate", (date) => {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  });

  eleventyConfig.addFilter("htmlDateString", (date) => {
    return date.toISOString().split("T")[0];
  });

  eleventyConfig.addFilter("tagList", (tags = []) => {
    return tags.filter((tag) => tag !== "posts").join(", ");
  });

  eleventyConfig.addFilter("tagColorClass", (tag = "") => {
    const paletteSize = 8;
    const hash = String(tag)
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);

    return `tag-color-${(hash % paletteSize) + 1}`;
  });

  eleventyConfig.addFilter("groupPostsByGroup", (posts = []) => {
    const groups = new Map();

    posts.forEach((post) => {
      const group = post.data.group || "Ungrouped";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(post);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, groupedPosts]) => ({
        group,
        slug: slugify(group),
        posts: groupedPosts,
      }));
  });

  const markdownLibrary = new MarkdownIt({ html: true });
  const defaultParagraphOpenRenderer =
    markdownLibrary.renderer.rules.paragraph_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  const defaultParagraphCloseRenderer =
    markdownLibrary.renderer.rules.paragraph_close ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  const defaultImageRenderer =
    markdownLibrary.renderer.rules.image ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

  markdownLibrary.renderer.rules.paragraph_open = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    if (isImageOnlyParagraph(tokens, idx)) return "";
    return defaultParagraphOpenRenderer(tokens, idx, options, env, self);
  };

  markdownLibrary.renderer.rules.paragraph_close = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    if (isImageOnlyParagraph(tokens, idx)) return "";
    return defaultParagraphCloseRenderer(tokens, idx, options, env, self);
  };

  markdownLibrary.renderer.rules.image = (tokens, idx, options, env, self) => {
    const src = tokens[idx].attrGet("src");
    const alt = tokens[idx].content || tokens[idx].attrGet("alt");

    if (src && !isExternalOrRootPath(src)) {
      tokens[idx].attrSet("src", `/blog/${src}`);
    }

    const renderedImage = defaultImageRenderer(tokens, idx, options, env, self);

    if (!alt) return renderedImage;

    return `<figure class="post-figure">${renderedImage}<figcaption>${markdownLibrary.utils.escapeHtml(alt)}</figcaption></figure>`;
  };

  markdownLibrary.renderer.rules.heading_open = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    const level = Number(tokens[idx].tag.replace("h", ""));

    if (level >= 1 && level <= 4) {
      env.headingSlugCounts = env.headingSlugCounts || {};
      const headingText = cleanHeadingText(tokenText(tokens[idx + 1]));
      tokens[idx].attrSet("id", uniqueSlug(headingText, env.headingSlugCounts));
    }

    return self.renderToken(tokens, idx, options);
  };

  eleventyConfig.setLibrary("md", markdownLibrary);

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    htmlTemplateEngine: false,
    markdownTemplateEngine: "njk",
  };
};
