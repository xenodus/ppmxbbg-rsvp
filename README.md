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
  "attend_solemnisation": false,
  "last_updated": "2026-06-01",
  "guests": [
    {
      "id": 1,
      "name": "Jane Doe",
      "is_attending": true,
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

Null fields (`require_parking`, `attend_solemnisation`, `is_attending`, `dietary_restriction`, `last_updated`) are omitted from the response.

**Errors**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{"error":"id is required"}` | Missing `id` query param |
| `404` | `{"error":"invite not found"}` | Invite id not in database |
| `500` | `{"error":"failed to load invite"}` | Database error |

---

### POST /guest

Save RSVP data. The handler routes by request body:

- Body contains `require_parking` or `attend_solemnisation` → **invite update**
- Otherwise → **guest update**

#### Invite update

**Request body**

```json
{
  "id": "1234567890123456789",
  "require_parking": true,
  "attend_solemnisation": false
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Invite id (snowflake, string) |
| `require_parking` | yes | Whether couple parking is required |
| `attend_solemnisation` | yes | Whether attending the solemnisation |

**Example**

```bash
curl -X POST "https://YOUR_API_URL/guest" \
  -H "Content-Type: application/json" \
  -d '{"id":"1234567890123456789","require_parking":true,"attend_solemnisation":false}'
```

**200 OK** — returns the updated invite with guests (same shape as GET).

**Errors**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{"error":"id is required"}` | Missing invite id |
| `400` | `{"error":"require_parking and attend_solemnisation are required"}` | Missing boolean fields |
| `404` | `{"error":"invite not found"}` | Invite id not in database |

#### Guest update

**Request body**

```json
{
  "id": 1,
  "is_attending": true,
  "dietary_restriction": "Vegetarian"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Guest id (integer) |
| `is_attending` | yes | `true` = attending, `false` = declining |
| `dietary_restriction` | no | Dietary needs; send `null` or omit if none |

**Example**

```bash
curl -X POST "https://YOUR_API_URL/guest" \
  -H "Content-Type: application/json" \
  -d '{"id":1,"is_attending":true,"dietary_restriction":"Vegetarian"}'
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

---

## Project layout

```text
.
├── api/           # Go Lambda (handler, store, config)
├── frontend/      # React + Vite SPA
├── Dockerfile     # Lambda container image
├── Makefile       # Build and deploy commands
└── Makefile.include.example
```

Wedding copy (couple names, date, venue) is in `frontend/src/constants.js`.
