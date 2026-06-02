# Wedding RSVP

Go Lambda API + React SPA for wedding RSVPs. One invite can include multiple guests.

- **Backend:** Go container image on AWS Lambda
- **Frontend:** React SPA on S3 + CloudFront
- **Database:** Remote MySQL (`invites`, `guests` tables — populated separately)

---

## API

Base URL: your API Gateway URL, e.g. `https://abc123.execute-api.ap-southeast-1.amazonaws.com`

All endpoints use the `/guest` path.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/guest?id={invite_id}` | Load invite and all guests |
| `POST` | `/guest` | Save invite-level or guest-level RSVP |
| `OPTIONS` | `/guest` | CORS preflight |

---

### GET /guest

Load an invite and its guests by snowflake invite id.

**Query parameters**

| Param | Required | Description |
|-------|----------|-------------|
| `id` | yes | Invite id (snowflake) |

**Example**

```bash
curl "https://YOUR_API_URL/guest?id=1234567890123456789"
```

**200 OK**

```json
{
  "id": "1234567890123456789",
  "require_parking": true,
  "last_updated": "2026-06-01",
  "guests": [
    {
      "id": 1,
      "name": "Jane Doe",
      "is_attending": true,
      "attend_solemnisation": true,
      "dietary_restriction": "Vegetarian",
      "last_updated": "2026-06-01"
    },
    {
      "id": 2,
      "name": "John Doe"
    }
  ]
}
```

Null fields (`require_parking`, `is_attending`, `attend_solemnisation`, `dietary_restriction`, `last_updated`) are omitted from the response.

**Errors**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{"error":"id is required"}` | Missing `id` query param |
| `404` | `{"error":"invite not found"}` | Invite id not in database |
| `500` | `{"error":"failed to load invite"}` | Database error |

---

### POST /guest

Save RSVP data. The handler routes by request body:

- Body contains `"decline_all": true` → **decline all guests** for the invite
- Body contains `require_parking` → **invite update**
- Otherwise → **guest update**

#### Decline all guests

**Request body**

