---
date: 2026-11-27
category: testing-patterns
problem_type: fixes to LLM-consumed prompt prose that no executable check reads open new gaps as they close old ones
components: [content-to-skill.md, research-prompt.md, tests/fixtures/prompts]
technologies: [slash-commands, subagent-prompts, markdown]
severity: medium
volatility: stable
paths: [commands/content-to-skill.md, references/research-prompt.md, tests/fixtures/prompts/]
replaces: []
related: [llm-consumed-contracts-and-test-fidelity-2026-05-04.md, prose-recipe-invokes-skill-not-paraphrase-2026-05-29.md]
---

# Fix rounds on a subagent prompt that nothing executable reads open new gaps as they close old ones

## Problem

A review of a new subagent prompt (Pass 1.5, flag verification, PR #24) raised six findings. Each was fixed by a separate fresh fixer, and every fix was correct at the site its finding named. The re-review then found two new gaps, and both came from how two of those fixes combined: one stopped writing a marker that another relied on, and one left a flag in place that a third rule expected to clear. No check in the repo could have caught either before the re-review, because nothing executable reads `commands/content-to-skill.md`.

## Context

The Pass 1.5 prompt tells a subagent how to check `[UNCLEAR]` and "not found" claims against the source text. Its behavior is defined by about fifteen lines of instructions that interact: which flags to collect, which to skip on a re-run, how to rewrite each outcome, and what goes into the results table that Pass 2 reads. The review findings each named one of those lines.

The fix round ran its fixers one at a time, each with tests green (`npm test`, 87 tests) and a clean pre-commit. The adversarial "breaker" step that normally tries to break each fix reported not-applicable on every finding: it mutates the code and checks that a test goes red, and no test reads this file.

The only behavioral evidence for the prompt was one hand-run on a made-up three-chunk fixture before the review. That fixture lived in a scratch directory and was never committed, so no one could re-run it after the fixes.

## Symptoms

- Every fix commit passes the test suite and the pre-commit hooks, and the suite never touched the changed file.
- The fix-findings breaker reports `not-applicable (no executable reader)` for every finding.
- The re-review closes the original findings and raises new ones whose cause is two earlier fixes taken together: a rule that refers to a marker another fix stopped writing, or a carry-over step that no longer has anything to carry over.

## Root Cause

Each finding is checked at its own site, but a prompt's behavior is the interaction of its rules, and the only thing that exercises the interaction is a model run on an input. With no such run in the loop, a fixer can confirm its own change is right and still break an assumption another rule makes. Here, the fix that stopped writing `[RESOLVED: chunk:line]` markers (so they would not leak into the published skill) made the recovery step's "skips flags already marked `RESOLVED`" untrue, and made a re-run drop the resolved rows from the table, since the table was then the only record of them (#22). The fix that left confirmed forward references out of the extraction (so a later chapter's content would not be copied in) also left their bracketed `[UNCLEAR]` flags in place for Pass 3 to read (#21).

## Learning Level

- **Level:** Pattern
- **Feedback loop or delay:** the same delayed-feedback structure as the dual-consumer lesson below: code edits get feedback in seconds, prompt edits only from a full model run. A fix round makes it worse, because it applies several prompt edits in a row and checks each one alone, so the interactions between them are first seen by the next review rather than by any run.

## Rule Scope

- **Applies when:** a change, or a round of fixes, edits instructions in an LLM-consumed prompt whose outcomes depend on each other: rewrite rules, skip rules, markers one step writes and another reads, a file one pass writes and a later pass reads.
- **Inverts or does not apply when:** the prompt's behavior is checked by code. If the prompt calls a script (as Step 4D calls `build_citation.ts`), test the script; the dual-consumer lesson covers that shape. A single, self-contained instruction (a tone line, a length limit) has no interactions to break.
- **Sibling docs:** [`llm-consumed-contracts-and-test-fidelity-2026-05-04.md`](../patterns/llm-consumed-contracts-and-test-fidelity-2026-05-04.md) names the same delayed feedback for prose that restates a function. [`prose-recipe-invokes-skill-not-paraphrase-2026-05-29.md`](../patterns/prose-recipe-invokes-skill-not-paraphrase-2026-05-29.md) is the single-source rule the C1 fix applied.

## Solution

Commit the fixture and make running it part of changing the prompt.

- `tests/fixtures/prompts/pass-1.5/` holds the three-chunk made-up book, the Pass 1 extractions as input, the expected `flag-verification.md`, and a README with the run steps and what each case checks. It covers a citation filed under the author's surname, a definition in a later chunk, a bracketed forward reference that a later chunk delivers, and a promised chapter that never delivers.
- `CLAUDE.md` › Testing says that a change to a subagent prompt with a fixture runs it and records the result in the PR's Review Notes, and that a prompt without a fixture gets one in the same PR.

The README's forward-reference case and its re-run check describe the behavior #21 and #22 ask for, so a run today shows those two gaps; that is the fixture doing its job.

## Prevention

**Code-level:** the fixture under `tests/fixtures/prompts/pass-1.5/`. It is a hand-run check, not an automated test: running it needs a model, which `npm test` does not have.

**Process-level:** the `CLAUDE.md` Testing rule above. In a fix round on prompt prose, run the fixture once after the last fixer, before the re-review, so the interactions are seen by a run rather than by the next reviewer.

## Defect Classification

**Origin phase:** Design error. The fixes each met their finding; the round had no step that checked them together.
**Fix type:** Correction for the missing check; #21 and #22 remain the corrections for the two gaps themselves.

## Key Decision

**Decision:** a committed hand-run fixture plus a written rule, rather than an automated test.
**Rationale:** the prompt's output depends on a model run. A test that greps the prompt's text would pin wording, not behavior, and break on every rewording.
**Alternatives considered:** a vitest test asserting phrases in the prompt (rejected, it checks prose not behavior); an LLM-backed eval in CI (no model access in this repo's test setup today).
**Revisable:** yes, when the repo gains a way to run a model in tests.

## Planning / Calibration Notes

- **What widened the work:** one review round became two, plus three follow-up issues (#21, #22, #23), all on the same fifteen lines of prompt.
- **Future planning adjustment:** when a slice adds or reshapes a subagent prompt, plan the fixture as part of the slice, not as a later nice-to-have.
- **Merge order for stacked PRs:** #24 was merged into its base branch before that branch's own PR merged into `main`, so its `Closes #19` never fired and the issue was closed by hand. Merge a stack bottom-up.

## Related

- PR #24 (the change and its fix round), PR #20 (the base it stacked on), issue #19
- Follow-ups: #21, #22, #23

## Shelf Life

When the repo can run a model in its test suite, replace the hand-run fixture with an automated eval and retire the CLAUDE.md rule.
