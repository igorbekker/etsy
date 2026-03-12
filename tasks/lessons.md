# Lessons Learned
(Ordered by frequency of violation — most violated first)

---

## 1. HARD STOP before committing — never skip /pre
**Violated repeatedly.** Made code changes and restarted the app without stopping for /pre. Happened twice in one session.
**Rule:** After ANY code change, STOP COMPLETELY. Say "Ready for /pre — please run /pre before I commit." Do not restart, do not continue. Wait for the user to type /pre.

## 2. Write plan to todo.md and check in BEFORE executing any multi-step task
**Violated repeatedly.** Started executing multi-step tasks (credentials setup, Cloudflare, UI redesign) without writing a plan or checking in first.
**Rule:** ANY task with 3+ steps = stop, write plan to todo.md, check in with user, THEN execute. No exceptions.

## 3. Update todo.md and lessons.md in real time — not at /pre
**Violated repeatedly.** Both files were only updated during /pre, not as work happened.
**Rule:** Mark todo.md items [x] the moment they are done. Update lessons.md the moment a correction happens — before resuming work. /pre is for verification, not first-time documentation.

## 4. Never mark a task complete until every sub-item is done AND verified
**Violated repeatedly.** Marked Cloudflare Access complete without confirming it worked. Marked features complete while dashboard was missing SEO scores, AI suggestions, and side-by-side view.
**Rule:** A checkbox only gets [x] after observable proof — run it, open it, confirm it works. Every sub-item must be done. Partial implementation = in_progress. Backend endpoint without UI wired = NOT done.

## 5. Self-verify LINE BY LINE, not section by section
**Violated 4 times in one session.** Each re-read found a new gap: missing files, outdated structure, backend without frontend wiring, missing UI fields.
**Rule:** Check EVERY LINE of CLAUDE.md. For each bullet: (a) does the backend implement it? (b) does the frontend expose it? (c) does the file structure doc match? Backend endpoint without UI = NOT done.

## 6. Clarify auth/UX intent before building — don't assume
**Violated.** Built a full username/password login page when user wanted Cloudflare email OTP only.
**Rule:** Before building any auth system, confirm: (a) what the login method is, (b) whether the app delegates entirely to an external provider. One question upfront saves a full rework.

## 7. Test API access before building OAuth — public endpoints may not need it
**Violated.** Built full OAuth 2.0 + PKCE flow for Etsy. A single curl test would have shown the API key alone was sufficient.
**Rule:** Before building any auth/OAuth flow, run a curl test with just the API key first. Only add OAuth if the key-only request fails.

## 8. Check ~/.bashrc and ~/.profile for stored secrets before asking the user
**Violated.** Asked user for ANTHROPIC_API_KEY when it was already stored in ~/.bashrc.
**Rule:** Before asking for any API key or secret, grep ~/.bashrc and ~/.profile first.

## 9. Cloudflare API token scope must match the operations you're calling
**Violated.** Token had DNS/tunnel permissions but not Access permissions — caused repeated 10000 auth errors.
**Rule:** Before making Cloudflare API calls, verify the token has the exact permission scopes needed. Check token permissions before attempting API calls, not after failures.

## 10. Don't over-engineer storage
**Violated.** Suggested SQL database for a single-user tool.
**Rule:** Default to simplest storage (JSON files, env vars). Only suggest a database when there's a clear need for concurrent access or complex queries.

## 11. Verify API claims before presenting them as fact
**Violated.** Stated Etsy had no keyword API data without thorough research.
**Rule:** Do a deep dive before making definitive API capability claims. Present findings with confidence levels, not absolutes.

## 12. Ask about existing setup before assuming
**Violated.** Initialized a local git repo without asking about the existing remote.
**Rule:** Before any git setup, ask for the remote repo URL. Don't assume it doesn't exist.

## 13. Wrap all JSON.parse() on external data in try-catch
**Pattern.** AI response parsing had no error handling — any malformed response would 500.
**Rule:** Any JSON.parse() on external data (AI, API, user input) must be wrapped in try-catch.

## 14. Input validation runs first — before feature flags and mode checks
**Pattern.** Keyword validation ran after DEMO_MODE check, causing undefined on missing input.
**Rule:** Validate inputs at the very top of every handler, before any branching.

## 15. Switch statements returning values need a default branch
**Pattern.** getSortedListings() had no default — TypeScript could infer undefined return.
**Rule:** Always add default: return sorted to switch statements that return values.

## 16. Flag double-login UX problems immediately
**Violated.** Set up Cloudflare Access but left internal login in place — two login steps. Never flagged it.
**Rule:** When a user says "log in with X," confirm whether that's the ONLY gate or an additional layer.

## 17. Never use recursive self-calls as a fallback
**Pattern.** getMockRecommendations() called itself as not-found fallback — infinite recursion risk.
**Rule:** Fallbacks must use direct data access, not recursive calls.

## 18. Clarify who populates inputs before building — don't assume system-filled
**Violated.** Plan described "target keywords" UI without explicitly stating whether the system auto-fills them or the user types them manually. User had to correct mid-plan: "those should be manually entered by me, not by the system."
**Rule:** Any input field or data entry UI — confirm upfront: is this populated by the user, the system, or both? Never build auto-fill behavior unless explicitly requested.

## 19. Build passing is not verification — actually run and test the feature
**Violated.** /pre declared "build passes" as sufficient verification. User had to call it out: the new cache feature had never been exercised end-to-end.
**Rule:** For every feature: (a) start the app, (b) hit the relevant endpoints with curl, (c) confirm the actual behavior matches the spec. `npm run build` only proves it compiles — not that it works.

## 20. Never commit without /pre — even for small bug fixes
**Violated twice in one session.** Committed the OAuth callback fix directly without stopping for /pre. Also interpreted "/pre then commit/deploy" as blanket authorization to skip the confirmation step in /pre.
**Rule:** EVERY commit requires /pre, no exceptions. "Then commit/deploy" in /pre args means the user pre-approves after /pre completes — it does not skip /pre. Step 8 of /pre always requires explicitly saying "Ready to commit. Please approve." and waiting.

## 21. Don't propose building Phase 2 features when fixing bugs — just fix and move on
**Violated.** When user reported "logs records nothing," proposed a full logs implementation plan instead of noting it's Phase 2 and moving on. User had to redirect: "move the logs comment to Phase 2."
**Rule:** When a bug report touches a known Phase 2 placeholder, fix the actual bug reported and note the Phase 2 work as deferred. Do not propose building Phase 2 scope unless the user explicitly asks for it.

## 22. Etsy returns 404 "Resource not found" for missing OAuth scope — not 403
**Pattern.** PATCH /listings/{id}/images/{imageId} returned 404 when the token lacked listings_w scope. GET on the same resource returned 200. Misleading error caused confusion.
**Rule:** When an Etsy PATCH/PUT/DELETE returns 404 but GET works, suspect missing OAuth scope first. Check whether the operation requires a scope beyond what was authorized. Detect "Resource not found" in the error handler and surface a scope-specific message.
