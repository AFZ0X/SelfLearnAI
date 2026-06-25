# SelfLearn AI

A self-improving AI assistant platform with long-term memory, web research, continuous learning, user feedback, admin dashboard, and cross-cutting safety hardening.

## Prerequisites

- Node.js 20+ (v25.6.0 installed)
- Docker Desktop (for PostgreSQL + pgvector)
- npm

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your values (or keep defaults for local Docker)

# 3. Start PostgreSQL
docker compose up -d

# 4. Run database migration
npx prisma migrate dev --name init

# 5. Run preflight checks
npm run preflight

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Admin Account

To promote an existing user to ADMIN for local development:

```bash
npm run make-admin user@example.com
```

Requirements:
- The user must already exist (registered via `/register`).
- The script only promotes existing users — it does not create them.
- Safe output only (no secrets or password hashes printed).

After promotion, the Admin link appears in the dashboard sidebar.

## Testing

```bash
# Run unit tests (no database required)
npm test

# Run tests in watch mode
npm run test:watch

# Run full preflight (validate + generate + typecheck + lint + build + test)
npm run preflight
```

Unit tests cover:
- Safety validator (sensitive data detection, input validation, prompt injection detection)
- Redaction utility (secrets, emails, phone, credit card redaction)
- Rate limiter (per-route limits, key isolation, cleanup)
- Sensitivity classifier (SECRET/HIGH/MEDIUM/LOW classification)
- Safety event logger (event formatting, redaction, all event types)

HTTP smoke tests are in `tests/smoke/phase11-smoke-tests.http` (run via VS Code REST Client against a running server).

## Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — |
| `AUTH_SECRET` | NextAuth encryption secret (generate with `npx auth secret`) | Yes | — |
| `AUTH_URL` | Application URL (`http://localhost:3000`) | Yes | — |
| `AI_PROVIDER` | AI provider (`mock`, `openai`, or `deepseek`) | No | `mock` |
| `OPENAI_API_KEY` | OpenAI API key (required if AI_PROVIDER=openai) | Conditional | — |
| `OPENAI_MODEL` | OpenAI model name | No | `gpt-4o-mini` |
| `DEEPSEEK_API_KEY` | DeepSeek API key (required if AI_PROVIDER=deepseek) | Conditional | — |
| `DEEPSEEK_MODEL` | DeepSeek model name | No | `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | DeepSeek API base URL | No | `https://api.deepseek.com` |
| `EMBEDDING_PROVIDER` | Embedding provider (`mock` or `openai`) | No | `mock` |
| `OPENAI_EMBEDDING_MODEL` | OpenAI embedding model | No | `text-embedding-3-small` |
| `SEARCH_PROVIDER` | Search provider (`mock` or `brave`) | No | `mock` |
| `BRAVE_API_KEY` | Brave Search API key (required if SEARCH_PROVIDER=brave) | Conditional | — |
| `NEXT_PUBLIC_APP_NAME` | Application display name | No | `SelfLearn AI` |
| `NEXT_PUBLIC_APP_URL` | Public application URL | No | `http://localhost:3000` |

All providers default to `mock` mode for safe local development without API keys.

### Docker Deployment

```bash
# Start PostgreSQL
docker compose up -d

# Run migrations
npx prisma migrate deploy

# Build and start
npm run build
npm start
```

### Database Migrations

```bash
# Development: create new migration
npx prisma migrate dev --name <migration_name>

# Production: apply pending migrations
npx prisma migrate deploy

# Validate schema
npx prisma validate
```

## Architecture

### Routes

| Route | Description | Auth Required |
|---|---|---|
| `/` | Landing page | No |
| `/login` | User login | No |
| `/register` | User registration | No |
| `/dashboard` | Protected dashboard | Yes |
| `/dashboard/chat` | Chat interface | Yes |
| `/dashboard/memory` | Memory management | Yes |
| `/dashboard/learning` | Learning pipeline | Yes |
| `/dashboard/feedback` | Feedback history | Yes |
| `/dashboard/admin` | Admin dashboard | ADMIN |
| `/api/health` | Health check | No |
| `/api/auth/[...nextauth]` | NextAuth handlers | No |
| `/api/auth/register` | Registration | No |
| `/api/chat` | Chat with AI + memory + web search | Yes |
| `/api/conversations` | Conversation CRUD | Yes |
| `/api/memories` | Memory CRUD + embeddings | Yes |
| `/api/learning/candidates` | Learning candidates | Yes |
| `/api/learning/settings` | Learning config | Yes |
| `/api/feedback` | Feedback CRUD | Yes |
| `/api/admin/*` | Admin operations | ADMIN |

