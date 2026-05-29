---
date: 2026-05-04
category: patterns
problem_type: dual-consumer contract drift
components: [content-to-skill.md, build_citation.ts, fetch_docs_repo.ts]
technologies: [slash-commands, subagent-prompts, vitest]
severity: high
volatility: stable
---

# LLM-consumed contracts drift from their code-side counterparts; tests must pin the AC's literal invocation, not the contract's locked example

## Problem

When an algorithm is implemented as both a TypeScript function (consumed by code) and a prose recipe inlined into a subagent prompt (consumed by an LLM), the two drift silently. Unit tests pinned to the locked-contract example pass while the LLM-readable prose follows a different rule — and the LLM is the one running in production.

This repo's slash commands inline algorithm descriptions into Step 4D-style subagent prompts; those subagents are the *primary* consumers of those algorithms today. The TypeScript function is the secondary consumer, used only by future verification code.

## Context

Slice #6 (PR #11, #14) shipped the docs pipeline (Steps 1D-6D). The PRD locked `buildCitation(filePath, headingText, siteBase, docsRoot)` and gave an example with `docsRoot: "content/src/content/docs/docs"` (the full Starlight content root). The slice-issue acceptance criteria gave a different example: `--docs-root content/src/content/docs/docs/error-management` (a subtree). Both were defensible in isolation; they diverged silently.

The `commands/content-to-skill.md` Step 4D prose recipe described the URL algorithm in words: `<site-base>/<docsRoot-last-segment>/<rel-path>/`. The subagent reads the prose, not the function. The 13 unit tests on `buildCitation` all used the PRD's locked-example form, so they passed. The end-to-end demo passed only because the operator hardcoded the URL pattern into the subagent prompt as a manual workaround.

Result: a function that worked correctly for its locked-example invocation, but produced wrong URLs for the AC's literal demo command. Caught only because the operator noticed and reported it post-install.

## Symptoms

- Function tests green; `npm test` clean
- LLM subagent produces output that "looks right" but encodes a different rule than the function would
- Bug surfaces at integration time — when prose-derived output is verified against function-derived output, or against an external ground truth (e.g., live website anchors)
- The same algorithm described in two places, with no mechanical guarantee they stay in sync

## Root Cause

Two interacting causes:

1. **Two sources of truth for one algorithm.** A pure function in `scripts/build_citation.ts` and a prose recipe in `commands/content-to-skill.md` Step 4D each independently described the URL construction. The LLM consumer of the prose has no way to invoke the function; it follows whatever the prose says. Drift is the *default* state — staying in sync requires deliberate effort that is easy to miss during edits.

2. **Tests pinned to the locked contract's example, not the AC's literal invocation.** Every `buildCitation` unit test used `docsRoot="content/src/content/docs/docs"` because that was the form in the PRD's locked example. The AC's demo command used `docsRoot="content/src/content/docs/docs/error-management"`. The tests had no case for the demo command's actual values, so the divergence between contract and AC went undetected.

## Learning Level

- **Level:** Pattern
- **Feedback loop or delay:** Code-side feedback (tests, typecheck, biome) runs in seconds. LLM-prose feedback requires a full end-to-end run, which costs minutes and a subagent budget. The asymmetry creates a delayed-feedback structure: prose drift accumulates between fast feedback cycles and is only detected when the slow cycle runs. Combined with "tests pin the contract's example, not the AC's command," the drift can ship.

## Rule Scope

