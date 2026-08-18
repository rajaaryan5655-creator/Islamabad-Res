# Deployment Guide

Target architecture: **Vercel** (web) · **AWS EC2** (API) · **RDS PostgreSQL** ·
**ElastiCache Redis** · **S3 + CloudFront** (media) · **Sentry** + **Google Analytics**.

```
             ┌──────────────┐
 Browser ──► │   Vercel     │  Next.js 16, edge CDN, ISR
             │  (web app)   │
             └──────┬───────┘
                    │ /api/* proxied server-side
                    ▼
             ┌──────────────┐     ┌──────────────────┐
             │  ALB (TLS)   │ ──► │  EC2 · Express   │
             └──────────────┘     └───┬──────────┬───┘
                                      │          │
                            ┌─────────▼──┐  ┌────▼─────────┐
                            │ RDS Postgres│  │ ElastiCache │
                            └─────────────┘  └─────────────┘
```

---

## 1. Prerequisites

- Node.js ≥ 20.11
- An AWS account, a Vercel account, and the domain `islamabadrestaurant.pk`
- Stripe and PayPal live credentials (optional — the platform runs without them)

---

## 2. Database — RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier islamabad-prod \
  --db-instance-class db.t4g.medium \
  --engine postgres --engine-version 16 \
  --allocated-storage 50 --storage-type gp3 --storage-encrypted \
  --master-username islamabad --manage-master-user-password \
  --backup-retention-period 14 \
  --preferred-backup-window 20:00-21:00 \
  --multi-az \
  --no-publicly-accessible \
  --vpc-security-group-ids sg-xxxxxxxx
```

Notes:

- **Multi-AZ** — a restaurant that cannot take orders at 8pm on a Friday is losing real
  money; the failover is worth the cost.
- Backup window 20:00–21:00 UTC is 01:00–02:00 PKT, comfortably after close.
- Never make it publicly accessible; the API reaches it inside the VPC.

Apply the schema:

```bash
cd apps/api
DATABASE_URL="postgresql://…" npm run db:push     # executes prisma/sql/postgresql.sql
DATABASE_URL="postgresql://…" npm run db:seed     # first deploy only
```

`db:push` is idempotent (`CREATE TABLE IF NOT EXISTS`). Review the diff in
`apps/api/prisma/sql/postgresql.sql` in a pull request before applying it to production —
that file *is* the migration.

---

## 3. Cache — ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id islamabad-cache \
  --engine redis --cache-node-type cache.t4g.micro \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxxxxx
```

Set `REDIS_URL`. If it is absent or unreachable the API logs a warning and falls back to
an in-process cache — degraded, but never down.

---

## 4. API — EC2

```bash
# Amazon Linux 2023, t4g.small is sufficient to start
sudo dnf install -y nodejs22 git
sudo npm install -g pm2

git clone https://github.com/rajaaryan5655-creator/Islamabad-Res.git
cd Islamabad-Res
npm ci
npm run build -w @islamabad/api
```

`apps/api/.env`:

```ini
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://islamabad:…@islamabad-prod.rds.amazonaws.com:5432/islamabad?schema=public&sslmode=require"
REDIS_URL="redis://islamabad-cache.cache.amazonaws.com:6379"
WEB_ORIGIN="https://islamabadrestaurant.pk,https://www.islamabadrestaurant.pk"
JWT_ACCESS_SECRET="<openssl rand -base64 48>"
JWT_REFRESH_SECRET="<openssl rand -base64 48>"
STRIPE_SECRET_KEY="sk_live_…"
STRIPE_WEBHOOK_SECRET="whsec_…"
PAYPAL_CLIENT_ID="…"
PAYPAL_SECRET="…"
SENTRY_DSN="https://…@sentry.io/…"
```

> The API **refuses to start** in production if the JWT secrets are still the development
> defaults. Generate real ones with `openssl rand -base64 48`.

Run under PM2 in cluster mode:

```bash
pm2 start dist/index.js --name islamabad-api -i max --time
pm2 save && pm2 startup
```

`ecosystem.config.cjs` (optional):

```js
module.exports = {
  apps: [{
    name: 'islamabad-api',
    script: 'apps/api/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production' },
  }],
};
```

### Load balancer

Create an ALB on 443 with an ACM certificate, targeting the instances on 4000.

- Health check path: `/api/health`
- Healthy threshold 2, interval 15s, timeout 5s
- Enable stickiness only if you later add server-side sessions (the JWT design does not
  need it)