```json
{
  "id": "1234567890123456789",
  "decline_all": true
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Invite id (snowflake, string) |
| `decline_all` | yes | Must be `true` — marks every guest on the invite as not attending |

**200 OK** — returns the updated invite with guests (all `is_attending: false`, `dietary_restriction: ""`, `attend_solemnisation: null`). Any unset invite booleans are saved as `false`.

#### Invite update

**Request body**

```json
{
  "id": "1234567890123456789",
  "require_parking": true
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Invite id (snowflake, string) |
| `require_parking` | yes | Whether couple parking is required |

**Example**

```bash
curl -X POST "https://YOUR_API_URL/guest" \
  -H "Content-Type: application/json" \
  -d '{"id":"1234567890123456789","require_parking":true}'
```

**200 OK** — returns the updated invite with guests (same shape as GET).

**Errors**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{"error":"id is required"}` | Missing invite id |
| `400` | `{"error":"require_parking is required"}` | Missing parking field |
| `404` | `{"error":"invite not found"}` | Invite id not in database |

#### Guest update

**Request body**

```json
{
  "id": 1,
  "is_attending": true,
  "attend_solemnisation": true,
  "dietary_restriction": "Vegetarian"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Guest id (integer) |
| `is_attending` | yes | `true` = attending, `false` = declining |
| `attend_solemnisation` | yes* | Whether attending the solemnisation |
| `dietary_restriction` | no | Dietary needs; omit or send `""` if none (stored as empty string, never `null`) |

\* Required when `is_attending` is `true`. Cleared to `null` when declining.

After any save, nullable RSVP fields are persisted as concrete values: booleans as `true`/`false`, text as `""`.

**Example**

```bash
curl -X POST "https://YOUR_API_URL/guest" \
  -H "Content-Type: application/json" \
  -d '{"id":1,"is_attending":true,"attend_solemnisation":true,"dietary_restriction":"Vegetarian"}'
```

**200 OK**

```json
{ "status": "saved" }
```

**Errors**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{"error":"id is required"}` | Missing guest id |
| `400` | `{"error":"is_attending is required"}` | Missing attendance choice |
| `400` | `{"error":"attend_solemnisation is required when attending"}` | Attending guest missing solemnisation choice |
| `404` | `{"error":"guest not found"}` | Guest id not in database |

---

## Deployment

### Prerequisites

- AWS CLI configured with deploy permissions
- Docker with `buildx`
- ECR repository created
- Lambda function created (container image, `x86_64`, 256 MB, 30 s timeout)
- HTTP API Gateway with routes pointing to the Lambda
- S3 bucket + CloudFront distribution for the frontend
- MySQL database with `invites` and `guests` tables

### Lambda environment variables

Set these in the AWS Lambda console (or your IaC):

| Variable | Example | Description |
|----------|---------|-------------|
| `ENV` | `prod` | Must be lowercase `prod` for production CORS |
| `DB_HOST` | `your-db.example.com` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `rsvp_user` | MySQL user |
| `DB_PASSWORD` | `***` | MySQL password |
| `DB_NAME` | `rsvp` | Database name |
| `FRONTEND_ORIGIN` | `https://d111.cloudfront.net` | CloudFront or custom domain URL for CORS |

If MySQL is in a VPC, attach the Lambda to the same VPC/subnets/security groups and add the `AWSLambdaVPCAccessExecutionRole` policy.

### API Gateway routes

Map all routes to the same Lambda function:

| Method | Path |
|--------|------|
| `GET` | `/guest` |
| `POST` | `/guest` |
| `OPTIONS` | `/guest` |

Set CORS allowed origin to your CloudFront URL (or custom domain).

### Configure deploy variables

```bash
cp Makefile.include.example Makefile.include
```

Edit `Makefile.include`:

```makefile
AWS_ACCOUNT_ID=123456789012
AWS_REGION=ap-southeast-1

ECR_REPO_NAME=ppmxbbg-rsvp-api
LAMBDA_FUNCTION=ppmxbbg-rsvp-api

S3_BUCKET=ppmxbbg-rsvp-frontend
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC

# API Gateway base URL — no trailing slash
VITE_API_BASE_URL=https://abc123.execute-api.ap-southeast-1.amazonaws.com
```

### Deploy commands

```bash
# API: build Docker image → push to ECR → update Lambda
make deploy-api

# Frontend: build React app → sync to S3 → invalidate CloudFront
make deploy-frontend

# Both
make deploy
```

### Verify after deploy

```bash
# API
curl "https://YOUR_API_URL/guest?id=YOUR_INVITE_ID"

# Frontend
open "https://YOUR_CLOUDFRONT_URL/?id=YOUR_INVITE_ID"
```

### Invitation links

Share links in this form:

```
https://YOUR_CLOUDFRONT_URL/?id=1234567890123456789
```

---

## Local development

### API

```bash
cp api/.env.example api/.env
# edit with DB credentials and TEST_INVITE_ID
cd api && go run ./cmd/local
```

### Frontend

```bash
cp frontend/.env.example frontend/.env
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173/?id=YOUR_INVITE_ID`.

To proxy API calls through Vite during dev, set `VITE_API_PROXY_TARGET` in `frontend/.env` to your API Gateway URL and leave `VITE_API_BASE_URL` empty.

### Tests

```bash
make test
```

---

## Database schema

Database: `rsvp` (populated separately).

### `invites`

| Column | Type |
|--------|------|
| `id` | snowflake |
| `is_sent` | boolean |
| `require_parking` | boolean |
| `last_updated` | datetime, default `NOW()` |

### `guests`

| Column | Type |
|--------|------|
| `id` | auto incremental (`AUTO_INCREMENT`) |
| `invite_id` | foreign key → `invites.id` |
| `name` | text |
| `dietary_restriction` | text |
| `is_attending` | boolean |
| `attend_solemnisation` | boolean |
| `last_updated` | datetime, default `NOW()` |

One invite (`invites.id`) can have many guests (`guests.invite_id`).

The API reads and updates `require_parking` on invites, and `attend_solemnisation`, `is_attending`, and `dietary_restriction` on guests. `is_sent` is managed outside the API.

### Example MySQL DDL

```sql
CREATE TABLE invites (
  id BIGINT UNSIGNED NOT NULL,
  is_sent BOOLEAN NULL,
  require_parking BOOLEAN NULL,
  last_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE guests (
  id INT NOT NULL AUTO_INCREMENT,
  invite_id BIGINT UNSIGNED NOT NULL,
  name TEXT NOT NULL,
  dietary_restriction TEXT NULL,
  is_attending BOOLEAN NULL,
  attend_solemnisation BOOLEAN NULL,
  last_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (invite_id) REFERENCES invites (id)
);
```

### Migration from invite-level solemnisation

If your database still has `attend_solemnisation` on `invites`, run:

```sql
ALTER TABLE guests ADD COLUMN attend_solemnisation BOOLEAN NULL;

UPDATE guests g
JOIN invites i ON g.invite_id = i.id
SET g.attend_solemnisation = i.attend_solemnisation
WHERE i.attend_solemnisation IS NOT NULL;

ALTER TABLE invites DROP COLUMN attend_solemnisation;
```

---

## Project layout

```text
.
├── api/           # Go Lambda (handler, store, config)
├── frontend/      # React + Vite SPA
├── Dockerfile     # Lambda container image
├── Makefile       # Build and deploy commands
├── Makefile.include.example
└── INSTRUCTIONS.md  # Repo rules — keep README in sync with API/deploy changes
```

Wedding copy (couple names, date, venue) is in `frontend/src/constants.js`.
