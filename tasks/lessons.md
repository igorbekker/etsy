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

## 6. Confirm auth architecture before building — one gate means one gate
**Violated twice.** Built a full username/password login page when user wanted Cloudflare email OTP only. Then set up Cloudflare Access but left the internal login in place — two login steps — without flagging it.
**Rule:** Before any auth work, confirm: (a) what is the login method, (b) is this the ONLY gate or an additional layer. If the user says "log in with X," the correct answer is to remove all other gates, not add X on top. When wiring in an external auth provider, immediately remove any internal login that it replaces.

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
**Rule:** Always add a default branch to switch statements that return values.

## 16. Never use recursive self-calls as a fallback or retry
**Pattern (2 incidents).** getMockRecommendations() called itself as not-found fallback — infinite recursion risk. oauthFetch and etsyFetch used recursive self-calls for 429 retry — unbounded stack growth.
**Rule:** Fallbacks must use direct data access, not recursive calls. Retries must use a bounded loop with a MAX_RETRIES constant — never recurse.

## 17. Clarify who populates inputs before building — don't assume system-filled
**Violated.** Plan described "target keywords" UI without explicitly stating whether the system auto-fills them or the user types them manually. User had to correct mid-plan: "those should be manually entered by me, not by the system."
**Rule:** Any input field or data entry UI — confirm upfront: is this populated by the user, the system, or both? Never build auto-fill behavior unless explicitly requested.

## 18. Build passing is not verification — actually run and test the feature
**Violated.** /pre declared "build passes" as sufficient verification. User had to call it out: the new cache feature had never been exercised end-to-end.
**Rule:** For every feature: (a) start the app, (b) hit the relevant endpoints with curl, (c) confirm the actual behavior matches the spec. `npm run build` only proves it compiles — not that it works.

## 19. Never commit without /pre — even for small bug fixes
**Violated twice in one session.** Committed the OAuth callback fix directly without stopping for /pre. Also interpreted "/pre then commit/deploy" as blanket authorization to skip the confirmation step in /pre.
**Rule:** EVERY commit requires /pre, no exceptions. "Then commit/deploy" in /pre args means the user pre-approves after /pre completes — it does not skip /pre. Step 8 of /pre always requires explicitly saying "Ready to commit. Please approve." and waiting.

## 20. Don't propose building Phase 2 features when fixing bugs — just fix and move on
**Violated.** When user reported "logs records nothing," proposed a full logs implementation plan instead of noting it's Phase 2 and moving on. User had to redirect: "move the logs comment to Phase 2."
**Rule:** When a bug report touches a known Phase 2 placeholder, fix the actual bug reported and note the Phase 2 work as deferred. Do not propose building Phase 2 scope unless the user explicitly asks for it.

## 21. Before building any Etsy write operation — check method, URL pattern, and OAuth scope
**Pattern (3 separate incidents, same root cause).** Three distinct 404s from Etsy write operations: (a) PATCH returned 404 because token lacked `listings_w` scope — GET on same resource returned 200; (b) PATCH to `/application/listings/{id}/images/{imageId}` returned 404, but `/application/shops/{shop_id}/listings/{id}/images/{imageId}` returned 200 — URL pattern was wrong; (c) built `updateListingImageAltText` using PATCH which doesn't exist in Etsy v3 — correct method is POST with `listing_image_id`.
**Rule:** Before building any Etsy write operation, verify all three dimensions against the OpenAPI spec: (1) **method** — image endpoints are GET/POST/DELETE only, no PATCH or PUT; (2) **URL** — all writes use shop-scoped URLs `/application/shops/${ETSY_SHOP_ID}/listings/{id}/...`, not direct `/application/listings/{id}/...`; (3) **scope** — confirm the token was authorized with the required scope. A silent 404 on a write op means one of these three is wrong — check them in order.

## 22. overwrite=true on Etsy image POST clears fields not included in the request
**Violated.** Sent `overwrite=true` expecting it to mean "replace this specific image". It cleared the alt_text to null instead of updating it. The field is for replacing the image binary, not for updating metadata.
**Rule:** Never send `overwrite=true` to the Etsy image POST endpoint when updating metadata only. Omit it entirely — POST with just `listing_image_id` and `alt_text` updates the alt text without touching the image.

## 23. NEVER run curl or any direct API call that writes to production Etsy data — not even for testing
**CRITICAL VIOLATION.** During debugging of the Push Live feature, ran `curl -X PATCH .../listings/4447796840 --data-urlencode "description=test"` directly from the terminal. This overwrote the real product description on a live Etsy listing with the word "test". The original description was not fully cached and could not be recovered programmatically.
**Rule:** NEVER issue any write call (PATCH, POST, PUT, DELETE) to the Etsy API from the terminal or any script. Verification of write operations is ONLY done through the app UI by the user. If a write endpoint needs testing, test it with a READ (GET) first to confirm the shape of the data, then let the user trigger the write from the UI. No exceptions. No "just a quick test."

## 24. Before designing background jobs — confirm trigger type, manual vs automatic, and implementation approach
**Pattern (2 incidents, same root cause).** Proposed a cron running every 6 hours without asking if automation was wanted (user preferred a button); then proposed that cron call `curl localhost:3000/api/cron/...` which is fragile and wrong for Next.js on a VPS.
**Rule:** Before designing any background job: (a) confirm whether the trigger is time-based or event-based; (b) ask if the user wants it automatic or manual — a UI button is often better and always simpler; (c) if a background script is needed, import the logic directly into a standalone Node script — never design a cron that HTTP-calls its own server.

## 25. When a feature is irrelevant to the user's context, delete it — don't skip it
**Violated.** Proposed skipping the shipping flag feature because all listings have free shipping. User corrected: "Don't skip it; just delete it." Skipping leaves dead weight in the plan; deleting keeps it clean.
**Rule:** When a planned feature is confirmed irrelevant (wrong stack, wrong shop setup, zero users), remove it from CLAUDE.md and todo.md entirely. Don't mark it deferred or skipped — delete it.

## 26. AI recommendations must be grounded in the actual listing — no title-word fallback
**Violated.** The recommendations route had a fallback: when no keywords were saved, it extracted words from the listing title and used them to find competitors. This produced wrong-niche competitors, which caused Claude to generate off-topic recommendations (a listing about one product received recommendations for a completely different product).
**Rule:** Never fall back to title-word competitor searches for AI recommendation generation. If no target keywords are saved, return `{ error: "no_keywords" }` and prompt the user to set them. Additionally, the Claude prompt must explicitly anchor to the product identity ("you are optimizing THIS specific product") and instruct Claude to discard competitor keywords that don't apply to this product.
**Why:** The recommendations route is supposed to be grounded in the actual listing. Title-word fallback silently breaks that contract and produces useless output that erodes user trust.
**How to apply:** Any route that uses competitor data to inform AI output must require explicit keywords. No implicit fallbacks.

## 27. After deploying new code, confirm the old server process was actually killed
**Violated.** Restarted the server but the old process (PID 289171) was still running and holding port 3000. The new process silently failed to bind. Spent time debugging the wrong binary.
**Rule:** After killing a server and starting a new one, immediately run `ps aux | grep next` to confirm the old PID is gone and the new PID is running. Then hit a known endpoint to confirm the new code is live before testing the fix.
