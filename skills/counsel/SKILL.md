---
name: counsel
description: "Consult the local book library for frameworks relevant to a task or decision, using metadata routing over the whole corpus (every book's tags, category, and situational index) backed by a ranked full-text recall net. Use when the user says '/counsel <question>', 'consult the library', 'what do my books say about X', 'check the library before drafting', 'which framework applies here', or when another skill calls for a library counsel step. Output is a short counsel report: 3-5 frameworks, each cited to book-slug/references/file.md and applied to the task at hand. Read-only against the library."
---

# counsel: route to the right books, fetch their own distillations, cite everything

Turn a task or decision into targeted counsel from the local book library
managed by content-to-skill. The design principle: **the corpus carries its own
routing tables; use them — all of them.** Selection happens in each book's
metadata (`tags`, `category`, `description`) and its own situational index, read
across the **whole** corpus every run; `category` ranks and never excludes. A
ranked full-text net then checks what the metadata missed. Search never supplies a
citation — it only points at a book whose file you then read.

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

Counsel is a multi-stage complex-work process — library resolution, a
whole-corpus scan, per-book file selection, a recall net, and a telemetry loop.
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
  `category`, `tags`, `description`, `referenceFiles`. It is far too large to read
  whole. **The routing table is its projection**:
  `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/category_tools.py manifest` prints one
  row per book (slug, category, tags) — cheap enough to scan the entire corpus
  every run; add `--full --slug a,b,c` for the descriptions of a longlist. It is
  built from each `book.json`, so it never lags a stale `index.json`. If the
  script is unavailable, produce the same rows from `index.json` with `jq`.
- Papers and essays are converted into `books/` like everything else (the
  `papers/` directory holds only their sources), so the routing table covers them.
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

### Stage 0: Scan the whole corpus and build a longlist

Print the routing table — one row per book (slug, category, tags), a few thousand
tokens for the entire corpus — and read **all of it**:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/category_tools.py manifest
```

Name 2-3 **angles** on the task, not one domain: the literal subject (a one-page
brief), the underlying mechanism (persuasion, attention, a decision under
uncertainty), and an adjacent or dissenting angle (what would argue against the
obvious advice). Then build a longlist of 8-12 books whose `tags` or slug match
any angle, from **any** shelf.

`category` ranks; it never excludes. The shelves are coarse and inconsistent —
books on one subject routinely sit on three different shelves, and a single
shelf can hold a quarter of the corpus — so a category allowlist silently drops
the right books and then reports the library as thin. Read the world's signifier —
the actual rows — rather than guessing shelves from memory (Norman).

### Stage 1: Confirm the longlist and pick 4-6 books to read

Pull the longlist's descriptions (each is written as a "use when" trigger):

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/category_tools.py manifest --full --slug <slug,slug,...>
```

Pick 4-6 to read. Two breadth rules apply before the pick is final:

- **Cover the angles.** At least one pick must come from outside the shelf that
  dominates the longlist, provided its description genuinely fits one of the
  angles. Breadth never outranks fit: if no outside book fits, pick none and say
  "no off-shelf fit" in the log note rather than seating a weak one.
- **Challenge the usual suspects.** List the most-routed books so far:
  ```bash
  cut -f3 "$(dirname "$LIB")/counsel-runs.tsv" 2>/dev/null | tr ',' '\n' | sort | uniq -c | sort -rn | head -8
  ```
  A book on that list keeps its seat only if it beats a named fresh alternative
  from the longlist for THIS task. Familiarity is not fit.

If a book the user named has no row, fall back to `ls $LIB/books/` and the book's
SKILL.md frontmatter (a missing entry is a warning, not a blocker).

### Stage 2: Select files via each book's Level 2 Situational Index

For each picked book, read its SKILL.md and use the `Level 2: Situational Index`
to pick the 1-2 reference files matching the situation (some books have no Level
2; use `Level 3` or the file names). Also read `references/core-framework.md` and
`references/rules-of-thumb.md` **if they exist**; if a book lacks them, fall back
to its top `referenceFiles`. Direct filesystem reads only — check existence, then
read.

### Stage 3: Recall-net pass for what the tags missed (MANDATORY)

Tags are sparse — most are used by exactly one book — so a book can hold the
right chapter under tags that never mention it. A lexical net over each book's
indexes and reference prose catches those. Search in the **books' vocabulary**,
not only the user's: 3-5 terms including the synonyms and named concepts an author
would use. Rank by hits per book (prefer ripgrep; fall back to `grep -c`):

```bash
rg -c -i -e "<term>" -e "<term>" -e "<term>" "$LIB/books"/*/SKILL.md "$LIB/books"/*/references/*.md 2>/dev/null \
  | awk -F: '{n=split($1,p,"/"); for(i=1;i<=n;i++) if(p[i]=="books") s=p[i+1]; c[s]+=$NF} END{for(s in c) print c[s]"\t"s}' \
  | sort -rn | head -15
```

