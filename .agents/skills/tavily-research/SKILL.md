---
name: tavily-research
description: "Entry point and router for live web research via the Tavily MCP toolkit. Use whenever the user wants to search the live web, extract content from URLs, map or crawl a site, run a cited deep-research report, fact-check a claim, monitor news, curate sources, profile a lead, run competitive intel, or find content gaps, and current information beyond training data is needed. Trigger on 'search for', 'research X', 'what's the latest on', 'fact-check this', 'crawl this site', 'brief me on this company', 'competitive analysis', or any task where a single guess would be worse than live retrieval. Routes to the right Tavily workflow (web-search, extract-page, site-map, site-crawl, deep-research, fact-check, news-monitor, source-curation, lead-research, competitive-intel, content-gap-analysis)."
---

# Tavily Research

A router for live web research. The Tavily MCP exposes five primitives (search, extract, map, crawl, deep-research); this skill picks the right workflow for the user's task and runs it. Always prefer live retrieval over answering current questions from memory.

## Pick the workflow

- Quick facts or discovery: web-search. Ranked results with snippets; reformulate and re-run if a query misses.
- Read a known URL: extract-page. Clean markdown from one or many URLs.
- Find a page on a big site: site-map (URLs only), then extract-page on the right one.
- Bulk content (docs, blog, product pages): site-crawl. Far cheaper than looping extract.
- A full cited report: deep-research. Multi-source synthesis with citations; slower (30 to 120s), so say so up front.
- Verify a claim: fact-check. Returns supported / refuted / mixed / unverifiable with primary sources.
- Track a topic over time: news-monitor. Time-bounded digests; pairs with scheduled tasks.
- Build a reading list: source-curation. Categorized, annotated sources.
- Prep for a meeting: lead-research. One-pager on a company or person with talking points.
- Size up rivals: competitive-intel. Battlecards, pricing, positioning from live data.
- Plan content: content-gap-analysis. Topics competitors own that the user does not.

## Operating principles

Scale calls to complexity: one search for a fact, many for a report, with each query meaningfully different. Cite sources for claims that came from retrieval and paraphrase rather than quoting at length. When results conflict, run more searches before concluding. State when something cannot be verified rather than guessing.

## Quality bar

Before returning, check: is every current claim grounded in something retrieved, and did the task use the cheapest workflow that answers it well? If a guess slipped in, replace it with a search.
