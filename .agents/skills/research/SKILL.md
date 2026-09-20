---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Spin up a **background agent** to do the research, so you keep working while it reads.

Its job:

Before fetching remote pages, stage source ingestion:

- Discover/search candidate sources.
- Rank candidates by first-party authority and relevance.
- Fetch only the 1–2 strongest sources initially; use a targeted page or section when supported.
- Inspect those results and identify the remaining uncertainty.
- Fetch another source only when it contributes independent evidence or resolves that uncertainty.
- Stop fetching once the question has sufficient evidence.

Do not fetch several URLs merely for coverage or flood one reasoning turn with uninspected output. Broader parallel collection remains valid when the user explicitly requests comprehensive literature coverage, multi-source fact verification, or a survey where breadth is itself the task; batch those sources when possible.

This is workflow discipline only: do not add a runtime tool-call blocker or fetch guard.

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
