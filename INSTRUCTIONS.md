# Project instructions

Follow these rules when making changes to this repository.

## Keep the README up to date

**Always update [README.md](./README.md) in the same change** when you modify anything that affects:

### API changes

Update the **API** section when you change:

- Endpoint paths or HTTP methods
- Query parameters or request body fields
- Response shape or status codes
- Error messages or validation rules
- Routing logic (e.g. how `POST /guest` distinguishes invite vs guest updates)

Also update:

- `frontend/src/api.js` if the frontend call pattern changes
- `api/handler/rsvp_test.go` for handler behaviour
- curl examples in the README so they stay copy-pasteable

### Deployment changes

Update the **Deployment** section when you change:

- Makefile targets or deploy flow (`deploy`, `deploy-api`, `deploy-frontend`, etc.)
- Required AWS resources (Lambda, ECR, API Gateway, S3, CloudFront)
- Environment variables (Lambda or frontend build-time)
- API Gateway routes or CORS configuration
- the **Makefile** when new or renamed deploy variables are added

### Other README sections

| If you change… | Update this README section… |
|----------------|----------------------------|
| Database tables or columns | Database schema |
| Local dev commands or env files | Local development |
| Project structure | Project layout |
| Wedding copy / frontend constants | Mention in Project layout or Local development |

## Frontend pull requests need screenshots

**Any PR that changes `frontend/` must include mobile and desktop screenshots in the PR description.**

### What to capture

At minimum, attach images that show the affected UI on:

- **Desktop** (roughly 1280px wide)
- **Mobile** (roughly 390px wide, e.g. iPhone-sized)

For navigation or scroll behaviour, include both the default state and any scrolled/expanded/open states (for example, the floating menu before scroll, after scroll, and with the drawer open).

### How to generate screenshots

From the repo root:

```bash
cd frontend
npm ci
npm run build
npx playwright install chromium
npm run screenshots
```

Screenshots are written locally to `docs/screenshots/` by default (that directory is gitignored). **Do not commit screenshot PNGs** — they belong only in the PR description.

Use mocked invite data when the UI depends on a valid invitation (the capture script does this automatically).

**Do not include changes to `frontend/scripts/capture-screenshots.mjs` in feature PRs.** Update mock data locally when you run the script if the API shape changed.

### Adding screenshots to the PR

Attach desktop and mobile images **only in the PR description** (not in the repository). Re-run the capture script whenever the UI changes and refresh the PR images.

Group screenshots under **Desktop** and **Mobile** headings so reviewers can compare layouts quickly.

#### Image links in the PR description

Use paths that actually render in the PR body. **Do not** use GitHub branch raw URLs such as:

- `https://github.com/OWNER/REPO/raw/BRANCH/docs/screenshots/example.png`
- `https://raw.githubusercontent.com/OWNER/REPO/BRANCH/docs/screenshots/example.png`

Those links return **404** for this private repository (they require auth GitHub does not apply when rendering `<img>` tags in a PR), so reviewers see broken images.

**Cursor / Cloud Agent PRs (recommended):** After generating PNGs locally, reference them with an **absolute workspace path** in the `<img>` `src`. When the PR is created or updated, those files are uploaded and the `src` is rewritten to a stable public URL:

```html
<img alt="Desktop drawer open" src="/workspace/docs/screenshots/desktop-drawer.png" width="720" />
<img alt="Mobile drawer open" src="/workspace/docs/screenshots/mobile-drawer.png" width="390" />
```

The file must exist on disk when the PR is created or updated (for example right after `npm run screenshots`). It does not need to be committed.

**Manual PRs on GitHub:** Drag and drop each PNG into the PR description editor, or paste an image from the clipboard. GitHub hosts those uploads on `user-images.githubusercontent.com` and they display reliably.

**Avoid** pasting one-off upload URLs from an old PR into a new PR description; prefer fresh uploads or workspace paths so images stay in sync with the current UI.

## Do not skip the README

- Do not merge API or deploy work with a stale README.
- Prefer updating the README in the **same commit** as the code change.
- If a change is experimental, still note it in the README or revert before merging.
- Do not commit changes to `frontend/scripts/capture-screenshots.mjs` or screenshot PNGs in feature PRs.

## Checklist before opening a PR

- [ ] README API section matches current endpoints and payloads
- [ ] README Deployment section matches current Makefile and env vars
- [ ] Makefile deploy variables updated if deploy config changed
- [ ] Examples in README tested or verified against the code
- [ ] Frontend changes include desktop and mobile screenshots in the PR description
