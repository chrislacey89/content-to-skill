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
   - Genre-specific required files:
     - **Prescriptive** (business, health, self-help, technical, whitepapers): also include `implementation-playbook.md` covering how to put the book's advice into practice — action sequences, prioritization, adherence strategies, and common execution pitfalls
     - **Literary fiction**: `core-framework.md` should cover the novel's central dialectic and *how it argues* (embodiment, consequence, irresolution, etc.); `rules-of-thumb.md` covers recurring patterns across the work. No `implementation-playbook.md`.
     - **Philosophy**: `core-framework.md` should cover the central argument and its logical structure; `rules-of-thumb.md` covers philosophical heuristics that can be applied in reasoning. No `implementation-playbook.md`.
     - **Poetry/drama**: `core-framework.md` should cover the primary formal-thematic relationship; `rules-of-thumb.md` covers patterns of technique. No `implementation-playbook.md`.
     - **Religious/spiritual**: `core-framework.md` should cover the core doctrinal structure; `rules-of-thumb.md` covers both theological heuristics and practice markers. Include `implementation-playbook.md` only if the work is primarily practice-oriented (e.g., a meditation manual), not for theology or scripture.
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

[The core framework, technique, or insight — this is the heart of the reference. Any direct quotes used here must include their citation: (Chapter [N]) or (p. [N]).]

## Why This Matters

[1-2 paragraphs: What situation, tension, or question does this address? For prescriptive books, describe the problem or mistake. For literary/philosophical works, describe the stakes — why this concept matters to the work and to the reader. Be concrete: name the competing forces, the failure mode, or the unresolved contradiction. Show what's at stake.]


## Good Examples

[2-3 concrete illustrations of this principle in action. For prescriptive books: examples of doing this correctly. For literary works: key scenes, character actions, or narrative moments that embody the principle. For philosophy: thought experiments, demonstrations, or cases that make the argument concrete. Use quotes from the book where available — always with their chapter or page citation.]

## Counterpoints

[2-3 examples that contrast with the key principle. For prescriptive books: common mistakes or antipatterns. For literary works: foil characters, opposing forces, or scenes that complicate the principle. For philosophy: counter-arguments or dialectical tensions. Show what goes wrong, what complicates, or what the strongest objection is — with specific examples. Use quotes from the book where available — always with their chapter or page citation.]

## Key Quotes

> "Direct quote from the book that captures this concept"
> — Author Name, Chapter [N] (or p. [N] for page-cited works)

[Include 2-4 memorable quotes. EVERY quote MUST include a chapter number, page number, or structural locator (Part, Act, Book, etc.) matching the skill's citation style. Never include a quote without its source location.]

## Rules of Thumb

- [Actionable heuristic 1]
- [Actionable heuristic 2]

## Related References

- [related-reference.md](./related-reference.md) - brief description of connection
```

### Genre-Specific Template Guidance

The template above is the universal structure. Each section should be *interpreted* differently depending on genre. The section names stay the same (for consistency), but what goes into them changes.

#### Literary Fiction

- **Key Principle** → the thematic or structural insight the work embodies — not an actionable framework, but a truth the novel demonstrates through narrative
- **Why This Matters** → the stakes of the dialectic — what competing forces are in play, what's at risk, why this tension matters beyond the novel
- **Good Examples** → key scenes that *embody* the principle through narrative consequence — characters whose fates test the idea, not just illustrate it
- **Counterpoints** → foil characters, competing forces, or scenes that *complicate* the principle — not "common mistakes" but genuine dialectical tensions the work stages
- **Rules of Thumb** → recurring patterns across the work — motifs, structural echoes, character parallels. These are observational patterns, not actionable advice for the reader
- **Additional section — "What Remains Unresolved"**: For literary works, add this section after Counterpoints when the work deliberately leaves tensions open. Describe what the author refuses to resolve and why that irresolution is itself meaningful.
- **Note for `core-framework.md`**: Include a "How the Novel Argues" paragraph explaining the work's method of argument — whether it argues through embodiment, consequence, dialectic, irony, juxtaposition, or some combination.

#### Philosophy / Essays

- **Key Principle** → the central argument or claim — stated as a philosophical position, not life advice
- **Why This Matters** → what problem or question this argument addresses, what's at stake if the argument fails
- **Good Examples** → thought experiments, demonstrations, or cases that make the argument concrete — the author's own illustrations of abstract claims
- **Counterpoints** → the strongest objections the author addresses, and how honestly — include the author's actual engagement with opposing views, not just strawmen
- **Rules of Thumb** → philosophical heuristics that can be applied in reasoning — these DO extract well from philosophy
- **Additional section — "Argumentative Sequence"**: When a reference file covers a multi-step argument, add this section to show how each claim connects to the next and to the work's broader logical structure.

#### Poetry / Drama

- **Key Principle** → the formal-thematic insight — how a specific technique creates specific meaning
- **Why This Matters** → what this formal choice achieves that no other choice could — the stakes of technique
- **Good Examples** → specific passages with formal analysis alongside thematic interpretation — always quote the actual text and show how its form produces its meaning
- **Counterpoints** → moments where the work subverts its own patterns — formal breaks, tonal shifts, deliberate violations of established expectations
- **Rules of Thumb** → patterns of technique — recurring formal strategies the author employs, not life advice

#### Religious / Spiritual

- **Key Principle** → for doctrinal references, the theological claim and its logical structure; for experiential references, the practice and what it produces
- **Why This Matters** → for doctrine, the theological stakes; for practice, the experiential stakes — what the practitioner encounters
- **Good Examples** → for doctrine, scriptural or traditional demonstrations; for practice, phenomenological descriptions of the experience itself
- **Counterpoints** → tensions within the tradition — competing interpretations, the gap between ideal teaching and actual practice
- **Rules of Thumb** → for doctrine, theological heuristics; for practice, experiential markers that indicate progress or common pitfalls

### Reference File Constraints

- Each file: 60-150 lines (acceptable range: 40-200)
- Self-contained: understandable without reading other references
- Preserve the author's voice and terminology
- Be specific: include concrete examples, not abstract advice
- Never fabricate content not in the source extraction
- Every direct quote (text in quotation marks attributed to the author) must include a citation — chapter number, page number, or structural locator. No exceptions.

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
> — Author Name, Chapter [N] (or p. [N])

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
8. **All quotes have citations** — every `> "..."` block and inline `"..."` quote attributed to the author includes a chapter, page, or structural reference

Fix any issues found before reporting completion.