---

## 5. Web — Vercel

```bash
npm i -g vercel
vercel link
vercel env add API_ORIGIN production          # https://api.islamabadrestaurant.pk
vercel env add NEXT_PUBLIC_SITE_URL production # https://islamabadrestaurant.pk
vercel --prod
```

Project settings:

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Build command | `npm run build -w @islamabad/web` |
| Install command | `npm ci` |
| Output | `apps/web/.next` |
| Node version | 22.x |
| Region | `bom1` (Mumbai — lowest latency to Pakistan) |

`API_ORIGIN` is a **server-only** variable. The browser always calls same-origin
`/api/*`, which `next.config.ts` rewrites to the API. Nothing internal is exposed and
there is no CORS preflight on the hot path.

---

## 6. DNS

| Record | Type | Value |
| --- | --- | --- |
| `islamabadrestaurant.pk` | A / ALIAS | Vercel |
| `www` | CNAME | `cname.vercel-dns.com` |
| `api` | A / ALIAS | ALB DNS name |

---

## 7. Media — S3 + CloudFront

```bash
aws s3 mb s3://islamabad-restaurant-media
aws s3 sync apps/web/public/images s3://islamabad-restaurant-media/images \
  --cache-control "public, max-age=31536000, immutable"
```

Front it with CloudFront and add the distribution domain to `images.remotePatterns` in
`next.config.ts` if you move images off the app origin.

---

## 8. CI/CD — GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run db:push
      - run: npm test
      - run: npm run build
```

CI needs no services — the suite runs against SQLite and the in-process cache.

Deploy on green: Vercel builds automatically from `main`; for the API, add a job that
SSHes to EC2 (or, better, publishes a container to ECR and updates an ECS service).

---

## 9. Monitoring

**Sentry** — set `SENTRY_DSN`, then in `apps/api/src/index.ts`:

```ts
import * as Sentry from '@sentry/node';
if (env.SENTRY_DSN) Sentry.init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1 });
```

**Google Analytics 4** — load only after cookie consent. The consent component emits a
`cookie-consent` event you can listen for.

**CloudWatch alarms worth having:**

| Alarm | Threshold |
| --- | --- |
| ALB 5xx rate | > 1% over 5 min |
| Target response time p95 | > 1 s |
| RDS CPU | > 80% for 10 min |
| RDS free storage | < 10 GB |
| Unhealthy host count | ≥ 1 |

---

## 10. Post-deploy checklist

```bash
curl https://api.islamabadrestaurant.pk/api/health
curl -I https://islamabadrestaurant.pk
curl https://islamabadrestaurant.pk/sitemap.xml
curl https://islamabadrestaurant.pk/robots.txt
```

- [ ] Health check returns `"status": "ok"` with `provider: postgresql`, `driver: redis`
- [ ] JWT secrets are not the defaults
- [ ] Stripe webhook registered at `https://api.…/api/webhooks/stripe`
- [ ] `WEB_ORIGIN` lists every production hostname
- [ ] Place a real Rs. 100 order and refund it
- [ ] Make and cancel a reservation
- [ ] Admin sign-in works; change the seeded passwords
- [ ] Submit the sitemap in Google Search Console
- [ ] Link the Google Business Profile and confirm the `Restaurant` JSON-LD in the
      Rich Results Test
- [ ] Lighthouse ≥ 95 on mobile for `/`, `/menu`, `/order`

---

## 11. Operations

**Backups** — RDS automated backups retain 14 days. Take a manual snapshot before every
schema change:

```bash
aws rds create-db-snapshot --db-instance-identifier islamabad-prod \
  --db-snapshot-identifier pre-release-$(date +%Y%m%d)
```

**Rolling a schema change**

1. Edit `scripts/schema.models.prisma`
2. `npm run db:schema` — regenerates the Prisma schema and both SQL dialects
3. Review the SQL diff in the pull request
4. Snapshot production
5. `npm run db:push` against production
6. Deploy the API, then the web app

Additive changes (new tables, new nullable columns) are safe to apply before the deploy.
Destructive changes need the usual expand/contract dance: deploy code that tolerates both
shapes, migrate, then remove the old column in a later release.

**Scaling** — the API is stateless, so scale horizontally behind the ALB. Sessions live
in the database and the cache is shared, so any instance can serve any request. First
bottleneck in practice will be RDS connections; the pool is capped at 20 per instance.

**Zero-downtime restarts** — `pm2 reload islamabad-api` reloads workers one at a time.
