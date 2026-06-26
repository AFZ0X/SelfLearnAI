<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Undocumented Services

### ResponseStyleService
**File:** `src/lib/ai/retrieval/ResponseStyleService.ts`
**Imports as:** `{ ResponseStyleService, type ResponseMode, type StyleResult }`

Controls how concise or verbose the assistant's responses are. Supports four modes:
- `SHORT` — Default. 1–5 lines, direct, no filler.
- `NORMAL` — Balanced, brief context.
- `DETAILED` — Full explanations (triggered by keywords like "اشرح", "explain").
- `ACTION_ONLY` — Commands/steps only (triggered by keywords like "وش اسوي", "fix").

**Key methods:**
- `detectStyle(query: string, preference?: string): StyleResult` — Classifies user intent for answer length. Checks query patterns for short/detailed/action keywords, then falls back to user preference (stored in `settings.responseStyle`), defaults to `SHORT`.
- `buildStyleBlock(mode: ResponseMode, isWebSearch: boolean, hasWeakEvidence: boolean): string` — Generates the prompt constraints block injected into the system prompt.

**Integration:** Called in chat route before PromptBuilder. The detected `mode` is passed as `responseStyle` to `PromptContextBuilder.buildSystemPrompt()`. Chat route includes `responseMode` in the JSON response payload.

**Settings:** User preference stored in `settings.responseStyle` (JSON column in User model). Can be updated via `PATCH /api/me` with `{ settings: { responseStyle: "SHORT" } }`. UI is on the dashboard settings page.

**Detection priority:**
1. Action keywords (`وش اسوي`, `fix`, `command`) → `ACTION_ONLY`
2. Detail keywords (`اشرح`, `explain`, `why`, `how`) → `DETAILED`
3. User saved preference (SHORT/NORMAL/DETAILED) → overrides default if not overridden by explicit query keywords
4. Short keywords (`اختصر`, `quick`, `short`) → `SHORT`
5. Default → `SHORT`

### ReasoningEngine
**File:** `src/lib/ai/reasoning/ReasoningEngine.ts`
**Imports as:** `{ ReasoningEngine, type ReasoningOutput, type ReasoningEvent }`

**Purpose:** Mandatory orchestration layer for every chat request. Replaces the direct style detection + prompt builder flow with a structured reasoning pipeline.

**Pipeline order (all synchronous services in ReasoningEngine.reason()):**
1. `IntentAnalyzer.analyze()` — detects goal (14 types), language, urgency
2. `TaskClassifier.classify()` — maps goal to task type (12 types) with tool requirements
3. `ReasoningPlanner.plan()` — creates execution plan (DIRECT_ANSWER, WEB_ONLY, MEMORY_ONLY, etc.)
4. `ToolOrchestratorV1.selectTools()` — chooses memory/web/internal knowledge
5. `EvidenceCollector.collectFromMemory()` — extracts memory evidence
6. `ConfidenceScorer.score()` — scores 0–100 with HIGH/MEDIUM/LOW/UNKNOWN label
7. `SelfVerifier.verify()` — 7 checks before LLM call
8. `AnswerDraftBuilder.buildSystemPrompt()` — builds final system prompt

**Input:** query, memoryRetrievalResult, webSearchOutcome, hasExplicitSearchTrigger, responseStyle, citationsCount, hasWebContext, hasWeakEvidence

**Output:** `ReasoningOutput` with intent, taskClassification, reasoningPlan, toolDecision, evidence, verification, confidence, systemPrompt, planSummary

**Important rules:**
- Do NOT expose chain-of-thought to the user
- The system prompt is built by the engine — do NOT manually assemble it in the chat route
- The engine does NOT call the LLM — the chat route still calls the LLM with the engine's system prompt
- All existing services (memory, web search, quality gates) remain unchanged — the engine calls them as tools
- The chat route's `Reasoning_Engine` trace step records safe metadata (intentGoal, taskType, planType, confidence, etc.)
