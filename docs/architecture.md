# Architecture

Wedding RSVP application: a Go Lambda API backed by MySQL, with a React SPA served through **CloudFront** (S3 is the origin only — browsers do not hit S3 directly). Guests open personalized invite links; admins manage invites through a separate SPA entry point.

---

## Diagram

```mermaid
flowchart TB
  subgraph clients["Clients"]
    Guest["Guest browser\n/?id={invite_id}"]
    Admin["Admin browser\n/admin.html"]
  end

  subgraph frontend["Frontend — CloudFront serves SPA + static assets"]
    CF["CloudFront\nalvinandvivian.rsvp"]
    S3["S3 origin\nppmxbbg-rsvp-frontend"]
    CF -->|"cache miss"| S3

    subgraph spa["React SPA (Vite build)"]
      IDX["index.html\nLandingApp → RsvpModal\napi.js"]
      ADM["admin.html\nAdminApp\nadminApi.js"]
    end
  end

  subgraph backend["Backend API"]
    APIGW["API Gateway\nHTTP API"]
    Lambda["Lambda — Go container\nhandler.RSVP"]
    APIGW --> Lambda

    subgraph dispatch["handler dispatch"]
      GUEST["/guest\nGET · POST"]
      ADMIN["/admin/login\n/admin/invites\n/admin/guests"]
    end
    Lambda --> dispatch
  end

  DB[("MySQL rsvp\ninvites 1──N guests")]

  subgraph cicd["CI/CD — merge to master"]
    GHA["GitHub Actions\nOIDC → IAM"]
    GHA -->|"make deploy-frontend"| S3
    GHA -->|"CloudFront invalidate"| CF
    GHA -->|"make deploy-api\nDocker → ECR"| Lambda
  end

  Guest -->|"HTTPS HTML / JS / CSS / images"| CF
  Admin -->|"HTTPS HTML / JS / CSS / images"| CF
  CF -.-> spa
  S3 -.-> spa

  Guest --> IDX
  Admin --> ADM
  IDX -->|"fetch /guest"| APIGW
  ADM -->|"fetch /admin/*"| APIGW
  dispatch --> DB
```

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | React 18 + Vite | Guest landing page, RSVP modal, admin UI |
| CDN / hosting | CloudFront → S3 | CloudFront serves the SPA on the custom domain; S3 is the private origin |
| API | API Gateway HTTP API | Routes to Lambda, CORS |
| Compute | AWS Lambda (container) | Single Go handler for all routes |
| Database | MySQL | `invites` and `guests` tables |
| Deploy | Makefile + GitHub Actions | OIDC to AWS on PR merge |

---

## Frontend

Vite builds two HTML entry points from the same `frontend/` tree. Both are deployed to S3 and served through CloudFront.

| Entry | URL | Purpose |
|-------|-----|---------|
| `index.html` | `https://alvinandvivian.rsvp/` or `/?id=…` | Wedding landing page; RSVP opens in a modal when `?id=` is present |
| `admin.html` | `https://alvinandvivian.rsvp/admin.html` | Password-protected invite management, CSV export, QR codes |

Local dev: Vite can proxy `/guest` and `/admin` to a remote API when `VITE_API_PROXY_TARGET` is set.

---

## API

All API traffic hits one Lambda function (`handler.RSVP`). It parses API Gateway v1 or v2 events, applies CORS, and dispatches by path.

### Public routes (`/guest`)

| Method | Handler | Store |
|--------|---------|-------|
| `GET /guest` | Load invite by snowflake id | `store.GetInvite` |
| `POST /guest` | Decline all, invite update, or guest update | `store.DeclineAllGuests`, `UpdateInvite`, `UpdateGuest` |

POST routing is determined by request body: `decline_all: true` → decline all guests; presence of `require_parking` → invite update; otherwise → guest update. Submissions are rejected with **403** after the RSVP cutoff (11 Sep 2026, Asia/Singapore); GET remains available.

### Admin routes (`/admin/*`)

| Path | Auth | Purpose |
|------|------|---------|
| `POST /admin/login` | None | Sign in; returns bearer token |
| `/admin/invites` | Bearer | List, create, update, delete invites |
| `PATCH /admin/guests` | Bearer | Rename a guest |

Admin session tokens are HMAC-signed payloads (`pkg/auth`), 24-hour TTL, stored in browser `localStorage`.

---

## Backend layout

```text
api/
├── cmd/main.go          # Lambda entry (lambda.Start)
├── cmd/local/main.go    # Local HTTP server for dev
├── handler/
│   ├── rsvp.go          # RSVP, dispatch, /guest
│   ├── admin.go         # /admin/*
│   └── cors.go
├── store/
│   ├── invite.go        # Public RSVP CRUD
│   └── admin.go         # Admin CRUD
└── pkg/
    ├── auth/            # Credentials + bearer tokens
    ├── config/          # DB connection
    ├── idgen/           # Snowflake invite ids
    └── rsvpcutoff/      # RSVP deadline enforcement
```

---

## Data model

### `invites`

| Column | Type |
|--------|------|
| `id` | snowflake (PK) |
| `is_sent` | boolean |
| `require_parking` | boolean |
| `last_updated` | datetime |

### `guests`

| Column | Type |
|--------|------|
| `id` | auto incremental (PK) |
| `invite_id` | FK → `invites.id` |
| `name` | text |
| `dietary_restriction` | text |
| `is_attending` | boolean |
| `attend_solemnisation` | boolean |
| `last_updated` | datetime |

One invite row maps to one RSVP link (`/?id={invite_id}`). Guest names and RSVP responses are stored per guest row.

---

## Deployment

| Target | Makefile target | Artifacts |
|--------|-----------------|-----------|
| API | `deploy-api` | `Dockerfile` multi-stage build → ECR → `lambda update-function-code` |
| Frontend | `deploy-frontend` | `frontend/dist` → S3; CloudFront cache invalidation |
| Both | `deploy` | Runs API then frontend |

API Gateway routes are defined in the Makefile (`API_ROUTES`) and created manually via `make api-gateway-routes` when new paths are added.

---

## Environment and configuration

| Component | Key variables |
|-----------|----------------|
| Lambda | `DB_*`, `ENV`, `FRONTEND_ORIGIN(S)`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET` |
| Frontend build | `VITE_API_BASE_URL` (baked in at build time) |
| Local API | `api/.env` (from `api/.env.example`) |
| Local frontend | `frontend/.env` — optional `VITE_API_PROXY_TARGET` for dev proxy |

Lambda may run inside a VPC when MySQL is network-restricted (`AWSLambdaVPCAccessExecutionRole`).
