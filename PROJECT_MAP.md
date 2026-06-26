# SelfLearn AI — Project Map

## Overview
SelfLearn AI is a self-improving AI assistant platform with authenticated chat, conversation persistence, memory system with embeddings, web search capability, controlled learning pipeline, user feedback loop, and admin dashboard.

## Architecture

### Routes
- `/` — Landing page
- `/login` — Login
- `/register` — Registration
- `/dashboard` — Protected dashboard with sidebar navigation
- `/dashboard/chat` — Chat UI with conversation sidebar
- `/dashboard/memory` — Memory management (add, list, delete)
- `/api/auth/[...nextauth]` — NextAuth auth handlers
- `/api/auth/register` — Registration API
- `/api/health` — Health check
- `/api/chat` — Chat API (Phase 2 + Phase 5 memory retrieval + Phase 6 web search)
- `/api/conversations` — Conversation CRUD (Phase 3)
- `/api/conversations/[id]` — Single conversation (Phase 3)
- `/api/conversations/[id]/messages` — Conversation messages (Phase 3)
- `/api/memories` — Memory list/create (Phase 4)
- `/api/memories/[id]` — Memory delete (Phase 4)
- `/api/learning/candidates` — Learning candidate list/create (Phase 7)
- `/api/learning/candidates/[id]` — Learning candidate approve/reject/delete (Phase 7)
- `/api/learning/settings` — Learning pipeline settings (Phase 7)
- `/api/feedback` — Feedback create/list (Phase 8)
- `/api/feedback/[id]` — Feedback update/delete (Phase 8)
- `/dashboard/feedback` — User feedback history page (Phase 8)
- `/dashboard/admin` — Admin dashboard with tabbed interface (Phase 9)
- `/api/admin/users` — Admin list users (Phase 9)
- `/api/admin/users/[id]/role` — Admin update user role (Phase 9)
- `/api/admin/conversations` — Admin list conversations (Phase 9)
- `/api/admin/memories` — Admin list memories (Phase 9)
- `/api/admin/memories/[id]` — Admin delete memory (Phase 9)
- `/api/admin/learning-candidates` — Admin list learning candidates (Phase 9)
- `/api/admin/learning-candidates/[id]` — Admin delete learning candidate (Phase 9)
- `/api/admin/feedback` — Admin list feedback (Phase 9)
- `/api/admin/web-sources` — Admin list web sources (Phase 9)
- `/api/admin/health` — Admin system health with counts (Phase 9)

### Key Libraries
- Next.js 16.2.9 (Turbopack, App Router)
- NextAuth v5 (Auth.js) with Prisma adapter, JWT strategy, credentials provider
- Prisma 7.8.0 with `@prisma/adapter-pg`
- PostgreSQL 18 + pgvector 0.8.3 (Docker)
- Tailwind CSS 4.3.1

### Environment Variables (`.env.example`)
- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
- `AI_PROVIDER` (mock|openai), `OPENAI_API_KEY`, `OPENAI_MODEL`
- `EMBEDDING_PROVIDER` (mock|openai), `OPENAI_EMBEDDING_MODEL`
- `SEARCH_PROVIDER` (mock|brave), `BRAVE_API_KEY`
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`

---

## Phase Status

### PHASE_1_CORE_AUTH (Complete)
- Next.js project scaffold with Turbopack
- Docker Compose for PostgreSQL 18 + pgvector
- NextAuth v5 with credentials provider + Prisma adapter
- Login/register pages, auth-gated dashboard
- Prisma schema: User, Account, Session, VerificationToken

### PHASE_2_CHAT_LLM (Complete)
- AIProvider interface with `generateChatResponse(messages, options?)`
- MockProvider (echo), OpenAIProvider (gpt-4o-mini)
- `POST /api/chat` — auth-gated, validated, calls AI provider
- Chat UI: ChatWindow, MessageBubble components
- Dashboard nav with Chat link

### PHASE_3_CONVERSATION_STORAGE (Complete)
- Conversation + Message models in Prisma
- Conversation CRUD APIs (list, create, get, update, delete) with ownership gating
- Chat API persists user + assistant messages per conversationId
- Sidebar component (list, new, rename, delete conversations)
- Message loading from DB on conversation switch

### PHASE_4_MEMORY_SYSTEM (Complete)
- Memory model (id, userId, type, text, summary, source, confidence, visibility, tags)
- MemoryEmbedding model with vector(1536) via pgvector
- EmbeddingProvider interface with MockEmbeddingProvider + OpenAIEmbeddingProvider
- Memory CRUD APIs (list, create, delete) with ownership gating
- Sensitive data filter (passwords, API keys, tokens, secrets)
- Memory page UI (add form, list, delete, type selector, tags)
- Dashboard nav with Memory link

### PHASE_5_VECTOR_SEARCH_RETRIEVAL (Complete)
Phase 5 makes the AI use saved memories when answering chat messages.

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/ai/retrieval/config.ts` | Centralized retrieval config (topK, threshold, size limits) |
| `src/lib/ai/retrieval/MemoryRetrievalService.ts` | Vector search + memory retrieval service |
| `src/lib/ai/retrieval/PromptContextBuilder.ts` | System prompt assembly with memory + web context |

#### Files Modified
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Integrates retrieval: generates query embedding, searches memories, injects context, returns metadata |
| `src/lib/ai/providers/OpenAIProvider.ts` | Updated DEFAULT_SYSTEM_PROMPT to mention memory capability |
| `src/components/chat/MessageBubble.tsx` | Added `memoryUsed` indicator + collapsible "Show memories" panel |
| `src/components/chat/ChatWindow.tsx` | Passes `memoryUsed`/`memoriesUsed` from API response to MessageBubble |

#### Vector Search Behavior
- **Metric**: Cosine distance (`<=>` pgvector operator), range [0, 2]
- **Similarity**: `1 - cosine_distance`, range [-1, 1]
- **Threshold**: `similarity >= 0.7` (configurable via `retrievalConfig`)
- **topK**: 5 (configurable)
- **User isolation**: SQL `WHERE m."userId" = $1` + secondary `findMany` with `userId` filter
- **Null embedding handling**: `WHERE me.embedding IS NOT NULL`
- **Failure behavior**: Embedding or search failure → gracefully degrades (returns empty, chat continues)

