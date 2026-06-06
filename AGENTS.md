# Agent instructions

Before planning or editing code in this repository, read and follow [INSTRUCTIONS.md](./INSTRUCTIONS.md).

## Non-negotiable

- **README**: Update [README.md](./README.md) in the same change when API, deployment, database schema, local dev, or project layout changes (details in INSTRUCTIONS.md).
- **Frontend PRs**: Do not generate screenshots by default. For visible UI changes, ask the user whether desktop and mobile screenshots are wanted in the PR description (not committed to the repo). See INSTRUCTIONS.md for when and how to capture them. Do not commit changes to `frontend/scripts/capture-screenshots.mjs` or screenshot PNGs in feature PRs.
- **Before opening a PR**: Complete the checklist in INSTRUCTIONS.md (README sections, deploy config, examples, screenshots when requested).

## Where to look

| Topic | Source |
|-------|--------|
| Full project rules | [INSTRUCTIONS.md](./INSTRUCTIONS.md) |
| API and deployment docs | [README.md](./README.md) |
| Screenshot capture | `frontend` → `npm run screenshots` (see INSTRUCTIONS.md) |
