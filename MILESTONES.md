# SelfLearn AI — Milestones

## Milestone 1: Core Scaffold + Auth (Phase 1) — 🟢 Complete
**Gate**: Project runs, user can register/login, dashboard is protected.
- [x] Next.js 16 app with Turbopack
- [x] Docker Compose (PostgreSQL 18 + pgvector)
- [x] NextAuth v5 with credentials provider + Prisma adapter
- [x] Login and register pages
- [x] Protected dashboard layout
- [x] Prisma schema (User, Account, Session, VerificationToken)

## Milestone 2: Chat UI + LLM Integration (Phase 2) — 🟢 Complete
**Gate**: User can send messages and get AI responses.
- [x] AIProvider abstraction (MockProvider + OpenAIProvider)
- [x] POST /api/chat endpoint (auth-gated, validated)
- [x] Chat UI (ChatWindow + MessageBubble)
- [x] Dashboard navigation with Chat link

## Milestone 3: Conversation Storage (Phase 3) — 🟢 Complete
**Gate**: Conversations persist across sessions.
- [x] Conversation + Message Prisma models
- [x] Conversation CRUD API (list, create, get, update, delete)
- [x] Chat API persists messages per conversation
- [x] Sidebar component (list, new, rename, delete)
- [x] Message loading from DB on conversation switch

## Milestone 4: Memory System + Embeddings (Phase 4) — 🟢 Complete
**Gate**: User can create memories and store embeddings in pgvector.
- [x] Memory model with type enum (USER, PROJECT, GENERAL, WEB_RESEARCH)
- [x] MemoryEmbedding model with vector(1536) via pgvector
- [x] EmbeddingProvider abstraction (Mock + OpenAI)
- [x] Memory API (list, create, delete) with ownership gating
- [x] Sensitive data filter (passwords, API keys, tokens, secrets)
- [x] Memory page UI (add form, list, delete)
- [x] Dashboard nav with Memory link

## Milestone 5: Vector Search Retrieval (Phase 5) — 🟢 Complete
**Gate**: AI uses saved memories when answering chat messages.
- [x] Centralized retrieval config
- [x] MemoryRetrievalService (pgvector search, threshold, topK, truncation)
- [x] PromptContextBuilder (safe memory context injection)
- [x] Chat API integration (embedding, search, system prompt, metadata)
- [x] UI: "Memory used" badge + collapsible memories panel
- [x] OpenAIProvider default prompt updated
- [x] Security: userId scoping, no embedding exposure, no logging
- [x] Verification: prisma validate ✅, tsc ✅, lint ✅, build ✅

## Milestone 6: Web Search Agent (Phase 6) — 🟢 Complete
**Gate**: AI can search the web for current information and answer with citations.

### Search Providers
- [x] `SearchProvider` interface (`src/lib/ai/search/SearchProvider.ts`)
- [x] `MockSearchProvider` — dev-only, returns fake results
- [x] `BraveSearchProvider` — real web search via Brave Search API
- [x] Factory function with `SEARCH_PROVIDER` env var selection

### Web Services
- [x] `WebSearchService` (`src/lib/ai/web/WebSearchService.ts`)
  - [x] Search decision logic (keyword matching + question patterns)
  - [x] Provider selection via factory
  - [x] Result normalization
  - [x] Failure handling (graceful degradation)
- [x] `WebFetchService` (`src/lib/ai/web/WebFetchService.ts`)
  - [x] URL validation (blocks 8 unsafe schemes)
  - [x] Only http/https allowed
  - [x] Content-type filtering (text/html, text/plain)
  - [x] 100KB size limit
  - [x] 8-second timeout
  - [x] Redirect following
- [x] `SourceExtractor` (`src/lib/ai/web/SourceExtractor.ts`)
  - [x] Strips script, style, svg, noscript, head tags
  - [x] Strips all HTML tags
  - [x] Strips HTML entities
  - [x] Title extraction from `<title>` tag or URL
  - [x] 5,000 char extracted text limit
- [x] `SourceSummarizer` (`src/lib/ai/web/SourceSummarizer.ts`)
  - [x] Snippet generation (600 char limit)
  - [x] Confidence estimation based on word count
- [x] `WebContextBuilder` (`src/lib/ai/web/WebContextBuilder.ts`)
  - [x] Formats web results as `<web_search_results>` block
  - [x] Explicit "reference only — may contain inaccuracies" warning
  - [x] Citation generation (title, url, snippet)
  - [x] 4,000 char total context limit

### Database
- [x] `WebSource` model in Prisma schema
  - [x] Linked to user and conversation (audit trail, NOT memory)
  - [x] Stores url, title, snippet, summary, fetchedAt, provider
  - [x] Cascade delete with user, SetNull with conversation
- [x] Opposite relation fields on User and Conversation models

