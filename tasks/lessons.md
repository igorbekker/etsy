# Lessons Learned
(Ordered by frequency of violation — most violated first)

---

## 1. HARD STOP before committing — /pre required for every commit, no exceptions
**Violated repeatedly.** Made code changes and restarted without stopping for /pre. Committed OAuth fix directly. Interpreted "/pre then commit/deploy" as blanket authorization to skip /pre's confirmation step.
**Rule:** After ANY code change, STOP COMPLETELY. Say "Ready for /pre — please run /pre." Do not restart or continue until the user types /pre. EVERY commit requires /pre — no exceptions, no shortcuts, no assumed pre-authorization. Step 8 of /pre always requires explicitly saying "Ready to commit. Please approve." and waiting.

## 2. Plan first — research, present options, get approval before touching code
**Violated repeatedly.** Jumped directly into multi-step tasks without a plan. On bug reports, skipped straight to implementation without presenting options or getting approval.
**Rule:** For ANY non-trivial work (3+ steps, new features, OR bug reports): (1) research & understand the full issue first — read files, trace the flow; (2) write plan to todo.md with options and trade-offs; (3) present to user and wait for explicit approval; (4) then execute. No exceptions, even when the root cause seems obvious.
**Why:** The user may have a different preferred approach or context that changes the fix. Autonomous implementation removes their agency.
**How to apply:** Bug report → read files, trace the flow → STOP → present findings + 2–3 options → wait for approval. Feature → write plan to todo.md → check in → then build.

## 3. Update todo.md and lessons.md in real time — not at /pre
**Violated repeatedly.** Both files were only updated during /pre, not as work happened.
**Rule:** Mark todo.md items [x] the moment they are done. Update lessons.md the moment a correction happens — before resuming work. /pre is for verification, not first-time documentation.

## 4. Never mark complete without real proof — build passing is not verification
**Violated repeatedly.** Marked Cloudflare Access complete without confirming it worked. Marked features complete with missing UI wiring. Declared "build passes" as sufficient verification for a new cache feature never exercised end-to-end.
**Rule:** A checkbox only gets [x] after observable proof — run it, open it, confirm it works. Build passing only proves compilation. For every feature: (a) start the app, (b) hit the relevant endpoint, (c) confirm behavior matches spec. Backend without UI wired = NOT done. Partial = in_progress.

## 5. Self-verify LINE BY LINE, not section by section
**Violated 4 times in one session.** Each re-read found a new gap: missing files, outdated structure, backend without frontend wiring, missing UI fields.
**Rule:** Check EVERY LINE of CLAUDE.md. For each bullet: (a) does the backend implement it? (b) does the frontend expose it? (c) does the file structure doc match? Backend endpoint without UI = NOT done.

## 6. NEVER run curl or any direct API call that writes to production Etsy data
**CRITICAL VIOLATION.** Ran `curl -X PATCH .../listings/4447796840 --data-urlencode "description=test"` during debugging. This overwrote the real product description on a live listing. The original could not be recovered programmatically.
**Rule:** NEVER issue any write call (PATCH, POST, PUT, DELETE) to the Etsy API from the terminal or any script. Verification of write operations is ONLY done through the app UI by the user. If a write endpoint needs testing, test with a READ (GET) first, then let the user trigger the write from the UI. No exceptions. No "just a quick test."

## 7. AI recommendations must be grounded in the actual listing — no title-word fallback
**Violated.** Recommendations route fell back to title-word competitor searches when no keywords were saved. Produced wrong-niche competitors and off-topic recommendations.
**Rule:** Never fall back to title-word competitor searches for AI recommendation generation. If no target keywords are saved, return `{ error: "no_keywords" }`. The Claude prompt must explicitly anchor to the product identity and discard competitor keywords that don't apply.
**Why:** Title-word fallback silently breaks the grounding contract and erodes user trust.
**How to apply:** Any route using competitor data to inform AI output must require explicit keywords. No implicit fallbacks.

## 8. Before building any Etsy write operation — check method, URL pattern, and OAuth scope
**Pattern (3 separate incidents, same root cause).** Three distinct 404s: wrong scope, wrong URL pattern, wrong HTTP method (PATCH vs POST for image alt text).
**Rule:** Before building any Etsy write operation, verify all three dimensions: (1) **method** — image endpoints are GET/POST/DELETE only, no PATCH or PUT; (2) **URL** — all writes use shop-scoped URLs `/application/shops/${ETSY_SHOP_ID}/listings/{id}/...`; (3) **scope** — confirm token was authorized with the required scope. A silent 404 on a write op means one of these three is wrong — check them in order.

## 9. Confirm auth architecture before building — one gate means one gate
**Violated twice.** Built a full login page when user wanted Cloudflare email OTP only. Then set up Cloudflare Access but left the internal login in place — two login steps.
**Rule:** Before any auth work, confirm: (a) what is the login method, (b) is this the ONLY gate or an additional layer. If the user says "log in with X," remove all other gates, not add X on top. When wiring an external auth provider, immediately remove any internal login it replaces.

