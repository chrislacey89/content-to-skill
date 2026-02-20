# Skill Conversion Methodology

This document defines how to convert an extraction summary and per-chunk extractions into a complete Agent Skill package (SKILL.md + reference files).

## Overview

A skill package consists of:

```
<skill-name>/
├── SKILL.md              # Entry point with progressive disclosure
└── references/
    ├── core-framework.md  # 8-15 reference files
    ├── ...
    └── rules-of-thumb.md
```

## Step 1: Plan Reference Files

Read `EXTRACTION_SUMMARY.md` and plan 8-15 reference files. For each, identify:

- **Filename**: kebab-case, e.g., `core-framework.md`
- **Title**: human-readable name
- **Source chapters**: which extraction chunks to draw from
- **Impact level**: CRITICAL, HIGH, MEDIUM, or LOW
- **Summary**: 2-3 sentence description

### Guidelines for Planning

1. One reference per major concept or chapter grouping — do not over-split
2. Target 8-15 references total
3. Always include:
   - A `core-framework.md` for the book's main thesis
   - A `rules-of-thumb.md` for collected heuristics
4. Impact levels:
   - **CRITICAL**: Core framework, must-know concepts
   - **HIGH**: Important techniques, common mistakes
   - **MEDIUM**: Supporting concepts, situational advice
   - **LOW**: Nice-to-know, edge cases

Write the plan as a JSON array to `reference-plan.json`:

```json
[
  {
    "filename": "core-framework.md",
    "title": "The Core Framework",
    "sourceChapters": [1, 2],
    "impact": "CRITICAL",
    "summary": "The book's central thesis and primary model."
  }
]
```

## Step 2: Create Reference Files

Process the plan in batches of 3-4 files. For each file, read the relevant `extraction-chunk-NNN.md` files and write the reference to the skill's `references/` directory.

### Reference File Template

Each reference file must follow this structure:

```markdown
---
title: [Title]
impact: [CRITICAL|HIGH|MEDIUM|LOW]
tags: [tag1, tag2, tag3]
chapter: [chapter number or range]
---
## Key Principle

[The core framework, technique, or insight — this is the heart of the reference]

## Why This Matters

[1-2 paragraphs: What situation, tension, or question does this address? For prescriptive books, describe the problem or mistake. For literary/philosophical works, describe the stakes — why this concept matters to the work and to the reader.]


## Good Examples

[2-3 concrete illustrations of this principle in action. For prescriptive books: examples of doing this correctly. For literary works: key scenes, character actions, or narrative moments that embody the principle. For philosophy: thought experiments, demonstrations, or cases that make the argument concrete. Use quotes from the book where available.]

## Counterpoints

[2-3 examples that contrast with the key principle. For prescriptive books: common mistakes or antipatterns. For literary works: foil characters, opposing forces, or scenes that complicate the principle. For philosophy: counter-arguments or dialectical tensions. Use quotes from the book where available.]

## Key Quotes

> "Direct quote from the book that captures this concept"
> — Author Name, Chapter [N]

[Include 2-4 memorable quotes]

## Rules of Thumb

- [Actionable heuristic 1]
- [Actionable heuristic 2]

## Related References

- [related-reference.md](./related-reference.md) - brief description of connection
```

### Reference File Constraints

- Each file: 60-150 lines (acceptable range: 40-200)
- Self-contained: understandable without reading other references
- Preserve the author's voice and terminology
- Be specific: include concrete examples, not abstract advice
- Never fabricate content not in the source extraction

## Step 3: Create SKILL.md

The SKILL.md file is the entry point. It uses 3-level progressive disclosure so the agent reads only what it needs.

### SKILL.md Template

```markdown
---
name: [skill-name]
description: "[One-sentence description of when to use this skill.]"
---

# [Book Title] - Quick Reference

## Level 1: 30-Second Reference

### The Core Framework
- [3-5 bullet points capturing the book's essential insight]

### Quick Lookup

| Situation | Do This | Avoid This |
|-----------|---------|------------|
| [common situation 1] | [recommended action] | [common mistake] |
| [common situation 2] | [recommended action] | [common mistake] |

### The Key Insight
> "[The single most important quote from the book]"
> — Author Name

---

## Level 2: Situational Index

### "I need to..."

| Goal | Read This |
|------|-----------|
| [Understand the core framework] | [core-framework.md](references/core-framework.md) |
| [Handle situation X] | [relevant-reference.md](references/relevant-reference.md) |

### Common Scenarios

**When [scenario 1]:**
See [reference-name.md](references/reference-name.md) for [brief description]

**When [scenario 2]:**
See [reference-name.md](references/reference-name.md) for [brief description]

[Include 5-8 common scenarios]

---

## Level 3: Concept Index (A-Z)

| Concept | Definition | Details |
|---------|------------|---------|
| **[Term A]** | [One-line definition] | [reference-file.md](references/reference-file.md) |
| **[Term B]** | [One-line definition] | [reference-file.md](references/reference-file.md) |

[Include 15-25 key terms from the book]

---

## All References

| Reference | Impact | Description |
|-----------|--------|-------------|
| [core-framework.md](references/core-framework.md) | CRITICAL | [summary] |
| [reference-2.md](references/reference-2.md) | HIGH | [summary] |
```

### SKILL.md Constraints

- Under 500 lines total
- No `triggers` field in frontmatter (Claude Code matches skills by name and description)
- Name in frontmatter must match the directory name
- Use relative paths for all reference links: `references/filename.md`
- Use tables and lists, not prose paragraphs — optimize for scannability
- All linked reference files must exist

## Step 4: Generate book.json

Create a `book.json` metadata file for library indexing. This file enables the `/library` command to catalog and search books without reading each SKILL.md.

### book.json Schema

```json
{
  "name": "the-prince",
  "title": "The Prince",
  "author": "Niccolo Machiavelli",
  "year": 1532,
  "category": "business",
  "tags": ["political-strategy", "leadership", "power-dynamics", "realpolitik"],
  "description": "Machiavelli's political realism framework for power acquisition, retention, and leadership strategy.",
  "referenceFiles": ["references/core-framework.md", "references/rules-of-thumb.md"]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Kebab-case skill name (matches directory name) |
| `title` | Yes | Full book title |
| `author` | No | Author name(s) |
| `year` | No | Publication year (integer or null) |
| `category` | No | Single category: `business`, `technical`, `self-help`, `health`, `science`, etc. |
| `tags` | No | 3-7 kebab-case tags for search/filtering |
| `description` | Yes | One-sentence description (reuse from SKILL.md frontmatter) |
| `referenceFiles` | No | Array of relative paths to all reference files |

### How to Generate

1. Read `EXTRACTION_SUMMARY.md` for title, author, year, and category
2. Reuse the `description` from the SKILL.md frontmatter
3. List all files in the `references/` directory for `referenceFiles`
4. Infer 3-7 tags from the book's key themes and terminology
5. Write to `book.json` alongside SKILL.md

## Step 5: Self-Verify

After creating all files, verify:

1. **All reference files linked in SKILL.md exist** — check every `references/*.md` link
2. **SKILL.md is under 500 lines** — count with `wc -l`
3. **All relative paths are correct** — links use `references/` prefix
4. **Frontmatter is valid** — name matches directory name, description is present
5. **Reference files have valid frontmatter** — title, impact, tags, chapter fields
6. **Reference files are 40-200 lines each**
7. **book.json is valid** — has required fields (name, title, description), referenceFiles matches actual files

Fix any issues found before reporting completion.