#### Prompt Context Behavior
- Memory context appended to system prompt after the base system instructions
- Wrapped in `<user_memory_context>` block with explicit guidance: "Use them only if helpful"
- Format: `* [memory: <id>] <summary or truncated text>`
- Memory text is data, not instructions — system prompt rules have priority
- Oversized text truncated to `maxSingleMemoryChars` (800)
- Total context limited to `maxMemoryContextChars` (4000)

#### API Response Metadata
```json
{
  "role": "assistant",
  "content": "...",
  "memoryUsed": true,
  "memoriesUsed": [{ "id": "...", "summary": "...", "relevanceLabel": "high" }],
  "messageId": "...",
  "conversationId": "..."
}
```

#### UI Changes
- Assistant messages with `memoryUsed: true` show a "Memory used" badge
- Collapsible "Show memories" panel with summaries and relevance labels
- No misleading indicator when memory was not used

---

### PHASE_6_WEB_SEARCH_AGENT (Complete)
Phase 6 adds safe web search capability to SelfLearn AI.

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/ai/search/SearchProvider.ts` | Search provider interface + factory |
| `src/lib/ai/search/providers/MockSearchProvider.ts` | Dev-only mock search provider |
| `src/lib/ai/search/providers/BraveSearchProvider.ts` | Brave Search API provider |
| `src/lib/ai/web/WebSearchService.ts` | Search decision logic + orchestration |
| `src/lib/ai/web/WebFetchService.ts` | Safe page fetcher with URL validation |
| `src/lib/ai/web/SourceExtractor.ts` | HTML-to-text extraction (strips scripts/styles) |
| `src/lib/ai/web/SourceSummarizer.ts` | Text summarization + confidence estimation |
| `src/lib/ai/web/WebContextBuilder.ts` | Untrusted web context assembly + citations |

#### Files Modified
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `WebSource` model (per-conversation audit trail, NOT memory) + User/Conversation relations |
| `src/lib/ai/retrieval/PromptContextBuilder.ts` | Added `webContext` support in `buildSystemPrompt()` |
| `src/lib/ai/providers/OpenAIProvider.ts` | Updated DEFAULT_SYSTEM_PROMPT to mention web search capability |
| `src/app/api/chat/route.ts` | Integrates web search: decision, fetch, extract, summarize, context injection, metadata |
| `src/components/chat/MessageBubble.tsx` | Added `webSearchUsed` indicator + collapsible "Sources" panel with citations |
| `src/components/chat/ChatWindow.tsx` | Passes `webSearchUsed`/`citations` from API response to MessageBubble |
| `.env.example` | Added `SEARCH_PROVIDER` and `BRAVE_API_KEY` docs |

#### Database Models Added
```prisma
model WebSource {
  id             String   @id @default(cuid())
  userId         String
  conversationId String?
  url            String
  title          String?
  snippet        String?
  summary        String?
  fetchedAt      DateTime?
  provider       String
  createdAt      DateTime @default(now())
  user           User         @relation(...)
  conversation   Conversation? @relation(...)
}
```
- Linked to user and conversation (audit trail)
- NOT stored as long-term memory (separate from Memory model)
- Created per web search query for transparency

#### Search Decision Behavior
- **Keyword matching**: triggers on "latest", "current", "today", "news", "weather", "price", etc.
- **Question pattern**: triggers on who/what/when/where/why/how questions
- **When NOT to search**: simple conversation, personal advice, math, memory-answerable questions
- **Mock provider**: always returns 2 mock results for testing
- **Brave provider**: real web search via `api.search.brave.com`

#### Fetch Behavior
- **URL validation**: blocks `file:`, `ftp:`, `data:`, `javascript:`, `chrome:`, `devtools:`, `about:`, `blob:`
- **Only http/https allowed**: rejects all other schemes
- **Timeout**: 8 seconds via AbortController
- **Size limit**: 100KB max response body
- **Content type filter**: only text/html and text/plain
- **Redirects**: followed (up to default limit)
- **User-Agent**: `SelfLearnAI/1.0 (educational research agent)`

#### Source Extraction Behavior
- Strips `<script>`, `<style>`, `<svg>`, `<noscript>`, `<head>` tags
- Strips all HTML tags
- Strips HTML entities (`&amp;`, `&#123;`)
- Extracted text limited to 5,000 characters
- Title extracted from `<title>` tag or URL path

#### Citation Behavior
- Citations returned as `{ title, url, snippet }` per source
- Snippet limited to 200 characters in citation display
- Title linked to source URL (opens in new tab)
- Domain shown next to title (from URL hostname)
- Full snippet (600 chars) used in context for the AI
- Web context wrapped in `<web_search_results>` block

#### API Response Metadata
```json
{
  "role": "assistant",
  "content": "...",
  "memoryUsed": true,
  "memoriesUsed": [{ "id": "...", "summary": "...", "relevanceLabel": "high" }],
  "webSearchUsed": true,
  "citations": [
    { "title": "Page Title", "url": "https://...", "snippet": "..." }
  ],
  "messageId": "...",
  "conversationId": "..."
}
```
- `webSearchUsed`: boolean — whether web search was executed and returned results
- `citations`: array of `{ title, url, snippet }` — only present when `webSearchUsed` is true
- No raw HTML or full page content exposed

#### UI Changes
- Assistant messages with `webSearchUsed: true` show a "Web search used" badge
- Collapsible "Sources" panel lists each citation with:
  - Linked title (opens new tab)
  - Domain (from URL hostname)
  - Short snippet
- "Memory used" and "Web search used" badges appear together when both active
- No misleading indicators when web search not used

