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
- `Makefile.include.example` when new or renamed deploy variables are added

### Other README sections

| If you change… | Update this README section… |
|----------------|----------------------------|
| Database tables or columns | Database schema |
| Local dev commands or env files | Local development |
| Project structure | Project layout |
| Wedding copy / frontend constants | Mention in Project layout or Local development |

## Do not skip the README

- Do not merge API or deploy work with a stale README.
- Prefer updating the README in the **same commit** as the code change.
- If a change is experimental, still note it in the README or revert before merging.

## Checklist before opening a PR

- [ ] README API section matches current endpoints and payloads
- [ ] README Deployment section matches current Makefile and env vars
- [ ] `Makefile.include.example` updated if deploy config changed
- [ ] Examples in README tested or verified against the code
