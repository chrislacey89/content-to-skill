---
name: counsel
description: "Consult the local book library for frameworks relevant to a task or decision, using metadata routing (each book's category, tags, and situational index) rather than blind full-text search. Use when the user says '/counsel <question>', 'consult the library', 'what do my books say about X', 'check the library before drafting', 'which framework applies here', or when another skill calls for a library counsel step. Output is a short counsel report: 2-4 frameworks, each cited to book-slug/references/file.md and applied to the task at hand. Read-only against the library."
---

# counsel: route to the right books, fetch their own distillations, cite everything

Turn a task or decision into targeted counsel from the local book library
managed by content-to-skill. The design principle: **the corpus carries its own
routing tables; use them.** Selection happens in each book's metadata
(`category`, `tags`) and its own situational index, not in raw search. Search is
a safety net for what routing missed, never the primary mechanism.

> Consumes the library that `/content-to-skill` builds and `/library` browses.
> Read-only against it. Sources operationalized below: *The Checklist Manifesto*
> (Gawande) for the run checklist and failure loop, *A Philosophy of Software
> Design* (Ousterhout) for the guaranteed-file gate, *The Design of Everyday
> Things* (Norman) for the Stage 0 signifier framing.

## Invocation Position

Direct-entry skill. Start here when the user wants library-grounded frameworks
for a live task or draft — `/counsel <question>`, "consult the library", "what
do my books say about X", "which framework applies here" — or when another skill
calls for a counsel step.

Do not use it to browse or load a single named book (that is `/library <name>`).
Do not use it when the user wants an answer from general knowledge rather than
*their* corpus. When invoked from another skill, counsel returns cited frameworks
as builder notes; the calling skill's register and voice win over anything a book
suggests (see Handoff).

## Why checklists here (Gawande)

Counsel is a multi-stage complex-work process — library resolution, domain
gating, per-book file selection, an optional recall net, and a telemetry loop.
Gawande's two failure modes both apply: **steps forgotten** (memory failure) and
**steps knowingly skipped** (rationalized skipping). The Procedure is the expert
work; the `Verification`, `Common Rationalizations`, and `Red Flags` sections are
the task checklist and pause-points that keep it reliable. They are kept separate
from the Procedure on purpose — combining a task checklist with its judgment gates
is a design error (Gawande's two-checklist model).

## Key facts

- **Resolve the library first (MANDATORY, before any Read).** Run:
  ```bash
  echo "${CLAUDE_LIBRARY_DIR:-$([ -f "$HOME/.claude/library/index.json" ] && echo "$HOME/.claude/library" || ([ -f "$(pwd)/.claude/library/index.json" ] && echo "$(pwd)/.claude/library" || echo "NOT_FOUND"))}"
  ```
  Save the output as `LIB`. If `NOT_FOUND`, tell the user the library is missing
  (checked `~/.claude/library/` and `./.claude/library/`) and suggest
  `/content-to-skill` to add a book or `CLAUDE_LIBRARY_DIR` to point at one. Stop.
- Manifest: `$LIB/index.json` — every book's `name` (slug), `title`, `author`,
  `category`, `tags`, `description`, `referenceFiles`. This is the routing table.
- Every book directory (`$LIB/books/<slug>/`): `book.json`, `SKILL.md`, and
  `references/*.md`. `book.json` carries the same `category`/`tags` as the manifest.
- Book SKILL.md structure: `Level 1: 30-Second Reference`, `Level 2: Situational
  Index` (situation -> guidance -> reference file), `Level 3: Concept Index (A-Z)`.
  Level 2 is the fetch mechanism.
- **Guaranteed files are not guaranteed across this corpus.** Many books have
  `references/core-framework.md` and `references/rules-of-thumb.md`, but a large
  fraction do not (content-to-skill does not force every book to emit them). Read
  them **when present**; otherwise fall back to the top 1-2 `referenceFiles` and
  the Level 2 index. Never assume a file exists — check, then read.
- Fetch files by **direct filesystem read** from the routed book's own directory
  (`$LIB/books/<slug>/references/<file>.md`). Never cite a raw search snippet as
  if it were the file — search points you at a book; you then read that book's
  file by path.
- Taxonomy health check: `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/category_tools.py`
  validates the corpus (category drift, book.json<->index.json drift, and
  guaranteed-file coverage). Advisory for counsel; run it when routing feels lossy.

## Procedure

### Stage 0: Classify the task and set the domain gate

Read the distinct `category` values present in `$LIB/index.json` (the corpus's
own shelves — there is no separate registry). Classify the request into a domain,
then build the allowlist from the categories whose shelf matches that domain. A
book is **in-gate if its `category` is allowlisted, OR one of its `tags` matches
the domain.** Everything off-gate is excluded unless the user names it explicitly.

Stage 0 is the soft joint of the whole pipeline: every downstream stage is a clean
lookup, but this one is judgment. A misclassification here silently excludes the
right books, and the only net is the search you are about to deliberately weaken.
Read the world's signifier — the actual categories and tags present in the
manifest — rather than guessing shelves from memory (Norman).

### Stage 1: Route to books via the manifest

Rank the in-gate books by `category` fit, `tags`, and `description` match against
the task. Pick 3-5. Confirm each pick by its SKILL.md frontmatter `description`
(written as a "use when" trigger). If a book the user named is missing from the
manifest, fall back to `ls $LIB/books/` and the book's SKILL.md frontmatter (the
manifest is regenerated and can lag; a missing entry is a warning, not a blocker).

### Stage 2: Select files via each book's Level 2 Situational Index

For each routed book, read its SKILL.md and use the `Level 2: Situational Index`
to pick the 1-2 reference files matching the situation. Also read
`references/core-framework.md` and `references/rules-of-thumb.md` **if they
exist**; if a book lacks them, fall back to its top `referenceFiles` from the
manifest. Direct filesystem reads only — check existence, then read.

