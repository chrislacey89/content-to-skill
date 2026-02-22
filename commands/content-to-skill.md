---
name: content-to-skill
description: "Transforms PDFs and EPUBs into Claude Code Agent Skills by chunking, extracting, and converting document content into structured skill packages with progressive disclosure. Use when converting books or documents into reusable agent skills."
argument-hint: "<path> [--name <skill-name>] [--install library|project|personal] [--on-conflict overwrite|cancel]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Task, TaskCreate, TaskUpdate, TaskList, TaskGet, Bash(npx:*), Bash(npm:*), Bash(mkdir:*), Bash(ls:*), Bash(cp:*), Bash(rm:*)
---

# Content to Skill

Convert a PDF or EPUB into a complete Agent Skill package.

## Arguments

Parse `$ARGUMENTS` for these flags. Any unrecognized positional argument is the file path.

| Flag | Default | Description |
|------|---------|-------------|
| `<path>` | (required) | Path to the PDF or EPUB file |
| `--name <name>` | (prompt user) | Kebab-case skill name (max 64 chars, lowercase alphanumeric + hyphens) |
| `--install <location>` | `library` | `library`, `project`, or `personal` |
| `--on-conflict <action>` | `overwrite` | `overwrite` or `cancel` |
| `--pages <n>` | `5` | Pages/sections per chunk |

## Pipeline Progress Checklist

Copy this checklist and update as you complete each step:

```
- [ ] Step 1: Validate input and setup
- [ ] Step 1.5: Choose citation style and genre
- [ ] Step 2: Chunk document
- [ ] Step 3: Extract content (Pass 1 — per-chunk, Pass 2 — cross-reference, Pass 3 — distillation)
- [ ] Step 4: Synthesize
- [ ] Step 4b: Confirm category
- [ ] Step 5: Convert to skill (includes book.json)
- [ ] Step 5b: Fetch cover image
- [ ] Step 6: Install skill
```

## Recovery Preamble

If you have lost context (e.g., after compaction), reconstruct state by reading these files from the working directory:

1. Read `/tmp/content-to-skill/<name>/progress.json` — tells you which step and batch you were on, and the `citationStyle` (`"chapter"` or `"page"`). If `citationStyle` is missing and step is `"citation-style"`, resume at Step 1.5 to ask the user.
2. Read `/tmp/content-to-skill/<name>/running-context.md` — the extraction state (built by Pass 2)
3. Read `/tmp/content-to-skill/<name>/book-spine.md` — chapter summaries (built by Pass 2)
4. Check for `distilled-chunk-*.md` files — if present, Pass 3 has started or completed
5. Resume from the last completed batch or step

## Step 1: Validate Input and Setup

1. Parse `$ARGUMENTS` to extract the file path and optional flags
2. Verify the file exists and is a `.pdf` or `.epub`:
   - Use `Bash(ls:*)` to check: `ls -la "<file_path>"`
   - If not found or wrong type, report a clear error and stop
3. Get the skill name:
   - If `--name` was provided, validate it: lowercase, alphanumeric + hyphens, max 64 chars, no leading/trailing/consecutive hyphens
   - If not provided, ask the user: "What should this skill be called? (kebab-case, e.g., `outlive`, `the-prince`)"
4. Create the working directory:
   ```
   mkdir -p /tmp/content-to-skill/<name>/chunks
   ```
5. Verify Node.js dependencies are installed:
   ```
   npm --prefix ${CLAUDE_PLUGIN_ROOT} ls 2>/dev/null || npm install --prefix ${CLAUDE_PLUGIN_ROOT}
   ```
6. Write initial `progress.json`:
   ```json
   { "step": "citation-style", "skillName": "<name>", "inputFile": "<path>", "status": "in_progress" }
   ```

## Step 1.5: Choose Citation Style and Genre

Ask two questions using `AskUserQuestion`:

**Question 1**: "How should quotes be cited in this skill?"
- "By chapter (e.g., Chapter 3)" — for books, literature, and long-form works with structural divisions
- "By page number (e.g., p. 42)" — for papers, whitepapers, and paginated academic docs with stable page numbers

