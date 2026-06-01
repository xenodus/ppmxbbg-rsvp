# Wedding RSVP

Wedding RSVP site with a Go Lambda API backed by remote MySQL and a React SPA hosted on S3 (optionally behind CloudFront).

## Architecture

- **Frontend** (`frontend/`): React + Vite single-page app. Guests open a personalised link such as `https://your-domain.com/?id=ABC123`.
- **Backend** (`api/`): Go Lambda container image. One function handles both read and write:
  - `GET /guest?id={id}` — load guest record
  - `POST /guest` — save RSVP
- **Database**: MySQL `rsvp` database, `guests` table (populated separately).

## Database schema

```sql
CREATE TABLE guests (
  id VARCHAR(6) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_attending TINYINT(1) NULL,
  comment TEXT NULL,
  last_updated DATE NULL
);
```

## API

### `GET /guest?id={id}`

Returns the full guest row when found:

```json
{
  "id": "ABC123",
  "name": "Jane Doe",
  "is_attending": true,
  "comment": "Vegetarian",
  "last_updated": "2026-05-01"
}
```

`is_attending`, `comment`, and `last_updated` are omitted when null.

**404** when the guest does not exist:

```json
{ "error": "guest not found" }
```

### `POST /guest`

Request body:

```json
{
  "id": "ABC123",
  "name": "Jane Doe",
  "is_attending": true,
  "comment": "Vegetarian"
}
```

Updates `name`, `is_attending`, `comment`, and sets `last_updated` to the current date. Returns the updated guest on success.

## Environment variables (Lambda)

| Variable | Description |
|----------|-------------|
| `ENV` | `prod` or `staging` to run as Lambda |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port (default `3306`) |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (`rsvp`) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (e.g. `https://rsvp.example.com`) |

Copy `api/.env.example` to `api/.env` for local runs.

## Frontend configuration

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | API Gateway base URL (build-time) |
| `VITE_API_PROXY_TARGET` | Optional dev proxy target for `npm run dev` |

Wedding copy (names, date, venue) lives in `frontend/src/constants.js`.

## Local development

### API

```bash
cp api/.env.example api/.env
# edit api/.env with DB credentials and TEST_GUEST_ID
cd api && go run ./cmd/local
```

With `ENV` unset, `go run ./cmd/local` performs a single local GET using `TEST_GUEST_ID`.

### Frontend

```bash
cp frontend/.env.example frontend/.env
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173/?id=YOUR_GUEST_ID`.

For local API testing through Vite, set `VITE_API_PROXY_TARGET` to your API Gateway or local proxy URL and leave `VITE_API_BASE_URL` empty so requests go to `/guest` on the dev server.

## Tests

```bash
make test
```

## Deployment

Deployment follows the same pattern as [gishathfetch](https://github.com/xenodus/gishathfetch):

1. Build and push the Lambda container image to ECR.
2. Update the Lambda function.
3. Build the frontend and sync `frontend/dist` to S3.
4. Invalidate CloudFront if used.

Configure Makefile variables in `Makefile.include` (copy from `Makefile.include.example`):

- `AWS_ACCOUNT_ID`
- `ECR_REPO_NAME`
- `LAMBDA_FUNCTION`
- `S3_BUCKET`
- `CLOUDFRONT_DISTRIBUTION_ID` (optional)
- `VITE_API_BASE_URL`

```bash
cp Makefile.include.example Makefile.include
# edit Makefile.include
```

### Deploy

```bash
# API only (build image, push to ECR, update Lambda)
make deploy-api

# Frontend only (build with VITE_API_BASE_URL, sync to S3, invalidate CloudFront)
make deploy-frontend

# Both
make deploy
```

### API Gateway routes

Map both routes to the same Lambda:

| Method | Path | Integration |
|--------|------|-------------|
| GET | `/guest` | Lambda proxy |
| POST | `/guest` | Lambda proxy |
| OPTIONS | `/guest` | Lambda proxy (CORS preflight) |

Enable CORS at API Gateway or rely on the Lambda response headers.

## Invitation links

Share links in this form:

```
https://your-rsvp-domain.com/?id=ABC123
```

The frontend loads the guest on mount, prefills name (and attendance/comment when present), and shows **Guest not found. Please check your invitation link.** when the id is missing or unknown.
