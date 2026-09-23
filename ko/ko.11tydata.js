// The Korean page reuses the homepage layout, so swap each content domain
// for its translated copy in _data/ko/. Computed data replaces the global
// values instead of deep-merging their arrays.
const domains = ["site", "about", "publications", "research", "work", "misc"];

module.exports = {
  eleventyComputed: Object.fromEntries(
    domains.map((name) => [name, (data) => data.ko[name]]),
  ),
};