**Question 2**: "What type of work is this?"
- "Non-fiction (prescriptive)" — business, self-help, health, technical
- "Literary fiction" — novels, short stories, narrative works
- "Philosophy / essays" — argumentative or reflective non-fiction
- "Poetry / drama" — verse, plays, performance texts
- "Religious / spiritual" — scripture, theology, contemplative traditions

Store the choices as `citationStyle` (`"chapter"` or `"page"`) and `genreType` (`"prescriptive"`, `"literary-fiction"`, `"philosophy"`, `"poetry-drama"`, or `"religious"`) and update `progress.json`:
```json
{ "step": "chunking", "skillName": "<name>", "inputFile": "<path>", "citationStyle": "chapter|page", "genreType": "<genreType>", "status": "in_progress" }
```

Carry both `citationStyle` and `genreType` forward in all subsequent `progress.json` updates.

**Guidance**: If the source is a classic literary text (e.g., Project Gutenberg), a novel, or any work where page numbers are artifacts of digital rendering rather than the original publication, recommend "By chapter." The extraction agents will adapt to the source's actual structure (Book, Part, Canto, Act, etc.) if standard chapter numbers aren't present.

## Step 2: Chunk the Document

1. Run the chunker:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/chunk_document.ts "<input_file>" -p <pages> -o /tmp/content-to-skill/<name>/chunks
   ```
   Use the `--pages` value from arguments (default: 5).

2. Read the manifest to confirm chunking succeeded:
   ```
   Read /tmp/content-to-skill/<name>/chunks/manifest.json
   ```

3. Report progress: "Chunking complete. Created N chunks from M pages/sections."

4. Update `progress.json`:
   ```json
   { "step": "extracting", "skillName": "<name>", "citationStyle": "chapter|page", "totalChunks": N, "totalBatches": B, "lastCompletedBatch": 0, "status": "in_progress" }
   ```

## Step 3: Extract Content (Parallel)

Read the extraction methodology ONCE and capture its full contents:
```
Read ${CLAUDE_PLUGIN_ROOT}/references/research-prompt.md
```

Store the contents of `research-prompt.md` in memory — you will inline it into every subagent prompt.

### Pass 1 — Parallel Chunk Extraction (batches of 5)

1. Read `manifest.json` to get the total chunk count and file extension (`.pdf` or `.txt`)
2. Group chunks into batches of 5 (e.g., chunks 1-5, 6-10, 11-15, ...)
3. For each batch, spawn up to 5 subagents via `Task` in a **single message** (parallel execution)
4. Each subagent uses `subagent_type: "general-purpose"` with this prompt template. Do NOT pass a `model` parameter — subagents inherit the parent model automatically.

   **Before spawning**, replace `{citationStyle}` and `{genreType}` in the prompt below with the actual values from `progress.json`.

```
You are extracting knowledge from a book chunk. Follow the methodology exactly.

## Task
1. Read: /tmp/content-to-skill/<name>/chunks/chunk_NNN.<ext>
2. Apply the extraction methodology below to produce a structured extraction
3. Write your extraction to: /tmp/content-to-skill/<name>/extraction-chunk-NNN.md
4. Return a one-line summary: "Chunk NNN: [Chapter Title] — [2-3 key concepts found]"

## Hard Constraints
- Never fabricate content not present in the source chunk
- Flag uncertain content with [UNCLEAR: reason]
- If the chunk is unreadable, write an Extraction Error block and return "Chunk NNN: EXTRACTION ERROR"
- Preserve exact quotes for definitional statements

## Citation Style
Use **{citationStyle}** citations throughout your extraction:
- **chapter**: `(Chapter [N]: [Title])` for quotes, `## Chapter [N]: [Title]` for headers
- **page**: `(p. [N])` for quotes, `## Section [N]: [Title]` for headers

## Genre
This work is **{genreType}**. Adjust your extraction accordingly:
- For prescriptive works: focus on mechanisms, causal chains, and implementation reasoning
- For literary fiction: extract the argument embedded in the narrative — what characters represent, why events happen, thematic dialectics
- For philosophy/essays: preserve the argumentative chain — which claim supports which, strongest objections, logical structure
- For poetry/drama: track formal techniques, imagery patterns, and how scenes build argumentative or emotional momentum
- For religious/spiritual: core doctrines, contemplative practices, tensions between claims and lived experience