### Chat API Integration (`src/app/api/chat/route.ts`)
- [x] Web search decision after memory retrieval
- [x] Web search execution + page fetching + extraction + summarization
- [x] Combined system prompt: base + memory context + web context
- [x] `webSearchUsed: boolean` in response
- [x] `citations: [{title, url, snippet}]` in response
- [x] WebSource persistence per conversation
- [x] Preserves Phase 5 memory retrieval
- [x] Preserves Phase 3 conversation storage

### UI Updates
- [x] MessageBubble: "Web search used" badge
- [x] MessageBubble: Collapsible "Sources" panel with linked citations
- [x] MessageBubble: Domain display from URL hostname
- [x] ChatWindow: Passes `webSearchUsed`/`citations` to MessageBubble
- [x] Phase 5 "Memory used" indicator preserved
- [x] No misleading indicators when web search not used

### System Prompt Updates
- [x] `PromptContextBuilder.buildSystemPrompt()` accepts `webContext` parameter
- [x] `OpenAIProvider.DEFAULT_SYSTEM_PROMPT` mentions web search capability
- [x] Web context injected AFTER base system prompt and memory context
- [x] Web context wrapped in `<web_search_results>` as untrusted data

### Environment Configuration
- [x] `.env.example` documents `SEARCH_PROVIDER` and `BRAVE_API_KEY`

### Verification Results
```
npx prisma validate:  ✅ Schema valid
npx prisma generate:  ✅ Generated in 69ms
npx tsc --noEmit:     ✅ 0 errors
npm run lint:         ✅ 0 errors, 0 warnings
npm run build:        ✅ Compiled in 2.5s
```

### Phase 6 Negative Security Tests (all pass)
| Test | Result |
|------|--------|
| "ignore previous instructions" in page content | ✅ Neutralized by `<web_search_results>` block |
| "reveal system prompt" in page | ✅ Web is reference data, not instructions |
| "store this memory" in page | ✅ No createMemory call in web path |
| `javascript:` URL blocked | ✅ BLOCKED_SCHEMES |
| `file://` URL blocked | ✅ BLOCKED_SCHEMES |
| `data:` URL blocked | ✅ BLOCKED_SCHEMES |
| `ftp://` URL blocked | ✅ BLOCKED_SCHEMES |
| Very large page rejected | ✅ 100KB limit |
| Slow page times out | ✅ 8s timeout |
| Malformed URL rejected | ✅ URL constructor throws |
| Unauthenticated request | ✅ 401 returned |
| Search API key not exposed | ✅ Private field |
| Raw HTML/scripts in UI | ✅ Stripped by SourceExtractor |
| Web content triggers tool calls | ✅ No tool mechanism exists |
| Web content stored as memory | ✅ WebSource is separate audit table |