### Stage 3: One recall-net pass for what routing missed (optional)

A lexical net over the reference prose catches books the gate missed. Prefer
ripgrep; fall back to grep; if neither is available or the corpus is large, skip
it — routing still works without this stage.

```bash
rg -l -i "<task-shaped keywords>" "$LIB/books"/*/references/*.md 2>/dev/null | head -8
```

Keep only hits from books OUTSIDE the routed set. For each, check that book's
manifest entry before admitting it: an off-gate book enters the counsel only with
an explicit one-line justification ("admitted despite category X because ..."). The
net decides recall, never domain. Then read the hit's file by path (Stage 2 rules).

### Stage 4: Synthesize the counsel report

```
## Counsel: <restated task>

Consulted: <slug>, <slug>, <slug> (routed); <slug> (net-admitted: reason)

### 1. <Framework name> (<book title>)
<2-4 sentences applying it to THIS task, not summarizing the book.>
Source: <slug>/references/<file>.md

### 2. ...

### Tension or gap (if any)
<Where the frameworks disagree, or what the library has nothing on.>
```

2-4 frameworks maximum. Application over summary: every framework paragraph must
say what to DO in the task at hand.

### Stage 5: Log the run (the failure-investigation loop)

Append one line to `$(dirname "$LIB")/counsel-runs.tsv` (alongside the library,
never inside it) recording what routed and what the net had to rescue. **An
off-gate net-admission is a routing miss confessing itself**; this log is how those
misses become visible, so the gate can be corrected (re-tag or re-file the book)
instead of silently losing recall. This is Gawande's failure-investigation loop:
the log surfaces the miss, `category_tools.py` investigates corpus health, and the
next `/content-to-skill` regeneration updates the metadata.

    printf '%s\t%s\t%s\t%s\t%s\n' "$(date +%F)" "<domain>" "<routed-slugs,csv>" "<net-admitted-slugs,csv or ->" "<one-line note or ->" >> "$(dirname "$LIB")/counsel-runs.tsv"

## Verification (DO-CONFIRM — perform the run from the Procedure, then confirm before emitting)

Run from the Procedure as an expert would, then pause and confirm against this
list. DO-CONFIRM, not READ-DO: READ-DO triggers status resistance in autonomous
contexts and produces non-use (Gawande). Killer checks first — these are the
trust-killers; never skip one.

- [ ] Every framework cites `slug/references/file.md` — zero uncited claims
- [ ] No stretch — where the library was thin, that was said in one line, not padded
- [ ] Every cited file was read by direct filesystem path from its own book's dir
- [ ] `LIB` was resolved this run; the gate was built from the manifest's real categories/tags
- [ ] Each routed book was confirmed via its SKILL.md frontmatter `description`
- [ ] For each routed book, `core-framework.md`/`rules-of-thumb.md` were read if present, else a fallback reference file was
- [ ] The run was logged to `counsel-runs.tsv` (Stage 5), including any net-admission

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The task is obviously this shelf — I'll skip reading the manifest's categories." | Stage 0 is the soft joint of the whole pipeline. A misgate silently excludes the right books, and the only net is the search you are about to deliberately weaken. Read the real categories/tags (Norman: read the signifier, don't guess from memory). |
| "core-framework.md must exist, I'll just read it." | It does not exist for a large fraction of this corpus. Check first, then read — or fall back to the book's top `referenceFiles`. Reading a path blindly errors mid-run. |
| "This search snippet is enough to cite." | A snippet points you at a book, not at a verified source line. Read that book's file by path and cite the file, or the citation may misrepresent it. |
| "The library's thin here, but I can synthesize something useful." | A padded answer is the one failure that kills the skill's trust. Return the thin honest answer and stop. |
| "This category has never been mis-gated before, so I can eyeball it." | Gawande: "this has never been a problem before" is evidence of rationalized skipping, most likely used for the step most likely to cause harm when it finally fails. |

## Red Flags

- Reading `core-framework.md` / `rules-of-thumb.md` without checking they exist first.
- A framework paragraph that summarizes the book instead of saying what to DO in this task.
- More than 4 frameworks, or a routed book whose selected file was never actually read.
- A counsel report emitted with no `counsel-runs.tsv` line appended.
- The Stage 0 gate built from remembered shelves instead of the manifest's real categories.
- Citations leaking into visitor-facing copy rather than builder notes.

## Handoff

- **Expected input**: a task, draft, or decision to seek counsel on, or an
  invocation from another skill that needs a counsel step.
- **Produces**: a counsel report — 2-4 frameworks, each cited to
  `slug/references/file.md` and applied to the task — plus one telemetry line in
  `counsel-runs.tsv`.
- **Returns control to**: the calling skill when invoked as a step. Counsel
  informs; it never overrides. The caller's register and voice win over anything a
  book suggests; citations go in builder notes, never in visitor-facing copy.
- **Feeds downstream**: `counsel-runs.tsv` and `category_tools.py` surface routing
  and corpus gaps that a future `/content-to-skill` regeneration can fix.

## Hard rules

- **Cite every framework** to `slug/references/file.md`. No uncited claims.
- **Never stretch.** If the library has little on the topic, say so in one line and
  stop. A thin honest answer preserves trust; a padded one kills the skill.
- **Counsel informs; it never overrides.** When invoked from another skill, that
  skill's register rules and ratified voice win. Citations go in builder notes or
  the working session, never in visitor-facing copy.
- **Read-only against the corpus.** Never modify the resolved library
  (`books/`, `index.json`). The sole write is appending one telemetry line per run
  to `counsel-runs.tsv`, which lives *beside* the library, not inside it.
