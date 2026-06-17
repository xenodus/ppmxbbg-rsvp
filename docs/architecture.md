# Architecture

Wedding RSVP application: a Go Lambda API backed by MySQL, with a React SPA served through **CloudFront** (S3 is the origin only — browsers do not hit S3 directly). Guests open personalized invite links; admins manage invites through a separate SPA entry point.

---

## System overview

```mermaid
flowchart TB
  subgraph clients["Clients"]
    Guest["Guest browser\n/?id={invite_id}"]
    Admin["Admin browser\n/admin.html"]
  end

  subgraph aws["AWS (ap-southeast-1)"]
    subgraph frontend_hosting["Frontend hosting"]
      CF["CloudFront\nalvinandvivian.rsvp\n(serves SPA + static assets)"]
      S3["S3 bucket\nppmxbbg-rsvp-frontend\n(origin only)"]
      CF --> S3
    end
    APIGW["API Gateway\nHTTP API"]
    Lambda["Lambda\nppmxbbg-rsvp-api\n(Go container)"]
    ECR["ECR\nDocker image"]
  end

  subgraph data["Data"]
    MySQL[("Remote MySQL\nrsvp database")]
  end

  subgraph cicd["CI/CD"]
    GHA["GitHub Actions\non merge to master"]
  end

  Guest -->|"HTTPS HTML/JS/CSS/images"| CF
  Admin -->|"HTTPS HTML/JS/CSS/images"| CF
  Guest -->|"HTTPS API /guest"| APIGW
  Admin -->|"HTTPS API /admin/*"| APIGW
  APIGW --> Lambda
  Lambda --> MySQL
  ECR -.->|"image"| Lambda
  GHA -->|"make deploy-api"| ECR
  GHA -->|"make deploy-frontend"| S3
  GHA --> CF
```

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | React 18 + Vite | Guest landing page, RSVP modal, admin UI |
| CDN / hosting | CloudFront → S3 | CloudFront serves the SPA and static assets on the custom domain; S3 is the private origin |
| API | API Gateway HTTP API | Routes to Lambda, CORS |
| Compute | AWS Lambda (container) | Single Go handler for all routes |
| Database | MySQL | `invites` and `guests` tables |
| Deploy | Makefile + GitHub Actions | OIDC to AWS on PR merge |

---

## Frontend applications

### Production delivery

In production, all frontend traffic goes through CloudFront. The built SPA (`frontend/dist`) is synced to S3; CloudFront fetches from S3 on cache miss and serves `index.html`, `admin.html`, hashed `/assets/*`, and `/images/*` to browsers.

```mermaid
flowchart LR
  B["Browser"]
  CF["CloudFront\nalvinandvivian.rsvp"]
  S3["S3 origin\nppmxbbg-rsvp-frontend"]
  APIGW["API Gateway\n(separate host)"]

  B -->|"GET /, /admin.html, /assets/*, /images/*"| CF
  CF -->|"origin fetch on miss"| S3
  B -->|"fetch() /guest, /admin/*"| APIGW
```

### Vite entry points

Vite builds two HTML entry points from the same `frontend/` tree:

```mermaid
flowchart LR
  subgraph build["Vite build"]
    IDX["index.html"]
    ADM["admin.html"]
  end

  subgraph guest["Guest experience"]
    LAND["LandingApp\n(hero, venue, FAQ)"]
    MODAL["RsvpModal → RsvpForm"]
    API_G["api.js\n/guest"]
  end

  subgraph admin_ui["Admin experience"]
    ADMIN["AdminApp"]
    API_A["adminApi.js\n/admin/*"]
  end

  IDX --> LAND
  LAND --> MODAL
  MODAL --> API_G
  ADM --> ADMIN
  ADMIN --> API_A
```

| Entry | URL | Purpose |
|-------|-----|---------|
| `index.html` | `https://alvinandvivian.rsvp/` or `/?id=…` | Wedding landing page; RSVP opens in a modal when `?id=` is present |
| `admin.html` | `https://alvinandvivian.rsvp/admin.html` | Password-protected invite management, CSV export, QR codes |

Both URLs are served by CloudFront (same distribution, S3 origin).

Local dev: Vite can proxy `/guest` and `/admin` to a remote API when `VITE_API_PROXY_TARGET` is set.

---

## API request flow

All traffic hits one Lambda function (`handler.RSVP`). It parses API Gateway v1 or v2 events, applies CORS, and dispatches by path.