- **Applies when:** A slash command's subagent prompt body describes an algorithm that is also implemented as a TS function in `scripts/`. This is the *normal* shape in this repo — book Pipeline (Pass 1/2/3 prompts + chunker), repo Pipeline (Step 2R prompt + extractors), docs Pipeline (Steps 4D/5D prompts + build_citation/fetch_docs_repo). Any future slice that adds a new algorithm in a similar dual-consumer position should follow the rule below.
- **Inverts or does not apply when:** The contract has only one consumer — either pure TS code (no LLM ever reads the prose recipe) or pure LLM prose (no code path ever invokes the function). For pure-code contracts, standard test discipline catches drift. For pure-prose contracts, the function is dead weight and should be deleted.
- **Sibling docs:** [`prose-recipe-invokes-skill-not-paraphrase-2026-05-29.md`](./prose-recipe-invokes-skill-not-paraphrase-2026-05-29.md) — the same single-source-of-truth principle for the case where the "function" is an invokable skill and the prose delegates by invoking it rather than paraphrasing its workflow. Slice-#7+ work should add further adjacent entries when the parallel-extraction or auto-split contracts surface their own dual-consumer questions.

## Solution

**Single source of truth = the function. Prose recipes invoke the function, not paraphrase its rules.**

In `commands/content-to-skill.md` Step 4D, the citation construction prose was rewritten:

**Before** (paraphrase that drifted):
```markdown
## Citation Construction
For every citation, the URL must be constructed by `scripts/build_citation.ts`. Format:
  <site-base>/<docsRoot-last-segment>/<rel-path-without-extension>/#<heading-slug>
```