Look at high-ranking books that are NOT already picked. Check each one's row
(`manifest --full --slug <slug>`), and admit it — swapping out the weakest pick if
needed — with a one-line justification ("net-admitted: 40 hits on sunk cost, tags
say only 'decision-making'"). Then read its file by path (Stage 2 rules).

A hit count is a lead, never a verdict. Prefer multi-word phrases and named
concepts over common words: a word like "leverage" or "prototype" means something
different in a systems book, a code book, and a career book, and will rank the
wrong ones highly. Reject a high-scoring book when its description shows the term
is used in another sense — say so in one clause — and treat a single stray hit as
noise.

**A "the library is thin on this" claim is only allowed after both the whole-corpus
scan and this net pass came up empty** — and the report must name the terms tried.

### Stage 4: Synthesize the counsel report

```
## Counsel: <restated task>

Consulted: <slug>, <slug>, <slug> (routed); <slug> (net-admitted: reason)
Also on the shelf, not read: <slug>, <slug> (longlisted, cut — ask to pull any)

### 1. <Framework name> (<book title>)
<2-4 sentences applying it to THIS task, not summarizing the book.>
Source: <slug>/references/<file>.md

### 2. ...

### Tension or gap (if any)
<Where the frameworks disagree, or what the library has nothing on.>
```

3-5 frameworks (more only if the user asks for a survey). Application over
summary: every framework paragraph must say what to DO in the task at hand. The
"not read" line is how breadth stays visible without padding the report: the user
sees what else the corpus holds and can ask for it.

### Stage 5: Log the run (the failure-investigation loop)

Append one line to `$(dirname "$LIB")/counsel-runs.tsv` (alongside the library,
never inside it) recording what routed and what the net had to rescue. **A
net-admission is a metadata miss confessing itself** — the book was right and its
tags did not say so; this log is how those misses become visible, so the book can
be re-tagged or re-filed instead of silently losing recall. The same log feeds
Stage 1's usual-suspects check. This is Gawande's failure-investigation loop:
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
- [ ] `LIB` was resolved this run; the WHOLE routing table was scanned — no book was excluded by `category`
- [ ] The longlist had 8-12 books across 2-3 angles; any usual suspect kept its seat against a named alternative
- [ ] The Stage 3 net pass ran, in the books' vocabulary; any "library is thin" claim names the terms tried
- [ ] Each routed book was confirmed via its `description` (`manifest --full`)
- [ ] For each routed book, `core-framework.md`/`rules-of-thumb.md` were read if present, else a fallback reference file was
- [ ] The run was logged to `counsel-runs.tsv` (Stage 5), including any net-admission

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The task is obviously this shelf — I'll only look at those books." | The shelves are coarse and inconsistent; one subject is routinely spread over three of them. Gating by shelf has already produced false "the library is thin" reports. The whole routing table is a few thousand tokens — scan all of it (Norman: read the signifier, don't guess from memory). |
| "These four books always fit this kind of task." | That is the log talking, not the task. A handful of books has taken most seats while most of the corpus has never been consulted. A usual suspect keeps its seat only by beating a named fresh alternative. |
| "Routing was clean, so the net pass is unnecessary." | Routing always looks clean from inside — you cannot see the book your tags scan missed. Most tags are used by one book; the net is the only check on that. It is one command. |
| "core-framework.md must exist, I'll just read it." | It does not exist for a large fraction of this corpus. Check first, then read — or fall back to the book's top `referenceFiles`. Reading a path blindly errors mid-run. |
| "This search snippet is enough to cite." | A snippet points you at a book, not at a verified source line. Read that book's file by path and cite the file, or the citation may misrepresent it. |
| "The library's thin here, but I can synthesize something useful." | A padded answer is the one failure that kills the skill's trust. Return the thin honest answer and stop. |
| "This kind of task has never been mis-routed before, so I can eyeball it." | Gawande: "this has never been a problem before" is evidence of rationalized skipping, most likely used for the step most likely to cause harm when it finally fails. |

## Red Flags

- Reading `core-framework.md` / `rules-of-thumb.md` without checking they exist first.
- A framework paragraph that summarizes the book instead of saying what to DO in this task.
- More than 5 frameworks unasked, or a routed book whose selected file was never actually read.
- A counsel report emitted with no `counsel-runs.tsv` line appended.
- A book excluded because of its `category`, or a longlist drawn from a single shelf.
- "The library is thin here" with no net pass run, or no search terms named.
- Every routed book is on the usual-suspects list and no alternative was named.
- Citations leaking into visitor-facing copy rather than builder notes.

## Handoff

- **Expected input**: a task, draft, or decision to seek counsel on, or an
  invocation from another skill that needs a counsel step.
- **Produces**: a counsel report — 3-5 frameworks, each cited to
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