```mermaid
sequenceDiagram
  participant B as Browser
  participant GW as API Gateway
  participant L as Lambda handler
  participant S as store package
  participant DB as MySQL

  B->>GW: GET /guest?id={snowflake}
  GW->>L: HTTP event
  L->>L: dispatch() → handleGetInvite
  L->>S: GetInvite(ctx, id)
  S->>DB: SELECT invite + guests
  DB-->>S: rows
  S-->>L: Invite JSON model
  L-->>GW: 200 + CORS headers
  GW-->>B: JSON response

  Note over B,DB: POST /guest routes by body shape
  B->>GW: POST /guest { decline_all | require_parking | guest fields }
  GW->>L: HTTP event
  L->>L: rsvpcutoff check (403 after cutoff)
  L->>S: DeclineAll / UpdateInvite / UpdateGuest
  S->>DB: UPDATE
  L-->>B: updated invite
```

### Public routes (`/guest`)

| Method | Handler | Store |
|--------|---------|-------|
| `GET /guest` | Load invite by snowflake id | `store.GetInvite` |
| `POST /guest` | Decline all, invite update, or guest update | `store.DeclineAllGuests`, `UpdateInvite`, `UpdateGuest` |

POST routing is determined by request body: `decline_all: true` → decline all guests; presence of `require_parking` → invite update; otherwise → guest update. Submissions are rejected with **403** after the RSVP cutoff (11 Sep 2026, Asia/Singapore); GET remains available.

### Admin routes (`/admin/*`)

```mermaid
flowchart TD
  REQ["Incoming /admin/* request"]
  OPT{"OPTIONS?"}
  LOGIN{"/admin/login\nPOST?"}
  AUTH{"Bearer token\nvalid?"}
  INV["/admin/invites\nGET POST PATCH DELETE"]
  GST["/admin/guests\nPATCH"]

  REQ --> OPT
  OPT -->|yes| CORS["CORS preflight"]
  OPT -->|no| LOGIN
  LOGIN -->|yes| CRED["auth.CheckCredentials\n→ IssueToken"]
  LOGIN -->|no| AUTH
  AUTH -->|no| UNAUTH["401"]
  AUTH -->|yes| INV
  AUTH --> GST
```

Admin session tokens are HMAC-signed JWT-like payloads (`pkg/auth`), 24-hour TTL, stored in browser `localStorage`.

---

## Backend package layout

```mermaid
flowchart TB
  subgraph entry["Entry"]
    MAIN["cmd/main.go\nlambda.Start"]
    LOCAL["cmd/local/main.go\nHTTP server for dev"]
  end

  subgraph handler["handler"]
    RSVP["rsvp.go\nRSVP, dispatch, /guest"]
    ADMIN["admin.go\ndispatchAdmin"]
    CORS["cors.go"]
  end

  subgraph pkg["pkg"]
    CFG["config"]
    AUTH["auth"]
    IDGEN["idgen\nsnowflake ids"]
    CUTOFF["rsvpcutoff"]
  end

  subgraph store["store"]
    INV["invite.go\npublic RSVP CRUD"]
    ADM["admin.go\nadmin CRUD"]
  end

  MAIN --> RSVP
  LOCAL --> RSVP
  RSVP --> ADMIN
  RSVP --> CORS
  RSVP --> INV
  ADMIN --> AUTH
  ADMIN --> IDGEN
  ADMIN --> ADM
  RSVP --> CUTOFF
  INV --> CFG
  ADM --> CFG
  INV --> DB[("MySQL")]
  ADM --> DB
```

---

## Data model

```mermaid
erDiagram
  invites ||--o{ guests : "has many"

  invites {
    bigint id PK "snowflake"
    boolean is_sent
    boolean require_parking
    datetime last_updated
  }

  guests {
    int id PK "AUTO_INCREMENT"
    bigint invite_id FK
    text name
    text dietary_restriction
    boolean is_attending
    boolean attend_solemnisation
    datetime last_updated
  }
```

One invite row maps to one RSVP link (`/?id={invite_id}`). Guest names and RSVP responses are stored per guest row. Admin creates invites (assigning snowflake ids) and tracks `is_sent`; guests update attendance, solemnisation, dietary needs, and parking.

---

## Deployment pipeline

```mermaid
flowchart LR
  PR["PR merged\nto master"]
  GHA["GitHub Actions\nOIDC → IAM role"]
  API["make deploy-api\nDocker → ECR → Lambda"]
  FE["make deploy-frontend\nVite build → S3 sync\n→ CloudFront invalidate"]

  PR --> GHA
  GHA --> API
  GHA --> FE
```

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