**After** (invocation that can't drift):
```markdown
## Citation Construction
For every citation, invoke `scripts/build_citation.ts` (do not paraphrase the
algorithm). [...] Then call:

  npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/build_citation.ts <filePath> <heading> <siteBase> <docsRoot>
```

`scripts/build_citation.ts` gained a `if (isMain)` CLI block at the bottom so the prose's `npx tsx` instruction actually works without the subagent needing to import the module.

For the test gap, two regression tests were added:

1. `buildCitation` test pinning the AC's literal invocation (`docsRoot=content/src/content/docs/docs`, file path under a subtree). Pins the contract example.
2. `walkAndGroup` test that walks a subtree (via the new optional `walkSubtree` parameter) but anchors `Manifest.docsRoot` and `relPath` at the content root. Pins the demo command's structural shape.

The function itself was extended (not changed) — `walkAndGroup` accepts an optional `walkSubtree` parameter so the operator can walk a subtree of a larger Starlight content root while keeping URL math anchored at the root.

## Prevention

**Code-level:**

- For every algorithm in this repo's `scripts/` that has a prose counterpart in `commands/*.md`, the prose should invoke the function (via CLI or import) rather than describe its rules. Audit existing pipelines (book, repo) for paraphrased recipes the next time those pipelines are touched.
- Unit tests must include at least one case using the AC's literal invocation values, not just the locked-contract example. When the PRD and the slice issue give different example values, write tests for both shapes — the divergence is the lesson.
- Functions that are also exposed as CLIs should have a tiny `if (isMain)` block; this both (a) lets the prose recipe invoke them and (b) makes the function self-documenting at the shell.

**Process-level:**

- `/write-a-prd`'s output should ensure the AC's "End-to-end demo" command and the PRD's "Locked contract example" use **structurally identical input shapes**. If the AC says `--docs-root <subtree>` but the contract example uses `<content-root>`, that's a specification error — either the AC's command or the contract's example needs to change so they match. Otherwise unit tests against the contract example will pass while the AC's command produces wrong output.
- `/pre-merge` Dimension 1 (Deep Modules / information leakage) already catches the two-sources-of-truth pattern when an algorithm appears in two places. The pre-merge review on PR #11 *did* flag it as a Concern; it just wasn't fixed before the demo. Future runs should treat dual-source findings as blocking, not advisory, when both sources will be touched by the same change.
- `/research`'s output should pin known-tricky AC examples to the contract's locked form before slice issues are created. The slice-#6 AC example was authored without checking that its `--docs-root` value matched the PRD's locked-example shape.

## Planning / Calibration Notes

- **What widened the work:** The contract-vs-AC inconsistency cost ~30 minutes during pre-merge review (Concern flagged but not blocked) plus ~45 minutes post-demo (regression tests, walkSubtree parameter, prose recipe rewrite, CLI mode, recovery from a botched merge). Estimated under "tracer bullet" appetite; held within scope despite the rework.
- **What tightened the work:** The PRD's locked types and example values made the function's signature unambiguous to write. The research artifact's "use github-slugger" recommendation eliminated an entire class of slugify drift before it could happen. Both are worth more than the rabbit-holes section that did not name this defect class.
- **Future planning adjustment:** `/write-a-prd` and `/prd-to-issues` should add a "AC ↔ contract example reconciliation" step. Concretely: before locking a slice issue, run the PRD's locked-contract example through the AC's literal command and verify they produce the same output. If they don't, one of them is wrong.

## Actuals Worth Reusing

- **Comparable future work:** Slices #7-#10 (parallel extraction, synthesis hardening, quality check, manual QA on full Effect docs) — every one of these will extend an algorithm currently described in both prose and code. Each is a recurrence of this pattern.
- **Reusable baseline:** A tracer-bullet slice that touches all three layers (TS scripts + tests + slash-command prose) lands at ~1,200 LOC across ~8 files. Roughly 15-20% of that is the slash-command prose; the rest is code + tests. Pre-merge review surfaces 5-7 advisory findings on a diff this size, of which 1-2 are typically Concerns worth fixing pre-merge.

## Defect Classification

**Origin phase:** Specification error. The PRD's locked-contract example and the slice issue's AC example used different forms of `--docs-root`. The function's behavior was internally consistent; the specification was inconsistent across documents.

**Fix type:** Correction. `walkAndGroup` was extended to support both shapes (`walkSubtree` optional parameter); regression tests pin both invocations. The single-source-of-truth fix on the prose recipe addresses the upstream class. Process change (AC↔contract reconciliation in `/write-a-prd` and `/prd-to-issues`) is the structural prevention.

## Key Decision

**Decision:** Prose recipes in `commands/*.md` for subagent prompts must invoke functions in `scripts/` rather than paraphrase their algorithms. Functions exposed in this dual-consumer position get a small `if (isMain)` CLI block.

**Rationale:** Eliminates the drift class. Single source of truth. Prose changes can't accidentally encode a different rule than the code; if the function changes, the prose's invocation changes nothing because it calls the same function with the same args.

**Alternatives considered:**
- Generate the prose from the code (e.g., `npm run sync-prose`). Rejected: adds tooling burden and doesn't address the test-fidelity half of the pattern.
- Rely on `/pre-merge` Dimension 1 to catch drift. Rejected: review caught it on PR #11 but it shipped anyway because the Concern was advisory, not blocking. Process discipline alone doesn't substitute for a structural fix.

**Revisable:** Yes — if a future contract has so many parameters that the CLI invocation becomes unreadable in prose, fall back to "import the function" with a minimal usage example. The principle (single source of truth) holds; the implementation can adapt.

## Related

- PR #11 (initial slice ship — citation fix missed by merge)
- PR #14 (recovery PR with the citation fix)
- Issue #6 (Slice 1: tracer end-to-end)
- Issue #5 (PRD: docs-to-skill)
- Research: `~/.claude/research/chrislacey89-content-to-skill/url-to-skill-2026-05-01.md` (archive-mode; openable only on the originating user's machine)
- Sibling pattern: [`prose-recipe-invokes-skill-not-paraphrase-2026-05-29.md`](./prose-recipe-invokes-skill-not-paraphrase-2026-05-29.md) (PR #15)

## Shelf Life

Stable. The pattern recurs whenever this repo (or any plugin built like it) inlines algorithms into subagent prompts. The recommendation expires only if the project moves to a different LLM-consumer model — e.g., subagents that import TS modules directly without prose mediation, or a code-generated prose pipeline that mechanically syncs the two. Neither is on the roadmap for the docs pipeline's remaining slices.
