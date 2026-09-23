# junseongpyo.github.io

Personal academic website of Junseong Pyo, built with Eleventy and deployed to
GitHub Pages through GitHub Actions.

## Content editing

The site's content is managed through the hosted [Pages CMS](https://app.pagescms.org/).
The public site does not show an edit control. To edit content, open
`/admin/` on the deployed site or go directly to the repository editor:

<https://app.pagescms.org/junseongpyo/junseongpyo.github.io/main>

1. Sign in with GitHub and authorize Pages CMS for the repository.
2. Select one of the fixed content files under `_data/`.
3. Edit the structured fields and save the change.
4. Pages CMS commits the change to `main`.
5. GitHub Actions builds and deploys the updated static site.

The repository remains the source of truth. `/admin/` is only a convenience
redirect; GitHub repository permissions control who can save changes.

Content domains are stored in these files:

```text
_data/site.json
_data/about.json
_data/publications.json
_data/research.json
_data/work.json
_data/misc.json
```

The Korean version of the homepage is served at `/ko/` and reads translated
copies of the same files from `_data/ko/`. They appear in Pages CMS with a
`[한국어]` prefix and use the same fields as the English files. UI labels for
both languages (navigation, language switch, and so on) live in
`_data/i18n.json`.

Images are kept in the repository and can be selected from the CMS. The Pages
CMS schema is defined in `.pages.yml`.

## Development

```bash
npm install
npm run dev
```

The local preview runs at the URL printed by Eleventy, usually
`http://localhost:8080/` or the next available port.

Run the content contract and build checks with:

```bash
npm test
npm run build
```

Commit and push after the checks succeed. GitHub Actions builds `_site/` and
deploys it to GitHub Pages.
