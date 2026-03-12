# Lessons Learned

## 1. Don't over-engineer storage
**Correction:** User pushed back on SQL database suggestion — "why do we even need a DB for this?"
**Rule:** For single-user tools, default to the simplest storage (JSON files, env vars). Only suggest a database when there's a clear need for concurrent access, complex queries, or multi-user data.

## 2. Verify API claims before presenting them
**Correction:** User said "i think it does allow for keyword data in their api. do more digging" when I initially said Etsy had no keyword data.
**Rule:** When researching API capabilities, do a thorough deep dive before making definitive claims. Search official docs, GitHub issues, and community forums. Present findings with confidence levels, not absolutes.

## 3. Ask about the user's existing setup before assuming
**Correction:** User had a specific GitHub repo (`igorbekker/etsy`) already created. I initialized a local git repo without asking about their remote.
**Rule:** When setting up git, always ask for the remote repo URL first. Don't assume it doesn't exist yet.

## 4. Follow the CLAUDE.md workflow rigorously
**Correction:** User had to ask twice "re-read the MD and check that you followed it" — revealing missed task files, missing features, and workflow violations.
**Rule:** After completing work, systematically walk through every line of CLAUDE.md and verify compliance before declaring done. Create `tasks/todo.md` and `tasks/lessons.md` at project start, not as an afterthought.

## 5. Don't mark tasks complete until ALL sub-items are done
**Correction:** Marked tasks complete but dashboard was missing SEO scores, AI suggestions weren't built, side-by-side view was absent.
**Rule:** A feature is only done when every bullet point under it in the plan is implemented and verified. Partial implementation = in_progress, not completed.

## 7. Wrap all JSON.parse() calls from external sources in try-catch
**Pattern found:** Both `generateListingRecommendations` and `generateKeywordSuggestions` called `JSON.parse(textContent.text)` with no error handling. Any malformed AI response would crash the API route with a 500.
**Rule:** Any `JSON.parse()` on data from an external source (AI, API, user input) must be wrapped in try-catch. Internal/hardcoded JSON is fine without it.

## 8. Input validation must run before feature flags and mode checks
**Pattern found:** In `keywords/research/route.ts`, the `!keyword` validation ran after `if (DEMO_MODE)`, meaning demo mode returned `seedKeyword: undefined` on missing input.
**Rule:** Validate inputs at the very top of the handler, before any branching (DEMO_MODE, feature flags, connection checks). Invalid input should always return 400 immediately.

## 9. Never use recursive self-calls as a fallback
**Pattern found:** `getMockRecommendations(listingId)` called `getMockRecommendations(1001)` as its not-found fallback — infinite recursion if listing 1001 is ever removed.
**Rule:** Fallbacks must use direct data access (`MOCK_LISTINGS[0]`), not recursive calls. If there's truly no data, throw a clear error rather than silently loop.

## 10. Switch statements on typed unions still need a default return
**Pattern found:** `getSortedListings()` covered all 3 `SortMode` cases but had no `default` branch. TypeScript (depending on strictness settings) may not guarantee exhaustiveness and could infer `undefined` return type.
**Rule:** Always add a `default: return sorted` to switch statements that return values, even if the union appears exhaustive. Prevents TypeScript inference issues and runtime undefined returns.

## 11. Update lessons.md — don't wait to be reminded
**Pattern found:** After fixing bugs in a session, lessons.md was not updated until the user explicitly asked "fix it."
**Rule:** After ANY correction or bug fix, update `tasks/lessons.md` immediately — before committing. This is part of the Definition of Done per CLAUDE.md.

## 21. Test API access before building OAuth — public endpoints may not need it
**Violation:** Built a full OAuth 2.0 + PKCE flow for Etsy. A simple curl test would have shown the API key alone is sufficient for public shop listing data. Wasted significant effort.
**Rule:** Before building any auth/OAuth flow for an API, run a curl test with just the API key first. Only add OAuth if the key-only request fails.

## 19. HARD STOP before committing — never skip /pre
**Violation (repeated this session):** Made code changes (middleware.ts, Cloudflare Access config) and restarted the app without stopping to say "Ready for /pre — please run /pre before I commit." Violated CLAUDE.md commit protocol twice in the same session.
**Rule:** After ANY code change that will be committed, STOP COMPLETELY. Say "Ready for /pre — please run /pre before I commit." Do not restart the app, do not continue. Wait for the user to type /pre.

## 20. Clarify auth UX intent before building — don't assume
**Violation:** Built a username/password login page. User wanted Cloudflare email OTP as the only auth. Never asked which login method they wanted.
**Rule:** Before building any auth system, explicitly confirm: (a) what the login method is, (b) whether the app needs its own login or delegates entirely to an external provider. One question upfront saves a full rework.

## 14. Must enter plan mode and write todo.md plan BEFORE executing any multi-step task
**Violation:** Set up credentials + Cloudflare Tunnel + Access without entering plan mode or writing a plan first. Started executing immediately.
**Rule:** ANY task with 3+ steps = stop, enter plan mode, write plan to todo.md, check in with user, THEN execute. No exceptions.

## 15. Update todo.md in real time, not at the end
**Violation:** Only updated todo.md during /pre, not as tasks completed.
**Rule:** Mark items [x] in todo.md the moment they are done, not retroactively at /pre time.

## 16. Update lessons.md immediately after a correction — not at /pre
**Violation:** User pointed out ANTHROPIC_API_KEY was in ~/.bashrc. Did not update lessons.md until /pre.
**Rule:** As soon as a correction happens, stop, open lessons.md, add the lesson, then resume. This is non-negotiable per CLAUDE.md.

## 17. Never mark a task complete without proving it works
**Violation:** Marked Cloudflare Access as complete without visiting etsy.bornganic.com to confirm the Google login gate actually works.
**Rule:** A checkbox only gets [x] after observable verification. For external-facing features, that means opening the URL and confirming behavior.

## 18. Flag double-login UX problems immediately
**Violation:** User said "log in using my Gmail account." Set up Cloudflare Access but left the app's own username/password login page in place — creating two login steps. Did not flag this.
**Rule:** When a user says "log in with X," confirm whether they want X to be the ONLY login or an additional layer. If double-login is likely, surface it immediately.

## 12. Cloudflare API token must have explicit Access permissions
**Pattern found:** Token had DNS/tunnel permissions but not "Access: Apps and Policies" — all Access API calls returned 10000 auth error even though other endpoints worked.
**Rule:** When setting up Cloudflare Access via API, verify the token has `Access: Apps and Policies` and `Access: Organizations, Identity Providers, and Groups` at account scope before attempting API calls. Saves multiple roundtrips.

## 13. Check ~/.bashrc and ~/.profile for stored secrets before asking the user
**Pattern found:** Asked user for ANTHROPIC_API_KEY; it was already stored in ~/.bashrc.
**Rule:** Before asking the user for any API key or secret, grep ~/.bashrc and ~/.profile first.

## 6. Self-verify LINE BY LINE, not section by section
**Correction:** User asked "re-read the MD and check" 4 consecutive times. Each time found a new gap: (1) missing workflow files + features, (2) outdated file structure, (3) backend without frontend wiring, (4) missing UI field + scoring gap.
**Rule:** When verifying against the CLAUDE.md, check EVERY SINGLE LINE — not just section headers. For each bullet point: (a) does the backend implement it? (b) does the frontend expose it to the user? (c) does the file structure doc match? A backend endpoint without a frontend button is NOT done. A data field without UI display is NOT done.