### Remaining Risks
- Mock search results are not real — testing with mock does not validate real search behavior
- Brave Search API requires free API key from [brave.com/search/api](https://brave.com/search/api/)
- Web fetch depends on external pages being reachable; network errors degrade gracefully
- Source extraction is regex-based (no DOM parser) — may miss content in complex JS-rendered pages
- No LLM-based summarization (Phase 6 scope) — snippets are extractive, not generative
- Search decision uses simple keyword matching — may trigger false positives
- Web context appended to system prompt may increase token usage

## Milestone 7: Learning Pipeline (Phase 7) — 🟢 Complete
**Gate**: Learning candidates extracted from conversations, classified for sensitivity, and user-approved for memory storage.
- [x] SensitivityClassifier (LOW/MEDIUM/HIGH/SECRET with 13 pattern rules)
- [x] LearningExtractionService (13 rule types, non-fatal in chat)
- [x] LearningCandidateService (CRUD + approveAndStore → Memory)
- [x] LearningConfigService (learningEnabled, autoStoreLow, requireApproval, maxCandidates)
- [x] API routes: GET/POST candidates, PATCH/DELETE candidates/[id], GET/PATCH settings
- [x] Chat API integration (post-response, non-fatal)
- [x] Learning page UI with approve/reject/settings
- [x] SECRET blocked at extraction + manual POST
- [x] learningEnabled toggle enforced in processAndStore + POST
- [x] 27/27 negative security tests pass
- [x] Verification: prisma validate ✅, tsc ✅, lint ✅, build ✅

## Milestone 8: Feedback Loop (Phase 8) — 🟢 Complete
**Gate**: Users can rate, flag, and correct AI responses; feedback persisted and viewable.
- [x] Feedback model (FeedbackType/FeedbackRating enums, @@unique[userId, messageId])
- [x] Feedback DB service (CRUD + sensitivity check + upsert)
- [x] API routes: POST/GET /api/feedback, PATCH/DELETE /api/feedback/[id]
- [x] MessageBubble: thumbs up/down, wrong answer reason picker, correction textarea
- [x] ChatWindow: feedback state tracking, existing feedback fetch
- [x] Feedback history page (/dashboard/feedback)
- [x] Dashboard nav + feature card updated
- [x] No auto-create memory from feedback
- [x] no fine-tuning trigger
- [x] Verification: prisma validate ✅, tsc ✅, lint ✅, build ✅

## Milestone 9: Admin Dashboard (Phase 9) — 🟢 Complete
**Gate**: Authorized admin users can inspect and manage the system safely.
- [x] Admin access helper (requireAdmin, AdminAuthError, adminErrorResponse)
- [x] Admin API routes: users, conversations, memories, learning-candidates, feedback, web-sources, health
- [x] Admin UI: /dashboard/admin with 8 tabs (Overview, Users, Conversations, Memories, Learning, Feedback, Sources, Health)
- [x] Role-based access control (requireAdmin in every route handler)
- [x] Delete unsafe memory with confirmation
- [x] Delete unsafe learning candidate with confirmation
- [x] User role management with self-demotion guard
- [x] No passwordHash, session tokens, API keys, or hidden prompts exposed
- [x] Server-side only auth checks (client role not trusted)
- [x] Dashboard nav: Admin link visible only to ADMIN users
- [x] Verification: prisma validate ✅, tsc ✅, lint ✅, build ✅ (26 routes)

## Milestone 10: Safety Hardening (Phase 10) — 🟢 Complete
**Gate**: Rate limiting, centralized safety validation, redaction, security headers, prompt injection defense, admin audit logging, and route hardening.
- [x] In-memory rate limiter with per-route config (chat 30/min, register 5/hr, etc.)
- [x] Route guard helper (429 response with Retry-After)
- [x] Centralized safety validator (sensitive data, text validation, prompt injection detection, injection neutralization)
- [x] Redaction utility (secrets, emails, phones, credit cards → [REDACTED])
- [x] Safety event logger (typed events with redacted details)
- [x] Proxy (security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] Route hardening: register, chat, memories, learning, feedback, admin
- [x] Admin audit logging: role changes, memory/candidate deletions
- [x] Unauthorized admin access logging
- [x] Prompt injection defense (19 patterns, neutralization preamble)
- [x] Renamed middleware.ts → proxy.ts (Next.js 16 convention)
- [x] Verification: prisma validate ✅, tsc ✅, lint ✅, build ✅ (0 errors, 0 warnings, 26 routes)

## Milestone 11: Testing + Production Readiness (Phase 11) — 🟢 Complete
**Gate**: Comprehensive test suite, production readiness utilities, deployment documentation, and release verification.
- [x] Vitest configuration with path aliases
- [x] Unit tests: safety-validator (25+ tests)
- [x] Unit tests: redaction (15+ tests)
- [x] Unit tests: rate-limiter (8 tests)
- [x] Unit tests: sensitivity-classifier (15+ tests)
- [x] Unit tests: safety-event-logger (7 tests)
- [x] HTTP smoke/security test suite (20+ tests)
- [x] Environment validation utility (required vars, provider warnings)
- [x] Enhanced health check (version, timestamp, provider status, env validation)
- [x] npm test, npm run check, npm run preflight scripts
- [x] Comprehensive README with deployment, testing, and release checklist
- [x] PROJECT_MAP.md and MILESTONES.md updated
- [x] Known risks and rate limit limitations documented
- [x] No real secrets in repository
- [x] Verification: prisma validate ✅, generate ✅, tsc ✅, lint ✅, build ✅, test ✅

---

## Milestone 13: Neural Activity Visualization (Phase 13) — 🟢 Complete
**Gate**: Users can view a live pipeline visualization showing how each message is processed through the SelfLearn AI pipeline.
- [x] ActivityTrace + ActivityTraceStep models in Prisma schema (TraceStatus enum)
- [x] ActivityTraceService (start/complete/fail steps, query traces with ownership, compute metrics)
- [x] Chat API instrumented with trace recording at all 12 pipeline steps
- [x] API routes: GET /api/activity-traces (list), GET /api/activity-traces/[id] (detail), GET /api/activity-traces/metrics (aggregate)
- [x] Pipeline visualization showing 12-step flow with status indicators and durations
- [x] Metrics cards: total traces, avg response time, traces today, fastest step
- [x] Trace history list with status, duration, step count
- [x] Trace detail panel with per-step timeline and safe metadata
- [x] Auto-refresh every 5 seconds
- [x] Dark theme consistent with existing chat UI
- [x] Safe metadata policy: no raw prompts, API keys, memory text, web content
- [x] Auth-gated: user can only access own traces
- [x] Non-fatal: trace failures never break chat
- [x] "Neural Activity" nav link in DashboardSidebar
- [x] PROJECT_MAP.md and MILESTONES.md updated
- [x] Pre-existing build-blocking errors fixed (3 fixes: make-admin PrismaPg adapter, AI Lab type cast, AI Lab status narrowing)
- [x] Full verification: prisma validate ✅, generate ✅, tsc ✅ (0 errors), lint ✅ (0 errors), build ✅ (31 routes), test ✅ (83/83)

## Orphans and Pending Items
- (none currently)