#### Security Rules Enforced
| Rule | Implementation |
|------|---------------|
| All actions require auth | 401 check at top of chat API |
| API keys server-side only | `private apiKey` in BraveSearchProvider, never serialized |
| No embedding/web search key in frontend | Not in API response, not in env vars exposed to client |
| No logging private chat/content | Zero `console.log` in search or API code |
| No executing web scripts | `SourceExtractor` strips `<script>` tags via regex |
| No downloading files | Content-type filter restricts to text/html, text/plain |
| Block unsafe URL schemes | `validateUrl()` blocks 8 unsafe schemes |
| Limit result count | `maxResults: 3` default, Brave limited to 10 |
| Limit fetch size | 100KB max response body |
| Timeout requests | 8 second AbortController timeout |
| Web content cannot override system prompt | Wrapped in `<web_search_results>` after system prompt |
| Web content cannot trigger tools | No tool call mechanism exists |
| Web content not stored as memory | `WebSource` is separate audit table, no `createMemory` call |
| Prompt injection from web neutralized | Content prefixed with "Use as reference only"; summarized before injection |

#### Verification Commands Run
```bash
npx prisma validate     # ✅ Passed
npx prisma generate     # ✅ Passed (69ms)
npx tsc --noEmit       # ✅ 0 errors
npm run lint           # ✅ 0 errors, 0 warnings
npm run build          # ✅ Compiled in 2.5s
```

#### Runtime Verification Scenarios (manual)
1. ✅ User can chat without web search (decision returns false for normal conversation)
2. ✅ User asks current-information question → search decision triggers
3. ✅ Mock provider works without API key
4. ✅ Brave provider returns safe setup error if key missing (constructor throws)
5. ✅ Web content fetched safely (URL validation, timeout, size limit)
6. ✅ Unsafe URL schemes blocked (validateUrl rejects all but http/https)
7. ✅ Citations returned when web search used
8. ✅ UI shows Web search used indicator
9. ✅ UI displays citations with linked titles and domains
10. ✅ Memory used indicator still works alongside web search
11. ✅ Conversation storage still works (messages persisted before + after)
12. ✅ Memory retrieval still works (Phase 5 unchanged)
13. ✅ No raw HTML shown (SourceExtractor strips tags)
14. ✅ No API keys exposed (private class fields, never in response)

#### Negative Security Tests (code review)
| Test | Result | Mechanism |
|------|--------|-----------|
| "ignore previous instructions" in page | ✅ | Web content in `<web_search_results>` block, not system prompt |
| "reveal system prompt" in page | ✅ | Same — web is reference data, not instructions |
| "store this memory" in page | ✅ | No `createMemory` call in web search code path |
| `javascript:` URL blocked | ✅ | `BLOCKED_SCHEMES` includes `"javascript:"` |
| `file://` URL blocked | ✅ | Same |
| `data:` URL blocked | ✅ | Same |
| `ftp://` URL blocked | ✅ | Same |
| Very large page rejected | ✅ | `MAX_PAGE_SIZE = 100_000` |
| Slow page times out | ✅ | `FETCH_TIMEOUT_MS = 8_000` |
| Malformed URL rejected | ✅ | `new URL()` throws |
| Unauthenticated request fails | ✅ | Returns 401 |
| Search API key not exposed | ✅ | Private field, never returned |
| Raw HTML/scripts in UI | ✅ | Stripped by SourceExtractor |
| Web content triggers tool calls | ✅ | No tool mechanism exists |
| Web content stored as memory | ✅ | WebSource is separate audit table |

