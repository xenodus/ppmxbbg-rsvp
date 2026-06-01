# Wedding RSVP

Wedding RSVP site with a Go Lambda API backed by remote MySQL and a React SPA hosted on S3 (optionally behind CloudFront).

## Architecture

- **Frontend** (`frontend/`): React + Vite single-page app. Guests open a personalised link such as `https://your-domain.com/?id=1234567890123456789`.
- **Backend** (`api/`): Go Lambda container image. One function handles read and write:
  - `GET /invite?id={id}` — load invite and guests
  - `POST /invite` — save invite-level responses
  - `POST /guest` — save individual guest response
- **Database**: MySQL `rsvp` database with `invites` and `guests` tables (populated separately).

## Database schema

```sql
CREATE TABLE invites (
  id BIGINT PRIMARY KEY,
  is_sent TINYINT(1) NOT NULL DEFAULT 0,
  require_parking TINYINT(1) NULL,
  attend_solemnisation TINYINT(1) NULL,
  last_updated DATE NULL
);

CREATE TABLE guests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  invite_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  dietary_restriction TEXT NULL,
  is_attending TINYINT(1) NULL,
  last_updated DATE NULL,
  FOREIGN KEY (invite_id) REFERENCES invites(id)
);
```

## API

### `GET /invite?id={id}`

Returns the invite and its guests:

```json
{
  "id": "1234567890123456789",
  "require_parking": true,
  "attend_solemnisation": false,
  "last_updated": "2026-06-01",
  "guests": [
    {
      "id": 1,
      "name": "Jane Doe",
      "is_attending": true,
      "dietary_restriction": "Vegetarian",
      "last_updated": "2026-06-01"
    }
  ]
}
```

Optional fields are omitted when null.

**404** when the invite does not exist:

```json
{ "error": "invite not found" }
```

### `POST /invite`

Request body:

```json
{
  "id": "1234567890123456789",
  "require_parking": true,
  "attend_solemnisation": false
}
```

Updates invite-level fields and returns the updated invite with guests.

### `POST /guest`

Request body:

```json
{
  "id": 1,
  "is_attending": true,
  "dietary_restriction": "Vegetarian"
}
```

Updates a single guest response.

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
# edit api/.env with DB credentials and TEST_INVITE_ID
cd api && go run ./cmd/local
```

### Frontend

```bash
cp frontend/.env.example frontend/.env
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173/?id=YOUR_INVITE_ID`.

For local API testing through Vite, set `VITE_API_PROXY_TARGET` to your API Gateway URL and leave `VITE_API_BASE_URL` empty so requests go to `/invite` and `/guest` on the dev server.

## Tests

```bash
make test
```

## Deployment

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
make deploy-api
make deploy-frontend
make deploy
```

### API Gateway routes

Map these routes to the same Lambda:

| Method | Path | Integration |
|--------|------|-------------|
| GET | `/invite` | Lambda proxy |
| POST | `/invite` | Lambda proxy |
| POST | `/guest` | Lambda proxy |
| OPTIONS | `/invite`, `/guest` | Lambda proxy (CORS preflight) |

## Invitation links

Share links in this form:

```
https://your-rsvp-domain.com/?id=1234567890123456789
```

The frontend loads the invite, lets the user answer parking/solemnisation questions, and provides a guest list where each guest can be responded to individually.
