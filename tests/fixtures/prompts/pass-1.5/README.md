# Pass 1.5 fixture

A three-chunk made-up book for checking the Pass 1.5 (flag verification) prompt in `commands/content-to-skill.md`. Nothing runs it automatically: the prompt's behavior needs a model run. Run it by hand whenever that prompt, its recovery steps, or the search-key rule in `references/research-prompt.md` changes, and put the result in the PR's Review Notes.

## Run

1. Copy this folder to a scratch directory, and copy `input/*.md` beside `chunks/` so the extractions sit at the top level.
2. Take the Pass 1.5 prompt block from `commands/content-to-skill.md`, replace `/tmp/content-to-skill/<name>` with the scratch directory and `${CLAUDE_PLUGIN_ROOT}` with this repo's path, and give it to a fresh subagent.
3. Compare its `flag-verification.md` with `expected/flag-verification.md`: same rows, same results, same evidence lines. Keys may differ, but each row needs at least two.

## What each case checks

| Case | Expected outcome |
|---|---|
| Citation whose entry is listed under the author's surname | resolved; the extraction gets the entry's content and no chunk path or marker |
| Definition in a later chunk's glossary | resolved across chunks |
| Bracketed forward reference that a later chunk delivers | resolved in the table; the extraction keeps no `[UNCLEAR]` flag for it (see #21) |
| Promised chapter that never covers the topic | verified-absent, with the keys named in the flag |

Also check that no extraction contains `chunk_` or `[RESOLVED` after the run, and that running the prompt a second time leaves the table's rows in place (see #22).