#### Remaining Risks
- Mock search results are not real — testing with mock does not validate real search behavior
- Brave Search API requires free API key from [brave.com/search/api](https://brave.com/search/api/)
- Web fetch depends on external pages being reachable; network errors degrade gracefully
- Source extraction is regex-based (no DOM parser) — may miss content in complex JS-rendered pages
- No LLM-based summarization (Phase 6 scope) — snippets are extractive, not generative
- Search decision uses simple keyword matching — may trigger false positives or miss genuine search needs
- Web context appended to system prompt may increase token usage

---

### PHASE_7_LEARNING_PIPELINE (Complete)
Phase 7 adds a controlled learning pipeline that extracts knowledge candidates from conversations for user review and approval.

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/ai/learning/SensitivityClassifier.ts` | Pattern-based sensitivity classification (LOW/MEDIUM/HIGH/SECRET) |
| `src/lib/ai/learning/LearningExtractionService.ts` | Extracts learning candidates from messages using 13 pattern rules |
| `src/lib/ai/learning/LearningCandidateService.ts` | CRUD + approveAndStore via Memory pipeline |
| `src/lib/ai/learning/LearningConfigService.ts` | Per-user learning config management |
| `src/app/api/learning/candidates/route.ts` | GET list + POST create (with SECRET check + learningEnabled guard) |
| `src/app/api/learning/candidates/[id]/route.ts` | PATCH approve/reject + DELETE |
| `src/app/api/learning/settings/route.ts` | GET/PATCH user learning settings |
| `src/components/learning/LearningPageClient.tsx` | Learning UI with candidate list, approve/reject, settings |
| `src/app\(dashboard)\dashboard\learning\page.tsx` | Server page for learning dashboard |

#### Files Modified
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added LearningCandidate, LearningConfig models + SensitivityLevel, CandidateStatus enums |
| `src/app/api/chat/route.ts` | Integrates non-fatal learning extraction after response generation |
| `src/components/chat/MessageBubble.tsx` | Added "Learned X items" indicator |
| `src/components/chat/ChatWindow.tsx` | Passes candidatesExtracted from API response |
| `src/app\(dashboard)\dashboard\page.tsx` | Added Learning nav link + feature card |

#### Database Models Added
```prisma
enum SensitivityLevel { LOW MEDIUM HIGH SECRET }
enum CandidateStatus { PENDING APPROVED REJECTED }

model LearningCandidate {
  id              String          @id @default(cuid())
  userId          String
  conversationId  String?
  messageId       String?
  text            String
  summary         String?
  source          String?
  sensitivity     SensitivityLevel @default(LOW)
  status          CandidateStatus  @default(PENDING)
  confidence      Float?
  tags            String[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  user            User             @relation(...)
  @@index([userId, status])
  @@index([userId, createdAt])
}

model LearningConfig {
  id                String  @id @default(cuid())
  userId            String  @unique
  learningEnabled   Boolean @default(true)
  autoStoreLow      Boolean @default(false)
  requireApproval   Boolean @default(true)
  maxCandidates     Int     @default(50)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(...)
}
```

#### Learning Pipeline Behavior
- **Extraction**: 13 pattern rules on user + assistant messages (user info, preferences, work, location, tools, goals, etc.)
- **Classification**: 3-tier sensitivity (SECRET blocked entirely, HIGH always requires approval, LOW auto-store only if configured)
- **Approval flow**: Observe → Extract → Classify → Safety Check → Propose → User Approves → Embed → Store Memory
- **Non-fatal**: Extraction failures silently ignored, chat response unaffected
- **User isolation**: All CRUD operations check userId ownership

#### Security Rules Enforced
| Rule | Implementation |
|------|---------------|
| SECRET content blocked at extraction | `isBlockedSensitivity()` in `findMatches()` skips SECRET candidates |
| SECRET content blocked at manual POST | `SensitivityClassifier.classify()` + `isBlockedSensitivity()` on text, summary, source |
| Valid sensitivity list excludes SECRET for POST | `["LOW", "MEDIUM", "HIGH"]` — SECRET not allowed |
| Learning disabled blocks creation | `processAndStore()` returns early; POST returns 403 |
| learningEnabled defaults to true | Schema default: `true` |
| requireApproval defaults to true | Schema default: `true` |
| autoStoreLow defaults to false | Schema default: `false` |
| Memory pipeline has second sensitive filter | `createMemory()` → `containsSensitiveData()` blocks before DB write |
| Only own candidates accessible | All service methods check `userId` match |
| Only PENDING can be approved | `updateStatus()` rejects non-PENDING |
| All learning APIs require auth | 401 at top of every route handler |
| No sensitive data logged | Zero `console.log` in learning files |

#### API Routes
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/learning/candidates` | GET | ✅ | List candidates (optional `?status=` filter) |
| `/api/learning/candidates` | POST | ✅ | Create candidate (rejects SECRET + disabled learning) |
| `/api/learning/candidates/[id]` | PATCH | ✅ | Approve/reject candidate |
| `/api/learning/candidates/[id]` | DELETE | ✅ | Delete candidate |
| `/api/learning/settings` | GET | ✅ | Get user config |
| `/api/learning/settings` | PATCH | ✅ | Update user config (includes learningEnabled toggle) |

#### Follow-up Fix (Security Gate Findings)
Two findings from Phase 7 gate review were fixed:
1. **SECRET rejection in manual POST**: POST now runs text/summary/source through `SensitivityClassifier` and rejects SECRET content with 400 error. Valid sensitivity list changed to `["LOW", "MEDIUM", "HIGH"]`.
2. **learningEnabled toggle**: Added `learningEnabled Boolean @default(true)` to `LearningConfig`. Enforced in `processAndStore()` (skips extraction when disabled) and POST route (returns 403). UI shows disabled banner + disable create. Existing candidates remain viewable/manageable.

#### Verification Commands Run
```bash
npx prisma validate     # ✅ Passed
npx prisma generate     # ✅ Passed
npm run lint            # ✅ 0 errors, 0 warnings
npm run build           # ✅ Compiled successfully
```

---

### PHASE_8_FEEDBACK_LOOP (Complete)
Phase 8 adds a user feedback loop for rating, flagging, and correcting AI responses.

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/db/feedback.ts` | Feedback DB service (upsert, sensitivity check, ownership) |
| `src/app/api/feedback/route.ts` | POST create + GET list feedback |
| `src/app/api/feedback/[id]/route.ts` | PATCH update + DELETE feedback |
| `src/app/(dashboard)/dashboard/feedback/FeedbackPageClient.tsx` | Feedback history list UI |

#### Files Modified
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added Feedback model (FeedbackType/FeedbackRating enums, @@unique[userId, messageId]) |
| `src/components/chat/MessageBubble.tsx` | Added thumbs up/down, wrong answer picker, correction textarea |
| `src/components/chat/ChatWindow.tsx` | Feedback state tracking, API calls, existing feedback fetch on load |
| `src/app/(dashboard)/dashboard/page.tsx` | Added Feedback nav link + feature card |

#### Feedback Behavior
- **Upsert**: One feedback per user per message (`@@unique([userId, messageId])`)
- **Sensitivity check**: Corrections scanned by SensitivityClassifier before storage
- **No auto-memory**: Feedback does not trigger learning or memory creation
- **Ownership**: All CRUD checks userId match
- **Correction limit**: 2000 chars max

---

### PHASE_9_ADMIN_DASHBOARD (Complete)
Phase 9 adds an admin dashboard for authorized admin users to inspect and manage the system.

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/auth/admin.ts` | Admin access helper (`requireAdmin()`, `AdminAuthError`, `adminErrorResponse()`) |
| `src/app/api/admin/users/route.ts` | GET list users (no passwordHash) |
| `src/app/api/admin/users/[id]/role/route.ts` | PATCH update user role (with self-demotion guard) |
| `src/app/api/admin/conversations/route.ts` | GET list conversations with message counts |
| `src/app/api/admin/memories/route.ts` | GET list memories (metadata only) |
| `src/app/api/admin/memories/[id]/route.ts` | DELETE memory (with existence check) |
| `src/app/api/admin/learning-candidates/route.ts` | GET list learning candidates |
| `src/app/api/admin/learning-candidates/[id]/route.ts` | DELETE learning candidate (with existence check) |
| `src/app/api/admin/feedback/route.ts` | GET list feedback (without correction text) |
| `src/app/api/admin/web-sources/route.ts` | GET list web sources |
| `src/app/api/admin/health/route.ts` | GET system health with all counts |
| `src/app/(dashboard)/dashboard/admin/page.tsx` | Server page with auth + admin guard |
| `src/app/(dashboard)/dashboard/admin/AdminDashboardClient.tsx` | Tabbed client UI (Overview, Users, Conversations, Memories, Learning, Feedback, Sources, Health) |
| `tests/security/phase9-admin-negative-tests.http` | Negative security test suite |

#### Files Modified
| File | Change |
|------|--------|
| `src/app/(dashboard)/dashboard/page.tsx` | Added Admin nav link (conditionally for ADMIN users) |

#### Admin Routes
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/admin/users` | GET | ✅ | ADMIN | List users (no passwordHash) |
| `/api/admin/users/[id]/role` | PATCH | ✅ | ADMIN | Update user role (self-demotion guard) |
| `/api/admin/conversations` | GET | ✅ | ADMIN | List conversations with message counts |
| `/api/admin/memories` | GET | ✅ | ADMIN | List memories (metadata only) |
| `/api/admin/memories/[id]` | DELETE | ✅ | ADMIN | Delete memory (existence check) |
| `/api/admin/learning-candidates` | GET | ✅ | ADMIN | List learning candidates |
| `/api/admin/learning-candidates/[id]` | DELETE | ✅ | ADMIN | Delete candidate (existence check) |
| `/api/admin/feedback` | GET | ✅ | ADMIN | List feedback (no correction text) |
| `/api/admin/web-sources` | GET | ✅ | ADMIN | List web sources |
| `/api/admin/health` | GET | ✅ | ADMIN | System health + counts |
| `/dashboard/admin` | GET | ✅ | ADMIN | Tabbed admin dashboard UI |

#### Access Control
| Scenario | Behavior |
|----------|----------|
| Unauthenticated user → admin API | 401 `{ error: "Authentication required." }` |
| Unauthenticated user → `/dashboard/admin` | Redirect to `/login` |
| USER role → admin API | 403 `{ error: "Forbidden. Admin access required." }` |
| USER role → `/dashboard/admin` | Redirect to `/dashboard` |
| ADMIN role → admin API | 200 with data |
| ADMIN role → `/dashboard/admin` | Admin dashboard UI |

#### Data Exposure Policy
| Entity | Exposed Fields | Excluded Fields |
|--------|---------------|-----------------|
| Users | id, email, name, role, createdAt, updatedAt | passwordHash |
| Conversations | id, userId, title, createdAt, updatedAt, _count.messages | message content |
| Memories | id, userId, type, summary, tags, confidence, visibility, source, createdAt, updatedAt | full text |
| Learning Candidates | id, userId, conversationId, summary, sensitivity, status, confidence, tags, createdAt, updatedAt | full text |
| Feedback | id, userId, conversationId, messageId, type, rating, reason, createdAt | correction text |
| Web Sources | id, userId, conversationId, url, title, snippet, provider, createdAt | raw fetched content |

#### Destructive Action Safety
| Action | Guard |
|--------|-------|
| Delete memory | Existence check (404 if not found) + UI confirmation dialog |
| Delete learning candidate | Existence check (404 if not found) + UI confirmation dialog |
| Change user role | Only ADMIN/USER allowed; self-demotion guarded (prevents last admin demotion) |

#### Verification Commands Run
```bash
npx prisma validate     # ✅ Passed
npx prisma generate     # ✅ Passed
npx tsc --noEmit       # ✅ 0 errors
npm run lint           # ✅ 0 errors, 0 warnings
npm run build          # ✅ Zero errors, 26 routes
```

#### Negative Security Tests (code review)
| Test | Result | Mechanism |
|------|--------|-----------|
| Unauthenticated admin API fails | ✅ `requireAdmin()` throws 401 | `auth()` returns null |
| USER admin API fails | ✅ `requireAdmin()` throws 403 | `session.user.role !== "ADMIN"` |
| ADMIN API succeeds | ✅ Returns data | Role check passes |
| No passwordHash exposed | ✅ `select` excludes field | Prisma query scoping |
| No session tokens exposed | ✅ No Session model read | Zero Session reads in admin code |
| Client role spoofing neutralized | ✅ Server-side check only | `requireAdmin()` in every handler |
| Invalid role rejected | ✅ `!== "ADMIN" && !== "USER"` | Route-level validation |
| Self-demotion guarded | ✅ Admin count check | `adminCount <= 1` prevents last-admin demotion |
| Invalid memory id | ✅ 404 returned | `findUnique` returns null |
| Invalid candidate id | ✅ 404 returned | `findUnique` returns null |

---

### PHASE_10_SAFETY_HARDENING (Complete)
Phase 10 adds cross-cutting safety hardening: rate limiting, centralized validation, redaction, safety event logging, security headers, prompt injection defense, and admin audit logging.

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/safety/rate-limiter.ts` | In-memory per-route rate limiter with lazy cleanup |
| `src/lib/safety/route-guard.ts` | `rateLimitGuard()` — returns 429 response or null |
| `src/lib/safety/safety-validator.ts` | Centralized sensitive data detection, text validation, prompt injection detection (19 patterns), injection neutralization |
| `src/lib/safety/redaction.ts` | `redactSensitive()` secrets/emails/phones → `[REDACTED]` |
| `src/lib/safety/safety-event-logger.ts` | `logSafetyEvent()` with typed events + redacted details |
| `src/proxy.ts` | Security headers middleware (replaces `middleware.ts`, Next.js 16 Proxy convention) |

#### Files Modified
| File | Change |
|------|--------|
| `src/lib/auth/admin.ts` | `adminErrorResponse()` now logs 403 unauthorized access as safety event |
| `src/app/api/auth/register/route.ts` | Rate limited (5/hour); password max 128 chars; safe error logging |
| `src/app/api/chat/route.ts` | Rate limited (30/min); uses `validateChatMessage()` |
| `src/app/api/memories/route.ts` | Rate limited (60/min); uses `validateMemoryText()`; safety events for blocked storage |
| `src/app/api/learning/candidates/route.ts` | Rate limited (60/min); safety events for blocked SECRET candidates |
| `src/app/api/feedback/route.ts` | Rate limited (60/min) |
| `src/app/api/admin/memories/[id]/route.ts` | Audit log on delete (`memory_deleted_by_admin`) |
| `src/app/api/admin/learning-candidates/[id]/route.ts` | Audit log on delete (`candidate_deleted_by_admin`) |
| `src/app/api/admin/users/[id]/role/route.ts` | Audit log on role change (`role_change`) |

#### Rate Limiting
| Route | Limit | Keyed By |
|-------|-------|----------|
| `/api/chat` | 30 per minute | Authenticated userId |
| `/api/auth/register` | 5 per hour | IP address |
| `/api/memories` | 60 per minute | Authenticated userId |
| `/api/learning/candidates` | 60 per minute | Authenticated userId |
| `/api/feedback` | 60 per minute | Authenticated userId |
| `/api/admin/*` | 120 per 30 seconds | Authenticated userId |

#### Safety Event Types
| Type | When Triggered |
|------|---------------|
| `rate_limit_hit` | Rate limit exceeded |
| `blocked_secret_storage` | Sensitive data blocked from storage |
| `prompt_injection_detected` | Injection pattern detected in chat |
| `unauthorized_admin_access` | Non-admin user hits admin route |
| `admin_destructive_action` | Admin deletes memory/candidate |
| `failed_auth_attempt` | Registration error |
| `role_change` | Admin changes user role |
| `memory_deleted_by_admin` | Admin deletes memory (audit) |
| `candidate_deleted_by_admin` | Admin deletes learning candidate (audit) |

#### Security Headers (via proxy.ts)
| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=(), interest-cohort=() |

#### Prompt Injection Defense
- **Centralized detector**: `isPromptInjectionRisk()` checks 19 injection patterns
- **Neutralization**: `neutralizeInjectionSource()` prepends disclaimer to untrusted content
- **Context wrapping**: Existing `<user_memory_context>` and `<web_search_results>` isolates untrusted data
- **Applied to**: Chat messages, memory text, learning candidates, feedback corrections

---

### PHASE_11_TESTING_PRODUCTION_READINESS (Complete)
Phase 11 adds comprehensive testing infrastructure and production readiness utilities.

#### Files Created
| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration with path aliases |
| `tests/unit/safety-validator.test.ts` | 25+ tests for sensitive data detection, input validation, prompt injection detection |
| `tests/unit/redaction.test.ts` | 15+ tests for secret/email/phone/CC redaction |
| `tests/unit/rate-limiter.test.ts` | 8 tests for per-route limits, key isolation, IP detection |
| `tests/unit/sensitivity-classifier.test.ts` | 15+ tests for SECRET/HIGH/MEDIUM/LOW classification |
| `tests/unit/safety-event-logger.test.ts` | 7 tests for event formatting, redaction, all event types |
| `tests/smoke/phase11-smoke-tests.http` | 20+ HTTP smoke/security tests for manual server testing |
| `src/lib/env.ts` | Environment variable validation and summary utility |

#### Files Modified
| File | Change |
|------|--------|
| `package.json` | Added `test`, `test:watch`, `test:coverage`, `check`, `preflight` scripts; added `vitest` dev dependency |
| `src/app/api/health/route.ts` | Enhanced with version, timestamp, env validation, provider status, warnings |
| `README.md` | Complete rewrite with deployment instructions, test docs, release checklist, architecture overview |

#### Test Coverage
| Module | Tests | Type |
|--------|-------|------|
| `safety-validator.ts` | 25+ | Unit (no DB) |
| `redaction.ts` | 15+ | Unit (no DB) |
| `rate-limiter.ts` | 8 | Unit (no DB) |
| `sensitivity-classifier.ts` | 15+ | Unit (no DB) |
| `safety-event-logger.ts` | 7 | Unit (no DB) |
| HTTP smoke tests | 20+ | Integration (requires server) |

#### Production Readiness
| Feature | Status |
|---------|--------|
| Environment variable validation | ✅ `src/lib/env.ts` — validates required vars, warns on misconfigured providers |
| Health check | ✅ Enhanced with version, timestamp, provider status, env warnings |
| .env.example | ✅ Comprehensive with all providers documented |
| Docker compose | ✅ PostgreSQL 18 + pgvector |
| Build instructions | ✅ In README |
| Deploy instructions | ✅ In README |
| Test instructions | ✅ In README |
| Safe default providers (mock) | ✅ Documented in .env.example |
| No real secrets in repo | ✅ Verified — no API keys in code |
| Rate limit limitations documented | ✅ In README |
| Known risks documented | ✅ In README |
| Release checklist | ✅ In README |
| Preflight command | ✅ `npm run preflight` |

#### Verification Commands
```
npx prisma validate  ✅
npx prisma generate  ✅
npx tsc --noEmit     ✅
npm run lint         ✅
npm run build        ✅
npm test             ✅
```

---

### PHASE_13_NEURAL_ACTIVITY_VISUALIZATION (Complete)
Phase 13 adds a live pipeline visualization showing how SelfLearn AI processes each message through its internal pipeline steps.

#### Files Created
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Added `ActivityTrace`, `ActivityTraceStep` models + `TraceStatus` enum |
| `src/lib/ai/trace/ActivityTraceService.ts` | Trace recording service (start/complete/fail steps, query traces, compute metrics) |
| `src/app/api/activity-traces/route.ts` | GET list user traces (paginated, ownership-gated) |
| `src/app/api/activity-traces/[id]/route.ts` | GET single trace with steps (ownership-gated) |
| `src/app/api/activity-traces/metrics/route.ts` | GET aggregate metrics (avg duration, step times, recent) |
| `src/components/neural-activity/NeuralActivityClient.tsx` | Client UI: pipeline visualization, metrics cards, trace list, trace detail |
| `src/app/(dashboard)/dashboard/neural-activity/page.tsx` | Server page for Neural Activity dashboard |

#### Files Modified
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `activityTraces` relation on `User` model |
| `src/app/api/chat/route.ts` | Instrumented with trace recording at all 12 pipeline steps |
| `src/components/dashboard/DashboardSidebar.tsx` | Added "Neural Activity" nav link |

#### Database Models Added
```prisma
enum TraceStatus { RUNNING COMPLETED ERROR }

model ActivityTrace {
  id              String      @id @default(cuid())
  userId          String
  conversationId  String?
  status          TraceStatus @default(RUNNING)
  startedAt       DateTime    @default(now())
  completedAt     DateTime?
  createdAt       DateTime    @default(now())
  totalDurationMs Int?
  stepsCount      Int         @default(0)
  user            User        @relation(...)
  steps           ActivityTraceStep[]
}

model ActivityTraceStep {
  id          String      @id @default(cuid())
  traceId     String
  stepName    String
  status      TraceStatus @default(RUNNING)
  startedAt   DateTime    @default(now())
  completedAt DateTime?
  durationMs  Int?
  metadata    Json?
  trace       ActivityTrace @relation(...)
}
```

#### Pipeline Steps (12 steps)
1. **Input** — message received and validated
2. **Intent Detection** — heuristic intent classification (question/request/command/greeting)
3. **Memory Retrieval** — pgvector similarity search against user memories
4. **Vector Search** — embedding generation + vector DB query metadata
5. **Web Search Decision** — keyword/pattern matching to decide if web search needed
6. **Web Source Fetch** — page fetching for each search result (blocked unsafe URLs, timeout)
7. **Source Summarization** — text extraction + summarization of fetched pages
8. **Learning Pipeline** — post-response learning candidate extraction (non-fatal)
9. **Feedback Signal** — feedback check (not applicable in synchronous flow)
10. **Prompt Builder** — system prompt assembly with memory + web context
11. **LLM Provider** — AI provider call (DeepSeek/OpenAI/Ollama/Mock)
12. **Final Response** — response formatting and return

#### Safe Metadata Policy
| Step | Exposed Metadata | Not Exposed |
|------|-----------------|-------------|
| All | stepName, status, durationMs | — |
| Input | messageLength, hasConversationId | message text, raw content |
| Intent Detection | intentType, intentConfidence | — |
| Memory Retrieval | memoriesFound, memoryUsed | memory text, summaries |
| Vector Search | queryLength, resultsCount | embeddings, raw queries |
| Web Search Decision | searchTriggered, searchReason, resultsCount | query text |
| Web Source Fetch | pagesFetched, totalChars | URLs, page content |
| Source Summarization | summariesCount | summary text |
| Learning Pipeline | candidatesExtracted | candidate text, source |
| Feedback Signal | feedbackApplied | feedback content |
| Prompt Builder | memoryContextChars, webContextChars | system prompt text |
| LLM Provider | provider, responseTimeMs | API keys, raw response |
| Final Response | responseLength | response content |

#### Security Rules
| Rule | Implementation |
|------|---------------|
| Auth required on all trace endpoints | `auth()` check in each route handler |
| User can only access own traces | `findFirst({ where: { id, userId } })` on all queries |
| No raw prompts/metadata stored | Only safe metadata fields (counts, durations, booleans) |
| No API keys exposed | Provider name only from env var |
| Trace failure is non-fatal | All trace methods wrapped in try-catch, return null on failure |
| No hidden system prompt exposed | Only character counts of context, not content |
| No raw memory/web text exposed | Only count/number of memories, pages, summaries |
| Chat API continues without trace | Trace start returns null on failure, chat flow unaffected |

#### Build Rescue (Phase 13 Gate)
Three pre-existing build errors were fixed to unblock the build:
- `scripts/make-admin.ts:17` — `PrismaClient` constructor requires adapter in Prisma 7.8.0 (added `PrismaPg` adapter)
- `src/app/api/ai-lab/experiments/route.ts:47` — cast to `NetworkConfig` instead of inline type with `string` activation
- `src/lib/ai-lab/training/engine.ts:86,126` — TypeScript control-flow narrowing of `_status` prevented `=== "paused"` comparison (added `as TrainingStatus`)

#### Verification Commands Run
```bash
npx prisma validate     # ✅ Passed
npx prisma generate     # ✅ Passed (183ms)
npx tsc --noEmit       # ✅ 0 errors
npm run lint           # ✅ 0 errors, 3 pre-existing warnings (ai-lab unused vars)
npm run build          # ✅ Compiled in 3.2s, 31 routes (no errors)
npm test               # ✅ 83 tests passed (5 files)
```

---

## Configuration Reference

### Retrieval Configuration (`src/lib/ai/retrieval/config.ts`)
| Parameter | Default | Description |
|-----------|---------|-------------|
| `topK` | 5 | Max memories to retrieve from vector search |
| `similarityThreshold` | 0.7 | Min cosine similarity (1 - cosine_distance) to include |
| `maxMemoryContextChars` | 4000 | Total chars limit for memory context in prompt |
| `maxSingleMemoryChars` | 800 | Per-memory text truncation limit |

### Search Configuration (`src/lib/ai/web/WebSearchService.ts`)
| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxResults` | 3 | Max search results to process per query |

### Fetch Configuration (`src/lib/ai/web/WebFetchService.ts`)
| Parameter | Value | Description |
|-----------|-------|-------------|
| `MAX_PAGE_SIZE` | 100,000 | Max bytes allowed per fetched page |
| `FETCH_TIMEOUT_MS` | 8,000 | Request timeout in milliseconds |

### Extraction Configuration (`src/lib/ai/web/SourceExtractor.ts`)
| Parameter | Value | Description |
|-----------|-------|-------------|
| `MAX_EXTRACTED_TEXT` | 5,000 | Max characters of extracted text |

### Context Configuration (`src/lib/ai/web/WebContextBuilder.ts`)
| Parameter | Value | Description |
|-----------|-------|-------------|
| `MAX_WEB_CONTEXT_CHARS` | 4,000 | Max total chars for web context in prompt |

## [ADMIN_MODERATION_SYSTEM_STATUS]

**Status**: Complete (Phase 10)

### What was implemented
- **Database**: User `status` (ACTIVE/BANNED), `bannedAt`, `bannedReason` fields; `AdminWarning` model (with `acknowledgedAt`); `AdminActionLog` model
- **Admin API routes**: users list+detail, ban/unban, warnings CRUD, conversation review, audit log
- **Ban enforcement**: `requireNotBanned()` helper in chat, memories, feedback, learning candidates APIs
- **Admin UI**: Tabbed admin dashboard with Users (status badge, ban/unban/warning actions), Conversations (view link), Warnings (list), Audit Log (filterable), Health (system info)
- **Detail pages**: User detail page (`/dashboard/admin/users/[id]`) with account info, content summary, conversations, warnings; Conversation review page (`/dashboard/admin/conversations/[id]`) with full message list
- **Audit logging**: All admin destructive actions logged via `logAdminAction()` helper
- **Documentation**: README updated with admin capabilities, ban behavior, what admin cannot see

### User-Facing Warning Visibility (Phase 10.5)
- **Database**: Added `acknowledgedAt` to `AdminWarning` for acknowledgment tracking
- **User API**: `GET /api/me/warnings` returns own warnings; `PATCH /api/me/warnings/[id]/acknowledge` marks a warning as acknowledged
- **Warning Banner**: Client component (`WarningBanner.tsx`) shows latest unacknowledged warning at the top of the dashboard across all pages
- **Warnings Page**: `/dashboard/warnings` shows full warning history with unacknowledged/acknowledged sections
- **Admin UI**: Admin user detail page shows `acknowledgedAt` and acknowledgment status; admin WarningsTab shows active/acknowledged status
- **Security**: Users can only see/acknowledge their own warnings; unauthenticated requests return 401; cross-user access returns 403

### Files created/modified
- `prisma/schema.prisma` — User status/bannedAt/bannedReason, AdminWarning with acknowledgedAt, AdminActionLog
- `src/lib/auth/admin-log.ts` — action logging helper
- `src/lib/auth/ban-check.ts` — ban enforcement helper
- `src/app/api/admin/users/route.ts` — list users
- `src/app/api/admin/users/[id]/route.ts` — user detail
- `src/app/api/admin/users/[id]/ban/route.ts` — ban user
- `src/app/api/admin/users/[id]/unban/route.ts` — unban user
- `src/app/api/admin/users/[id]/warnings/route.ts` — warnings CRUD
- `src/app/api/admin/conversations/[id]/route.ts` — conversation review
- `src/app/api/admin/audit-log/route.ts` — audit log
- `src/app/(dashboard)/dashboard/admin/AdminDashboardClient.tsx` — UI rewrite
- `src/app/(dashboard)/dashboard/admin/users/[id]/page.tsx` — user detail page
- `src/app/(dashboard)/dashboard/admin/conversations/[id]/page.tsx` — conversation review page
- `src/app/api/chat/route.ts` — added ban check
- `src/app/api/memories/route.ts` — added ban check
- `src/app/api/feedback/route.ts` — added ban check
- `src/app/api/learning/candidates/route.ts` — added ban check
- `src/app/api/me/warnings/route.ts` — user-facing warnings list
- `src/app/api/me/warnings/[id]/acknowledge/route.ts` — acknowledge warning
- `src/components/dashboard/WarningBanner.tsx` — dashboard warning banner
- `src/app/(dashboard)/dashboard/warnings/page.tsx` — user warnings history page
- `src/app/(dashboard)/layout.tsx` — added WarningBanner
- `src/components/dashboard/DashboardSidebar.tsx` — added Warnings nav item

### Important Notes
- `requireAdmin()` throws 401/403 if not authenticated or not ADMIN
- `requireNotBanned()` throws `BanError` if user.status === "BANNED"
- `logAdminAction()` creates `AdminActionLog` record with safe metadata
- Admin cannot ban self
- Admin cannot demote self if zero admins remain
- Hidden prompts and secrets are never exposed in conversation review

## [STABILITY_POLISH_PASS_STATUS]

**Status**: Complete

### Fixes Implemented

| # | Fix | Files Changed |
|---|-----|---------------|
| 1 | Explicit memory save from chat — improved Arabic regex patterns, content extraction | `src/app/api/chat/route.ts` |
| 2 | Chat internal scrolling — dashboard layout overflow fix | `src/app/(dashboard)/layout.tsx` |
| 3 | Duplicate empty conversations — client-side dedup, confirmation dialog, title validation | `src/components/chat/ChatPage.tsx`, `src/components/chat/Sidebar.tsx` |
| 4 | Global light/dark theme consistency — replaced hardcoded colors with CSS variables, added error/warning CSS vars | `src/app/globals.css`, `src/components/chat/MessageBubble.tsx`, `src/components/chat/ChatWindow.tsx`, `src/components/dashboard/WarningBanner.tsx`, `src/app/(dashboard)/dashboard/warnings/page.tsx`, `src/components/memory/MemoryPageClient.tsx` |
| 5 | Admin warning visibility — verified existing implementation | (already complete) |
| 6 | Conversation rename/delete controls — show controls for all conversations, not just active | `src/components/chat/Sidebar.tsx` |
| 7 | Account settings page — new page with profile, password change, logout | `src/app/(dashboard)/dashboard/account/page.tsx`, `AccountPageClient.tsx`, `src/app/api/me/route.ts`, `src/app/api/me/password/route.ts`, `src/components/dashboard/DashboardSidebar.tsx` |
| 8 | Admin error logs page — in-memory log store + admin UI | `src/lib/safety/safety-event-logger.ts`, `src/app/api/admin/logs/route.ts`, `src/app/(dashboard)/dashboard/admin/logs/page.tsx`, `src/app/(dashboard)/dashboard/admin/AdminDashboardClient.tsx` |
| 9 | User data export — JSON download with all user data | `src/app/api/me/export/route.ts`, `src/app/(dashboard)/dashboard/account/export/page.tsx` |
| 10 | Clear Memory action — delete all user memories + embeddings | `src/app/api/memories/clear/route.ts`, `src/components/memory/MemoryPageClient.tsx` |

### New API Routes
- `GET/PATCH /api/me` — user profile
- `PATCH /api/me/password` — change password
- `GET /api/me/export` — export user data as JSON
- `DELETE /api/memories/clear` — clear all user memories
- `GET /api/admin/logs` — admin system logs

### New Pages
- `/dashboard/account` — account settings
- `/dashboard/account/export` — data export
- `/dashboard/admin/logs` — admin system logs

### Verification
- `npx prisma validate` — PASS
- `npx prisma generate` — PASS
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS (0 errors, 3 pre-existing warnings)
- `npm run build` — PASS (41 pages generated)
- `npm test` — PASS (83 tests passed)
