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

Screenshots are written to `docs/screenshots/` by default.

Use mocked invite data when the UI depends on a valid invitation (the capture script does this automatically).

**Do not include changes to `frontend/scripts/capture-screenshots.mjs` in feature PRs.** Update mock data locally when you run the script if the API shape changed; commit only the PNGs under `docs/screenshots/`, not the script.

### Adding screenshots to the PR

**Commit the images** under `docs/screenshots/` in the same PR as the frontend change, then reference them with the branch raw URL so GitHub does not serve stale cached uploads:

```html
<img alt="Desktop drawer open" src="https://github.com/OWNER/REPO/raw/BRANCH/docs/screenshots/desktop-drawer.png" width="720" />
```

Replace `OWNER`, `REPO`, and `BRANCH` with the real values (e.g. your `cursor/...` feature branch). Re-run the capture script and commit updated PNGs whenever the UI changes.

Group screenshots under **Desktop** and **Mobile** headings so reviewers can compare layouts quickly.

## Do not skip the README

- Do not merge API or deploy work with a stale README.
- Prefer updating the README in the **same commit** as the code change.
- If a change is experimental, still note it in the README or revert before merging.
- Do not commit changes to `frontend/scripts/capture-screenshots.mjs` in feature PRs (screenshot PNGs only).

## Checklist before opening a PR

- [ ] README API section matches current endpoints and payloads
- [ ] README Deployment section matches current Makefile and env vars
- [ ] Makefile deploy variables updated if deploy config changed
- [ ] Examples in README tested or verified against the code
- [ ] Frontend changes include desktop and mobile screenshots in the PR description
