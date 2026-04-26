function stripFrontMatter(source) {
  return source.replace(/^---\s*[\s\S]*?\s*---\s*/, "");
}

function cleanHeadingText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function slugify(text) {
  const slug = cleanHeadingText(text)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || "section";
}

function uniqueSlug(text, seen) {
  const base = slugify(text);
  seen[base] = (seen[base] || 0) + 1;

  return seen[base] === 1 ? base : `${base}-${seen[base]}`;
}

function extractMarkdownHeadings(source) {
  const headings = [];
  const seen = {};
  let inFence = false;

  stripFrontMatter(source)
    .split(/\r?\n/)
    .forEach((line) => {
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
        return;
      }

      if (inFence) return;

      const match = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
      if (!match) return;

      const text = cleanHeadingText(match[2]);
      headings.push({
        level: match[1].length,
        text,
        id: uniqueSlug(text, seen),
      });
    });

  return headings;
}

module.exports = {
  cleanHeadingText,
  extractMarkdownHeadings,
  slugify,
  uniqueSlug,
};