See the "Genre Reinterpretation" section in the methodology for how to adapt extraction priorities.

## Extraction Methodology
[full contents of research-prompt.md inlined here]
```

5. Wait for the batch to complete, then:
   - Report progress: "Batch B/T complete (chunks X-Y). Summaries: [list one-line summaries]"
   - Update `progress.json` with `lastCompletedBatch: B`
6. Repeat for the next batch until all chunks are processed

### Pass 2 — Cross-Reference Enrichment

After ALL chunks are extracted, spawn ONE subagent via `Task` with `subagent_type: "general-purpose"` (do NOT pass a `model` parameter).

**Before spawning**, replace `{citationStyle}` in the prompt below with the actual value from `progress.json` (`"chapter"` or `"page"`).

```
You are cross-referencing extractions from a book to build a unified knowledge map.

## Citation Style
Use **{citationStyle}** citations:
- **chapter**: `(Ch. N)` — for books
- **page**: `(p. N)` — for papers/whitepapers

If the Pass 1 extractions used adapted citations (e.g., Book/Part/Canto references instead of chapter or page numbers), follow that same adapted format.

## Task
1. Use Glob to find all extraction files: /tmp/content-to-skill/<name>/extraction-chunk-*.md
2. Read each extraction file in order (chunk-001, chunk-002, etc.)
3. Build and write these files:

   /tmp/content-to-skill/<name>/running-context.md:
   ## Running Context
   ### Core Thesis
   [2-3 sentences capturing the book's central argument]
   ### Key Concepts (top 15)
   - [Term]: [brief definition] (per citation style used in extractions)
   ### Unresolved Threads (max 5)
   - [Topic the author promised to address later]
   ### Recurring Themes (3-5)
   - [Theme]: [how it's developing across chapters]

   /tmp/content-to-skill/<name>/terminology.md:
   All coined terms, definitions, and the chapter where each first appears.

   /tmp/content-to-skill/<name>/book-spine.md:
   One-line summary per chapter, in order.

4. Return a summary of: core thesis, main themes, and key cross-chapter connections found.
```

Wait for this subagent to complete, then report its summary and update `progress.json`:
```json
{ "step": "distilling", "citationStyle": "chapter|page", "status": "in_progress", ... }
```

### Pass 3 — Distillation (batches of 5)

Holiday's notecard principle: after reading the whole book and seeing its structure, go back through each extraction and ask "what actually matters?" Only insights that survive this filter make it into the final skill.

1. Read `/tmp/content-to-skill/<name>/running-context.md` and `/tmp/content-to-skill/<name>/book-spine.md` — capture their full contents
2. Group chunks into batches of 5 (same batching as Pass 1)
3. For each batch, spawn up to 5 subagents via `Task` in a **single message** (parallel execution)
4. Each subagent uses `subagent_type: "general-purpose"` (do NOT pass a `model` parameter)

```
You are distilling a raw book extraction. You have already seen the whole book's
structure — now go back and ask: what in this chunk is genuinely insightful?

## Context (Whole Book)
[contents of running-context.md]

## Book Structure
[contents of book-spine.md]

## Task
1. Read: /tmp/content-to-skill/<name>/extraction-chunk-NNN.md
2. For each concept and framework in the extraction, evaluate:
   - Does this reveal a causal chain or mechanism? (Keep and deepen)
   - Does this just restate what the author said without explaining *why*? (Rewrite with causal reasoning)
   - Is this a surface observation that seemed important in isolation but is redundant given the whole book? (Cut or compress)
   - Does this connect to the book's core thesis in a way the per-chunk extraction missed? (Add the connection)
3. Write the distilled extraction to: /tmp/content-to-skill/<name>/distilled-chunk-NNN.md
4. Return: "Chunk NNN: [kept X of Y concepts, deepened Z, cut W]"

## Hard Constraints
- Never add content not supported by the original extraction or source material
- The distilled version should be SHORTER than the original — depth over breadth
- Every concept that survives must answer "why does this matter?" and "what goes wrong without it?"
- Preserve all citations from the original
```

5. Wait for the batch to complete, then:
   - Report progress: "Distillation batch B/T complete (chunks X-Y). Summaries: [list one-line summaries]"
   - Update `progress.json` with `lastCompletedDistillBatch: B`
6. Repeat for the next batch until all chunks are distilled

After all distillation batches are complete, update `progress.json`:
```json
{ "step": "synthesizing", "citationStyle": "chapter|page", "status": "in_progress", ... }
```

## Step 4: Synthesize

Pass 2 already built `running-context.md`, `terminology.md`, and `book-spine.md`. This step just produces the final summary.

1. Read: `/tmp/content-to-skill/<name>/book-spine.md`
2. Read: `/tmp/content-to-skill/<name>/terminology.md`
3. Read metadata from: `/tmp/content-to-skill/<name>/extraction-chunk-001.md` (first ~50 lines)

4. Produce `EXTRACTION_SUMMARY.md` (under 5,000 tokens) containing:
   - Book metadata (title, author, year, category)
   - Core thesis (2-3 sentences)
   - Quick Reference Index: key frameworks table, core terminology table, top 10 actionable takeaways
   - Cross-reference map: how chapters connect
   - Chapter summaries (one paragraph each, from book-spine.md)

5. Write to: `/tmp/content-to-skill/<name>/EXTRACTION_SUMMARY.md`

6. Update `progress.json`:
   ```json
   { "step": "confirming-category", "citationStyle": "chapter|page", "status": "in_progress", ... }
   ```

## Step 4b: Confirm Category

1. Read `/tmp/content-to-skill/<name>/EXTRACTION_SUMMARY.md` and identify the inferred category from the book metadata section.

2. Use the `genreType` from `progress.json` to inform your category recommendation. Genre-to-category mappings:
   - `prescriptive` → infer from content (business, health, self-help, technical, etc.)
   - `literary-fiction` → `literature`
   - `philosophy` → `philosophy`
   - `poetry-drama` → `literature`
   - `religious` → `religion`

3. Based on the book's themes, select 2-3 alternative categories that could plausibly fit. Known categories with themed cover colors: `business`, `health`, `ai`, `technology`, `psychology`, `science`, `finance`, `leadership`, `literature`, `philosophy`, `religion`. Any freeform value is also valid.

4. Present the user with a choice using `AskUserQuestion`:
   - First option: the genre-informed category marked as "(Recommended)"
   - Next 2-3 options: plausible alternatives based on the book's themes
   - The user can always type a custom category via the built-in "Other" option

4. Store the user's confirmed category for use in Step 5.

5. Update `progress.json`:
   ```json
   { "step": "converting", "citationStyle": "chapter|page", "status": "in_progress", "confirmedCategory": "<category>", ... }
   ```

## Step 5: Convert to Skill

Read the conversion methodology:
```
Read ${CLAUDE_PLUGIN_ROOT}/references/skill-conversion.md
```

Follow the instructions in `skill-conversion.md` to:

1. **Plan reference files**: Read `EXTRACTION_SUMMARY.md` and plan 8-15 reference files. Write the plan to `/tmp/content-to-skill/<name>/reference-plan.json`:
   ```json
   [
     { "filename": "core-framework.md", "title": "...", "sourceChapters": [1,2], "impact": "CRITICAL", "summary": "..." },
     ...
   ]
   ```

2. **Create reference files** in batches of 3-4:
   - For each file in the plan, read the relevant `distilled-chunk-NNN.md` files (these are the Pass 3 outputs — prefer over raw `extraction-chunk-NNN.md`)
   - Write each reference file to `/tmp/content-to-skill/<name>/skill/references/<filename>`
   - Follow the reference file template from `skill-conversion.md`

3. **Create SKILL.md**:
   - Write to `/tmp/content-to-skill/<name>/skill/SKILL.md`
   - Include proper frontmatter (name, description — no triggers field)
   - Use 3-level progressive disclosure
   - Link to all reference files
   - Keep under 500 lines

4. **Create book.json**:
   - Read `/tmp/content-to-skill/<name>/EXTRACTION_SUMMARY.md` for metadata (title, author, year)
   - Use the **confirmed category from Step 4b** (do NOT re-infer)
   - Collect all reference filenames from `/tmp/content-to-skill/<name>/skill/references/`
   - Write `/tmp/content-to-skill/<name>/skill/book.json`:
     ```json
     {
       "name": "<name>",
       "title": "<Book Title>",
       "author": "<Author Name>",
       "year": <year or null>,
       "category": "<confirmed category from Step 4b>",
       "tags": ["<tag1>", "<tag2>", "..."],
       "description": "<One-sentence description from SKILL.md frontmatter>",
       "referenceFiles": ["references/core-framework.md", "..."]
     }
     ```
   - Infer `tags` from the book's key themes (3-7 kebab-case tags)

5. **Self-verify**:
   - All reference files linked in SKILL.md exist
   - SKILL.md is under 500 lines
   - All relative paths are correct
   - Frontmatter is valid (name matches directory name)
   - `book.json` has all required fields (name, title, description)
   - Fix any issues found

6. Update `progress.json`:
   ```json
   { "step": "fetching-cover", "citationStyle": "chapter|page", "status": "in_progress", ... }
   ```

## Step 5b: Fetch Cover Image

1. Run the cover fetch script:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/fetch_cover.ts --dir /tmp/content-to-skill/<name>/skill
   ```
   This tries to fetch a real HD cover from Open Library / Google Books, falling back to programmatic generation. Updates `book.json` with `"coverImage": "cover.png"` and `"coverSource": "<source>"`.

2. **If the output contains `HINT: Bookcover API failed`**: Automatically retry. The author name in book.json is likely missing diacritics or accents (e.g., "Niccolo" → "Niccolò"). Use your knowledge to determine the correct spelling with proper diacritics and immediately run:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/fetch_cover.ts --dir /tmp/content-to-skill/<name>/skill --author "Corrected Author Name" --force
   ```
   If the retry finds a Goodreads cover, it will automatically replace the previous one.

3. Verify the cover was created:
   - `cover.png` exists in `/tmp/content-to-skill/<name>/skill/`
   - `book.json` contains `coverImage` and `coverSource` fields

4. Update `progress.json`:
   ```json
   { "step": "installing", "citationStyle": "chapter|page", "status": "in_progress", ... }
   ```

## Step 6: Install Skill

1. Get install location:
   - If `--install library` was provided (or no `--install` flag — this is the default), use `~/.claude/library/books/<name>/`
   - If `--install project` was provided, use `.claude/skills/<name>/`
   - If `--install personal` was provided, use `~/.claude/skills/<name>/`

2. Check if target directory exists:
   - If `--on-conflict cancel` and directory exists, stop with message
   - Otherwise (default `overwrite`), warn: "Overwriting existing skill at <path>"

3. Copy the skill:
   ```
   mkdir -p <target_dir>
   cp -r /tmp/content-to-skill/<name>/skill/* <target_dir>/
   ```

4. If installing to `library`, rebuild the index:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/library_index.ts
   ```

5. Verify installation:
   - Check SKILL.md exists at target
   - Check references/ directory exists
   - If `library`: check book.json exists at target

6. Write `result.json` to working directory:
   ```json
   {
     "status": "success",
     "skill_name": "<name>",
     "installed_to": "<target_dir>",
     "install_type": "library|project|personal",
     "files_created": N,
     "chunks_processed": M,
     "working_directory": "/tmp/content-to-skill/<name>/"
   }
   ```

7. Report success:

   For `library` installs:
   > Book "<name>" added to your library at `<target_dir>`.
   >
   > The book contains N reference files covering the key concepts.
   > Use `/library <name>` to load it into any conversation.

   For `project` or `personal` installs:
   > Skill "<name>" installed to `<target_dir>`.
   >
   > The skill contains N reference files covering the key concepts from the document.
   > Try it out by asking a question related to the book's content.

8. Update `progress.json`:
   ```json
   { "step": "complete", "status": "complete", "installedTo": "<target_dir>", "installType": "library|project|personal" }
   ```
