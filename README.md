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
npm run make-admin -- user@example.com
```

Requirements:
- The user must already exist (registered via `/register`).
- The script only promotes existing users — it does not create them.
- Safe output only (no secrets or password hashes printed).

After promotion, the Admin link appears in the dashboard sidebar.

### Admin Capabilities

| Feature | Description |
|---|---|
| View users | See all registered users with name, email, role, status, account metadata |
| User details | View user profile, content summary, conversations, warning history |
| Ban/Unban | Ban users with a reason; unban them later |
| Warnings | Issue admin warnings with reason and optional note; view warning history |
| Role management | Promote/demote between USER and ADMIN (with self-demotion guard) |
| Conversation review | View any conversation's messages for moderation |
| Audit log | Traceable admin actions (ban, unban, warnings, role changes) |
| Content management | View/delete memories, learning candidates, feedback, web sources |
| Health monitoring | System health check with database counts |

### Warning Acknowledgement

Users see unacknowledged admin warnings as a banner at the top of the dashboard. They can acknowledge warnings, which removes the banner but keeps the warning in their history. The `/dashboard/warnings` page shows the full warning history with acknowledgment status.

### What Admin Cannot See

- Password hashes
- Session tokens
- API keys
- OAuth provider tokens
- Hidden system prompts

### Ban Behavior

When an admin bans a user:
- The user's status changes to `BANNED`
- The user can still log in but sees a ban notice
- Chat API rejects the user with: "Your account is restricted. Contact the administrator."
- Memory creation, learning candidates, and feedback submission are all rejected
- Admin APIs remain blocked unless the user is ADMIN and not banned
- An admin cannot ban themselves

When an admin unbans a user, all functionality is restored.

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

### Vercel Deployment

1. Connect your GitHub repository to Vercel.
2. Go to **Project Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Production PostgreSQL connection string |
| `AUTH_SECRET` | Generate with `npx auth secret` |
| `AUTH_URL` | Your Vercel deployment URL |
| `AI_PROVIDER` | `openai` or `deepseek` |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `SEARCH_PROVIDER` | `tavily` (recommended) or `brave` |
| `TAVILY_API_KEY` | Your Tavily API key |
| `NODE_ENV` | `production` (set automatically by Vercel) |

3. **Important**: In production, `SEARCH_PROVIDER=mock` is blocked — you must use `tavily` or `brave` with a valid API key.
4. Deploy your project.
5. Verify web search works by asking a current-information question.

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
| `SEARCH_PROVIDER` | Search provider (`tavily`, `brave`, or `mock` for dev only) | **Yes in production** | `mock` |
| `TAVILY_API_KEY` | Tavily API key (required if SEARCH_PROVIDER=tavily) | Conditional | — |
| `BRAVE_API_KEY` | Brave Search API key (required if SEARCH_PROVIDER=brave) | Conditional | — |
| `WEB_SEARCH_ENABLED` | Enable web search globally | No | `true` |
| `WEB_SEARCH_MAX_RESULTS` | Max search results per query | No | `5` |
| `WEB_SEARCH_TIMEOUT_MS` | Search API timeout in milliseconds | No | `8000` |

**Note**: `SEARCH_PROVIDER=mock` is only valid for local development. In production (`NODE_ENV=production`), mock is blocked — you must configure a real provider (tavily or brave) with a valid API key.
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
| `/dashboard/warnings` | User warnings history | Yes |
| `/api/me/warnings` | Get own warnings | Yes |
| `/api/me/warnings/[id]/acknowledge` | Acknowledge own warning | Yes |
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
- Admin warnings with user acknowledgment flow (users see own warnings only)
- Web fetch URL validation (8 unsafe schemes blocked, http/https only)
- Content size limits on all inputs (chat 4KB, memory 5KB, corrections 2KB)

## Known Limitations

- Rate limiter is in-memory (not shared across processes)
- No CSP header (omitted to avoid breaking Next.js runtime)
- Mock providers return fake data (use real providers for production)
- Mock web search is blocked in production — must configure Tavily or Brave
- pgvector extension must be enabled on PostgreSQL
- Embedding failure is non-fatal (degrades gracefully)
- Web search uses LLM-based decision engine (falls back to keyword matching if AI unavailable)
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