## 10. Test API access before building OAuth — public endpoints may not need it
**Violated.** Built full OAuth 2.0 + PKCE flow for Etsy. A single curl test would have shown the API key alone was sufficient.
**Rule:** Before building any auth/OAuth flow, run a curl test with just the API key first. Only add OAuth if the key-only request fails.

## 11. Check ~/.bashrc and ~/.profile for stored secrets before asking the user
**Violated.** Asked user for ANTHROPIC_API_KEY when it was already stored in ~/.bashrc.
**Rule:** Before asking for any API key or secret, grep ~/.bashrc and ~/.profile first.

## 12. Cloudflare API token scope must match the operations you're calling
**Violated.** Token had DNS/tunnel permissions but not Access permissions — caused repeated 10000 auth errors.
**Rule:** Before making Cloudflare API calls, verify the token has the exact permission scopes needed. Check permissions before attempting API calls, not after failures.

## 13. Don't over-engineer storage
**Violated.** Suggested SQL database for a single-user tool.
**Rule:** Default to simplest storage (JSON files, env vars). Only suggest a database when there's a clear need for concurrent access or complex queries.

## 14. Verify API claims before presenting them as fact
**Violated.** Stated Etsy had no keyword API data without thorough research.
**Rule:** Do a deep dive before making definitive API capability claims. Present findings with confidence levels, not absolutes.

## 15. Ask about existing setup before assuming
**Violated.** Initialized a local git repo without asking about the existing remote.
**Rule:** Before any git setup, ask for the remote repo URL. Don't assume it doesn't exist.

## 16. Wrap all JSON.parse() on external data in try-catch
**Pattern.** AI response parsing had no error handling — any malformed response would 500.
**Rule:** Any JSON.parse() on external data (AI, API, user input) must be wrapped in try-catch.

## 17. Input validation runs first — before feature flags and mode checks
**Pattern.** Keyword validation ran after DEMO_MODE check, causing undefined on missing input.
**Rule:** Validate inputs at the very top of every handler, before any branching.

## 18. Switch statements returning values need a default branch
**Pattern.** getSortedListings() had no default — TypeScript could infer undefined return.
**Rule:** Always add a default branch to switch statements that return values.

## 19. Never use recursive self-calls as a fallback or retry
**Pattern (2 incidents).** getMockRecommendations() called itself as not-found fallback. oauthFetch used recursive self-calls for 429 retry — unbounded stack growth.
**Rule:** Fallbacks must use direct data access, not recursive calls. Retries must use a bounded loop with MAX_RETRIES — never recurse.

## 20. Clarify who populates inputs before building — don't assume system-filled
**Violated.** Plan described "target keywords" UI without confirming whether system auto-fills or user types manually. User had to correct mid-plan.
**Rule:** Any input field — confirm upfront: is this populated by the user, the system, or both? Never build auto-fill behavior unless explicitly requested.

## 21. Don't propose building future-phase features when fixing bugs — just fix and move on
**Violated.** When user reported a bug touching a Phase 2 placeholder, proposed building the full Phase 2 feature instead of fixing the reported bug.
**Rule:** Fix the actual bug reported. Note future-phase work as deferred. Do not propose scope expansion unless the user explicitly asks.

## 22. overwrite=true on Etsy image POST clears fields not included in the request
**Violated.** Sent `overwrite=true` expecting it to replace a specific image. It cleared alt_text to null instead.
**Rule:** Never send `overwrite=true` when updating metadata only. POST with just `listing_image_id` and `alt_text` — omit the overwrite flag entirely.

## 23. Before designing background jobs — confirm trigger type, manual vs automatic, implementation approach
**Pattern (2 incidents).** Proposed a cron running every 6 hours without asking if automation was wanted. Then proposed cron calling `curl localhost` which is fragile and wrong for Next.js on a VPS.
**Rule:** Before designing any background job: (a) confirm time-based vs event-based; (b) ask if automatic or manual — a button is often better; (c) import logic directly into a standalone Node script — never HTTP-call your own server from cron.

## 24. When a feature is irrelevant to the user's context, delete it — don't skip it
**Violated.** Proposed skipping the shipping flag feature. User corrected: "Don't skip it; just delete it."
**Rule:** When a planned feature is confirmed irrelevant, remove it from CLAUDE.md and todo.md entirely. Don't mark it deferred or skipped — delete it.

## 25. After deploying new code, confirm the old server process was actually killed
**Violated.** Restarted the server but the old process was still running and holding port 3000. New process silently failed to bind.
**Rule:** After killing a server and starting a new one, immediately run `ps aux | grep next` to confirm the old PID is gone and the new PID is running. Then hit a known endpoint to confirm new code is live.