### Rate Limiting

| Route | Limit | Scope |
|---|---|---|
| `/api/chat` | 30 per minute | Per user |
| `/api/auth/register` | 5 per hour | Per IP |
| `/api/memories` | 60 per minute | Per user |
| `/api/learning/candidates` | 60 per minute | Per user |
| `/api/feedback` | 60 per minute | Per user |
| `/api/admin/*` | 120 per 30 seconds | Per user |

**Note**: Rate limiter is in-memory and does not scale across multiple processes. For multi-instance deployments, replace with Redis or similar.

## Security

- Passwords hashed with bcrypt (12 salt rounds)
- JWT-based sessions with HTTP-only cookies
- Role-based access control (USER / ADMIN)
- Rate limiting on all mutation endpoints
- Sensitive data detection (passwords, API keys, tokens, secrets) blocks storage
- Prompt injection defense: external content wrapped in neutral context blocks
- Security headers via proxy: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Safety event logging with automatic secret redaction
- Admin audit logging for role changes and destructive actions
- Web fetch URL validation (8 unsafe schemes blocked, http/https only)
- Content size limits on all inputs (chat 4KB, memory 5KB, corrections 2KB)

## Known Limitations

- Rate limiter is in-memory (not shared across processes)
- No CSP header (omitted to avoid breaking Next.js runtime)
- Mock providers return fake data (use OpenAI/Brave for real behavior)
- pgvector extension must be enabled on PostgreSQL
- Embedding failure is non-fatal (degrades gracefully)
- Web search uses keyword matching (may miss genuine search needs)
- No fine-tuning or model training capabilities

## Tech Stack

- Next.js 16.2.9 (App Router, Turbopack)
- React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.3.1
- Prisma 7.8.0 (ORM)
- PostgreSQL 18 + pgvector 0.8.3
- NextAuth v5 (Authentication)
- bcryptjs (Password hashing)
- Vitest (Testing)

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth routes (login, register)
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── api/                 # API routes
│   │   ├── admin/           # Admin API (10 endpoints)
│   │   ├── auth/            # Auth API (nextauth, register)
│   │   ├── chat/            # Chat API
│   │   ├── conversations/   # Conversation CRUD
│   │   ├── feedback/        # Feedback CRUD
│   │   ├── learning/        # Learning pipeline
│   │   ├── memories/        # Memory CRUD
│   │   └── health/          # Health check
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── lib/
│   ├── ai/                  # AI, search, embeddings, learning
│   ├── auth/                # NextAuth + admin access
│   ├── db/                  # Prisma queries
│   └── safety/              # Rate limiter, validation, redaction, logging
├── components/              # React components
├── proxy.ts                 # Security headers proxy
└── types/                   # TypeScript types
tests/
├── unit/                    # Vitest unit tests (no DB required)
└── smoke/                   # HTTP smoke test files
```

## Release Checklist

- [ ] `npx prisma validate` — schema valid
- [ ] `npx prisma generate` — client generated
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run lint` — no lint errors
- [ ] `npm run build` — production build succeeds
- [ ] `npm test` — all unit tests pass
- [ ] Environment variables configured in target environment
- [ ] `DATABASE_URL` points to production database
- [ ] `AUTH_SECRET` generated fresh for production
- [ ] `AI_PROVIDER` set to `openai` or `deepseek` with valid key (if using real AI)
- [ ] PostgreSQL + pgvector running and migrated
- [ ] Docker compose or equivalent DB setup in production
- [ ] Rate limit limitations documented for ops team
- [ ] Logging configured (stdout/stderr captured)
- [ ] Security headers verified via browser dev tools
