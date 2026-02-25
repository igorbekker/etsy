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
