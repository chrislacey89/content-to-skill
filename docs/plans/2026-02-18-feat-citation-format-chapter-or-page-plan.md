---
title: "feat: Add citation format choice — chapter numbers for books, page numbers for papers"
type: feat
status: completed
date: 2026-02-18
---

# Citation Format: Chapter Numbers vs Page Numbers

## Overview

The pipeline currently hardcodes chapter-based citations everywhere (`Chapter [N]: [Title]`, `— Author Name, Chapter [N]`). This was set in commit `784c26f` which switched from page numbers to chapter references.

For books this is correct. For whitepapers and academic papers — where page numbers are stable and chapters don't exist — it produces wrong citations.

The fix: ask the user at pipeline start whether they want **chapter** or **page** citations, then thread that choice through extraction and conversion.

## Problem Statement

- `research-prompt.md` hardcodes `(Chapter [N]: [Title])` in 3 places (line 31, 60, 96)
- `skill-conversion.md` hardcodes `— Author Name, Chapter [N]` (line 90)
- Pass 2 cross-reference uses `(Ch. N)` throughout (content-to-skill.md line 147)
- The manifest already tracks `inputType` (pdf/epub) and page ranges, but this metadata never reaches extraction subagents
- Existing generated skills have inconsistent citations — some have `(Ch. 15)`, some have bare quotes with no attribution at all

## Proposed Solution

### 1. Ask User for Citation Style (New Step 1.5)

**File:** `commands/content-to-skill.md`

After Step 1 (validate input), before Step 2 (chunk), add a user prompt:

```
AskUserQuestion:
  "How should quotes be cited in this skill?"
  Options:
    - "By chapter (e.g., Chapter 3)" — for books
    - "By page number (e.g., p. 42)" — for papers, whitepapers, academic docs
```

Store the choice as `citationStyle: "chapter" | "page"` in `progress.json` for recovery.

**Why ask the user instead of auto-detecting:** File extension (pdf/epub) doesn't reliably indicate content type — PDFs can be books, EPUBs can be papers. Asking is simple, fast, and always correct.

### 2. Update `progress.json` Schema

**File:** `commands/content-to-skill.md` (Step 1 initial write, and all subsequent updates)

Add `citationStyle` field:

```json
{ "step": "chunking", "skillName": "<name>", "inputFile": "<path>", "citationStyle": "chapter", "status": "in_progress" }
```

This ensures recovery after compaction preserves the citation format choice.

### 3. Make `research-prompt.md` Citation-Aware

**File:** `references/research-prompt.md`

Replace the three hardcoded chapter citation patterns with conditional blocks. Since reference files are "declarative methodology docs, not conversational prompts" (per CLAUDE.md), use a clearly marked section with both formats:

**Line 31** — Output schema header:
```markdown
## Chapter [N]: [Chapter Title]
<!-- OR for page-based citations: -->
## Section [N]: [Section Title]
```
Replace with a single instruction block at the top of the Output Schema section:

```markdown
### Citation Format

Use the citation style specified by the pipeline:

- **Chapter citations**: `(Chapter [N]: [Title])` — use for books
- **Page citations**: `(p. [N])` or `(pp. [N]-[M])` for ranges — use for papers/whitepapers

Apply this format consistently to: section headers, key quotes, and figure locations.
```

**Line 60** — Key Quotes:
```markdown
> "[Exact quote]" (Chapter [N]: [Title])
```
→ Add alternate:
```markdown
> "[Exact quote]" (p. [N])
```

**Line 96** — Visual content location:
```markdown
[Figure X.X, Chapter [N]]
```
→ Add alternate:
```markdown
[Figure X.X, p. [N]]
```

### 4. Add Page-Citation Few-Shot Example

**File:** `references/research-prompt.md`

After the existing "The Prince" chapter-based example (line 109-145), add a brief page-based example:

```markdown
## Few-Shot Example (Page Citations)

Given a chunk from an academic paper (pages 12-15):

```markdown
## Section 3: Methodology

### Key Concepts

#### Retrieval-Augmented Generation
- **Definition**: A technique that grounds LLM outputs in retrieved documents...
- **Why It Matters**: Reduces hallucination by providing factual context...

### Key Quotes
> "RAG reduces factual hallucination by 54% compared to closed-book generation" (p. 14)
> Context: The central empirical finding supporting the paper's thesis.
```
```

### 5. Thread Citation Style into Subagent Prompts

**File:** `commands/content-to-skill.md`

**Step 3, Pass 1 prompt template** (line 106-123): Add citation style instruction after the Hard Constraints section:

```
## Citation Style
Use **[chapter|page]** citations throughout your extraction.
- Chapter: `(Chapter [N]: [Title])` for quotes, `## Chapter [N]: [Title]` for headers
- Page: `(p. [N])` for quotes, `## Section [N]: [Title]` for headers
```

**Step 3, Pass 2 prompt template** (line 134-160): Replace hardcoded `(Ch. N)` on line 147:

```
- [Term]: [brief definition] ([citation per style — Ch. N or p. N])
```

And add the citation style instruction to the Pass 2 subagent prompt as well.

### 6. Update `skill-conversion.md` Key Quotes Template

**File:** `references/skill-conversion.md`

**Line 89-90** — Reference file template Key Quotes section:

```markdown
## Key Quotes

> "Direct quote from the book that captures this concept"
> — Author Name, Chapter [N]
```

→ Add conditional format:

```markdown
## Key Quotes

> "Direct quote from the book that captures this concept"
> — Author Name, Chapter [N]

<!-- For page-based citations: -->
> "Direct quote from the document that captures this concept"
> — Author Name, p. [N]
```

### 7. Add `documentType` to `book.json` Schema (Optional)

**File:** `references/skill-conversion.md` (book.json schema section)

Add optional field:

```json
{
  "name": "the-prince",
  "title": "The Prince",
  "documentType": "book",
  ...
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `documentType` | No | `"book"` or `"paper"`. Defaults to `"book"`. Determines citation convention in generated references. |

**File:** `scripts/library_index.ts` — Add `documentType` to `IndexEntry` interface so it appears in library search results.

## Acceptance Criteria

- [x] User is asked "chapter or page?" at pipeline start
- [x] Choice persists in `progress.json` for recovery
- [x] Chapter-cited skill looks the same as today (no regression)
- [x] Page-cited skill uses `(p. N)` format consistently across all reference files
- [x] Pass 2 cross-reference output uses the correct citation style
- [x] `book.json` includes `documentType` field
- [x] Few-shot example exists for page-based citations
- [x] Biome check passes (`npm run check`)

## Files to Change

| File | Change |
|------|--------|
| `commands/content-to-skill.md` | Add Step 1.5 citation prompt, thread style into subagent prompts (Pass 1 + Pass 2), update progress.json schema |
| `references/research-prompt.md` | Add citation format section, dual formats for quotes/headers/figures, add page-citation few-shot example |
| `references/skill-conversion.md` | Dual format for Key Quotes template, add `documentType` to book.json schema |
| `scripts/library_index.ts` | Add `documentType` to `IndexEntry` interface |

## What This Does NOT Change

- No changes to `chunk_document.ts` — chunking is format-agnostic
- No retroactive migration of existing skills
- No auto-detection heuristics — the user decides
- No changes to SKILL.md template — citation format only affects reference files and extractions

## References

- Commit `784c26f`: "Update citation format from page numbers to chapter references"
- `commands/content-to-skill.md:147` — Pass 2 hardcoded `(Ch. N)`
- `references/research-prompt.md:60` — Key Quotes format
- `references/skill-conversion.md:89-90` — Reference file Key Quotes template
