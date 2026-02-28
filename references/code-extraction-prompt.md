# Code Exercise Extraction Methodology

You are extracting the teaching content from a single code exercise — specifically the delta between problem and solution files. The learning lives in what changed and why.

## Extraction Priorities

Extract in order of importance:

1. **Concept/Principle** — What concept does this exercise teach?
2. **Problem pattern** — What gap, mistake, or incompleteness exists in the problem code?
3. **Solution pattern** — What is the correct approach demonstrated?
4. **The delta** — What specifically changed between problem and solution, and why? (This is the core output)
5. **Before/After code** — Minimal, focused snippets showing only the meaningful changes
6. **Common mistakes** — What would a learner likely get wrong?
7. **Rules of thumb** — Concise heuristics a practitioner should remember
8. **Connections** — How does this exercise relate to others in the module or course?

## Processing Rules

- Read all problem files first, then all solution files
- Diff them mentally — identify every meaningful change
- Ignore whitespace, formatting, import order changes unless they are the point
- If the exercise README explains the "why", incorporate it — but the code delta is primary
- Flag any ambiguity with `[UNCLEAR: reason]`
- Preserve exact code for before/after examples — do not paraphrase code
- Never fabricate content not present in the source files

## Output Structure

Generate markdown with YAML frontmatter in this exact structure:

```markdown
---
exercise_id: "MM.NN"
module: "module-name"
slug: "exercise-slug"
concept: "Primary concept being taught"
difficulty: "beginner|intermediate|advanced"
---

# exercise-slug (module-name)

## Concept
[1-2 sentences: What principle or technique does this exercise teach?]

## Problem Pattern
[What does the problem code look like? What's missing or incomplete? What gap must the learner fill?]

## Solution Pattern
[What does the correct implementation look like? What approach does the solution demonstrate?]

## The Delta
[The core extraction. What specifically changed between problem and solution? For each change:]

### Change 1: [brief label]
**Why**: [Why this change matters]

**Before** (problem):
```[language]
[exact code from problem file]
```

**After** (solution):
```[language]
[exact code from solution file]
```

**Key insight**: [One sentence explaining what this teaches]

[Repeat for each meaningful change]

## Rules of Thumb
- [Concise heuristic 1]
- [Concise heuristic 2]

## Common Mistakes
- [What learners typically get wrong and why]

## Connections
- **Builds on**: [Previous exercises/concepts this depends on]
- **Leads to**: [What this enables in later exercises]
- **Related**: [Other exercises teaching similar concepts]
```

## Quality Standards

- Every code snippet must be exact — copied from the source, not paraphrased
- The delta section is the most important part — be thorough
- Each "Key insight" should be one actionable sentence
- Rules of thumb should be memorable and concise enough to recall during coding
- If the exercise has no meaningful delta (e.g., setup-only), note this explicitly
