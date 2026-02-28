---
name: content-to-skill
description: "Transforms PDFs, EPUBs, and code exercise repositories into Claude Code Agent Skills with library management. Use when converting books, documents, or coding courses into reusable agent skills."
argument-hint: "<path> [--name <skill-name>] [--install library|project|personal] [--on-conflict overwrite|cancel] [--citation chapter|page] [--genre prescriptive|literary-fiction|philosophy|poetry-drama|religious] [--category <category>] [--pattern numbered-dotted|generic]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Task, TaskCreate, TaskUpdate, TaskList, TaskGet, Bash(npx:*), Bash(npm:*), Bash(mkdir:*), Bash(ls:*), Bash(cp:*), Bash(rm:*)
---

# Content to Skill

Convert a PDF, EPUB, or code exercise repository into a complete Agent Skill package.

**Two pipelines**: This command supports TWO input types. You MUST check whether the input path is a directory or a file FIRST (Step 1), then follow the correct pipeline:
- **Directory** → Repo Pipeline (Steps 1R–6R)
- **PDF/EPUB file** → Book Pipeline (Steps 1–6)

## Arguments

Parse `$ARGUMENTS` for these flags. Any unrecognized positional argument is the input path.

| Flag | Default | Description |
|------|---------|-------------|
| `<path>` | (required) | Path to a PDF/EPUB file **or** a directory containing code exercises |
| `--name <name>` | (prompt user) | Kebab-case skill name (max 64 chars, lowercase alphanumeric + hyphens) |
| `--install <location>` | `library` | `library`, `project`, or `personal` |
| `--on-conflict <action>` | `overwrite` | `overwrite` or `cancel` |
| `--pages <n>` | `5` | Pages/sections per chunk (book pipeline only) |
| `--citation <style>` | (prompt user) | `chapter` or `page` — skip citation style prompt (book pipeline only) |
| `--genre <type>` | (prompt user) | `prescriptive`, `literary-fiction`, `philosophy`, `poetry-drama`, or `religious` — skip genre prompt (book pipeline only) |
| `--category <category>` | (prompt user) | Category for library (e.g., `business`, `technical`) — skip category confirmation |
| `--pattern <name>` | (auto-detect) | Exercise detector pattern: `numbered-dotted`, `generic` (repo pipeline only) |

## Pipeline Progress Checklist

Copy the appropriate checklist and update as you complete each step.

**Book Pipeline** (PDF/EPUB):
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

**Repo Pipeline** (code exercise directory):
```
- [ ] Step 1R: Detect exercises and setup
- [ ] Step 2R: Extract exercises (parallel subagents)
- [ ] Step 3R: Synthesize into skill
- [ ] Step 4R: Create book.json
- [ ] Step 5R: Generate cover
- [ ] Step 6R: Install skill
```

## Recovery Preamble

If you have lost context (e.g., after compaction), reconstruct state by reading these files from the working directory:

1. Read `/tmp/content-to-skill/<name>/progress.json` — tells you which step and batch you were on, and the `pipeline` field (`"book"` or `"repo"`)
2. If `pipeline` is `"repo"`, follow the **Repo Pipeline** steps (1R-6R). Check for `extraction-*.md` files to determine extraction progress.
3. If `pipeline` is `"book"` (or absent — legacy), follow the **Book Pipeline**:
   - Check `citationStyle` — if missing and step is `"citation-style"`, resume at Step 1.5
   - Read `/tmp/content-to-skill/<name>/running-context.md` — the extraction state (built by Pass 2)
   - Read `/tmp/content-to-skill/<name>/book-spine.md` — chapter summaries (built by Pass 2)
   - Check for `distilled-chunk-*.md` files — if present, Pass 3 has started or completed
4. Resume from the last completed batch or step

## Step 1: Validate Input and Setup

1. Parse `$ARGUMENTS` to extract the input path and optional flags
2. **CRITICAL — Check whether the path is a directory or a file BEFORE doing anything else**:
   - Use `Bash(ls:*)` to check: `ls -la "<path>"`
   - **If it is a DIRECTORY** → jump to **Step 1R** (Repo Pipeline). Do NOT continue with the book pipeline steps below.
   - **If it is a FILE** with `.pdf` or `.epub` extension → continue with Step 3 below (Book Pipeline)
   - If not found or unrecognized type, report a clear error and stop
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
6. Parse optional `--citation`, `--genre`, and `--category` flags:
   - If `--citation` provided, validate it is `chapter` or `page`
   - If `--genre` provided, validate it is one of: `prescriptive`, `literary-fiction`, `philosophy`, `poetry-drama`, `religious`
   - If `--category` provided, store it for use in Step 4b (any non-empty string is valid)
   - If both `--citation` and `--genre` are provided, skip Step 1.5 entirely
   - If `--category` is provided, skip Step 4b entirely

7. Write initial `progress.json`:
   - If both `--citation` and `--genre` are provided:
     ```json
     { "step": "chunking", "pipeline": "book", "skillName": "<name>", "inputFile": "<path>", "citationStyle": "<chapter|page>", "genreType": "<genre>", "status": "in_progress" }
     ```
   - Otherwise:
     ```json
     { "step": "citation-style", "pipeline": "book", "skillName": "<name>", "inputFile": "<path>", "status": "in_progress" }
     ```
   - If `--category` was provided, also include `"confirmedCategory": "<category>"` in the JSON

## Step 1.5: Choose Citation Style and Genre

**Skip this step entirely if both `--citation` and `--genre` were provided** (values already written to `progress.json` in Step 1). Proceed directly to Step 2.

Otherwise, ask the remaining question(s) using `AskUserQuestion`:

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

See the "Genre-Specific Extraction Strategies" section in the methodology for the full extraction strategy for this genre.

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

After reading the whole book and seeing its structure, go back through each extraction and ask "what actually matters?" The distillation criteria differ by genre — prescriptive works use Holiday's notecard filter, while other genres use filters appropriate to their form.

1. Read `/tmp/content-to-skill/<name>/running-context.md` and `/tmp/content-to-skill/<name>/book-spine.md` — capture their full contents
2. Read `genreType` from `/tmp/content-to-skill/<name>/progress.json`
3. Group chunks into batches of 5 (same batching as Pass 1)
4. For each batch, spawn up to 5 subagents via `Task` in a **single message** (parallel execution)
5. Each subagent uses `subagent_type: "general-purpose"` (do NOT pass a `model` parameter)

**Before spawning**, substitute `{genreType}` and `{GENRE_DISTILLATION_CRITERIA}` in the prompt below. Select the criteria block matching `genreType` from the genre criteria table that follows the template.

```
You are distilling a raw book extraction. You have already seen the whole book's
structure — now go back and ask: what in this chunk is genuinely insightful?

## Context (Whole Book)
[contents of running-context.md]

## Book Structure
[contents of book-spine.md]

## Genre: {genreType}

## Task
1. Read: /tmp/content-to-skill/<name>/extraction-chunk-NNN.md
2. For each concept and framework in the extraction, evaluate using these genre-specific criteria:

{GENRE_DISTILLATION_CRITERIA}

3. Write the distilled extraction to: /tmp/content-to-skill/<name>/distilled-chunk-NNN.md
4. Return: "Chunk NNN: [kept X of Y concepts, deepened Z, cut W]"

## Hard Constraints
- Never add content not supported by the original extraction or source material
- The distilled version should be SHORTER than the original — depth over breadth
- Preserve all citations from the original
```

#### Genre Distillation Criteria

Select the block matching the `genreType` from `progress.json` and substitute it into `{GENRE_DISTILLATION_CRITERIA}` above.

**prescriptive**:
```
- Does this reveal a causal chain or mechanism? → Keep and deepen
- Does this just restate what the author said without explaining *why*? → Rewrite with causal reasoning
- Is this a surface observation that seemed important in isolation but is redundant given the whole book? → Cut or compress
- Does this connect to the book's core thesis in a way the per-chunk extraction missed? → Add the connection
- Every concept that survives must answer "why does this matter?" and "what goes wrong without it?"
```

**literary-fiction**:
```
- Does this capture what the work *does* (structural argument, embodied philosophy) or just what it *contains* (plot summary, theme statements)? → Keep architecture, cut summary
- Does this preserve dialectical tension or prematurely resolve it? → Keep tensions alive; do NOT tidy up what the author left unresolved
- Does this show how a character's fate tests their philosophical position? → Keep and deepen
- Is this a portable wisdom nugget that could go on a notecard, or does it require the novel's context to mean anything? → If the latter, that's a sign it captures something important — keep it, but ensure enough context is provided
- Does this reveal the novel's method of argument (embodiment, consequence, irresolution) rather than just its conclusions? → Keep and deepen
- Every concept that survives must show what the work DOES, not just what it contains
```

**philosophy**:
```
- Does this preserve the argumentative sequence, or just the conclusion? → If just the conclusion, rewrite to include the argumentative path
- Does this capture why the author rejected alternatives? → Keep — rejected alternatives are often where the real insight lives
- Is this a framework that extracts cleanly, or an argument that depends on its rhetorical context? → Both are valid; ensure enough context is provided for the latter
- Does this show the author's honest engagement with the strongest objection? → Keep and deepen
- Is this redundant given the whole book's argumentative arc? → Cut or compress, but preserve the logical connections
- Every concept that survives must show the argument's movement, not just its destination
```

**poetry-drama**:
```
- Does this connect form to meaning? → Keep
- Does this track how imagery or motif develops across the work? → Keep and deepen
- Would cutting this lose the sense of how the work *moves*? → Keep
- Does this describe formal technique alongside thematic content, or just paraphrase content? → If just paraphrase, rewrite to include formal analysis
- Almost nothing should be cut for redundancy — poetry and drama are already compressed
- Every concept that survives must show how form creates meaning
```

**religious**:
```
- For doctrinal content: apply the prescriptive filters (causal chain, mechanism, redundancy)
- For experiential content: apply the literary filters (embodiment, tension, lived consequence)
- Does this preserve the tension between doctrine and lived experience? → Keep
- Does this describe what a practice *produces* in the practitioner, not just what it prescribes? → Keep and deepen
- Does this flatten experiential testimony into abstract doctrine? → Rewrite to restore the experiential dimension
- Every concept that survives must preserve the tension between what is taught and what is lived
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

**If `confirmedCategory` already exists in `progress.json`** (from the `--category` flag), skip this step. Update `progress.json` with `"step": "converting"` and proceed directly to Step 5.

Otherwise:

1. Read `/tmp/content-to-skill/<name>/EXTRACTION_SUMMARY.md` and identify the inferred category from the book metadata section.

2. Use the `genreType` from `progress.json` to inform your category recommendation. Genre-to-category mappings:
   - `prescriptive` → infer from content (business, health, self-help, technical, etc.)
   - `literary-fiction` → `literature`
   - `philosophy` → `philosophy`
   - `poetry-drama` → `literature`
   - `religious` → `religion`

3. Based on the book's themes, select 2-3 alternative categories that could plausibly fit. Known categories with themed cover colors: `business`, `health`, `ai`, `technology`, `software-engineering`, `psychology`, `science`, `finance`, `leadership`, `literature`, `philosophy`, `religion`. Any freeform value is also valid.

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

---

# Repo Pipeline (Code Exercise Directory)

When Step 1 detects the input path is a **directory**, use this pipeline instead of the book pipeline.

## Step 1R: Detect Exercises and Setup

1. Get the skill name:
   - If `--name` was provided, validate it (same rules as book pipeline)
   - If not provided, ask the user: "What should this skill be called? (kebab-case, e.g., `testing-fundamentals`, `react-patterns`)"

2. Create the working directory:
   ```
   mkdir -p /tmp/content-to-skill/<name>
   ```

3. Verify Node.js dependencies are installed:
   ```
   npm --prefix ${CLAUDE_PLUGIN_ROOT} ls 2>/dev/null || npm install --prefix ${CLAUDE_PLUGIN_ROOT}
   ```

4. Run exercise detection:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/detect_exercises.ts "<input_dir>" -o /tmp/content-to-skill/<name>
   ```
   If `--pattern` was provided, add `-p <pattern>` to the command.

5. Read the manifest:
   ```
   Read /tmp/content-to-skill/<name>/exercises_manifest.json
   ```

6. Report: "Detected N modules with M exercises using <pattern> detector."

7. Write initial `progress.json`:
   ```json
   {
     "step": "extracting",
     "pipeline": "repo",
     "skillName": "<name>",
     "inputDir": "<path>",
     "totalExercises": M,
     "totalBatches": B,
     "lastCompletedBatch": 0,
     "status": "in_progress"
   }
   ```

## Step 2R: Extract Exercises (Parallel Subagents)

Read the extraction methodology ONCE and capture its full contents:
```
Read ${CLAUDE_PLUGIN_ROOT}/references/code-extraction-prompt.md
```

Store the contents of `code-extraction-prompt.md` in memory — you will inline it into every subagent prompt.

1. Read `exercises_manifest.json` to get the full exercise list
2. Flatten all exercises across modules into a single ordered list
3. Group exercises into batches of 5
4. For each batch, spawn up to 5 subagents via `Task` in a **single message** (parallel execution)
5. Each subagent uses `subagent_type: "general-purpose"` (do NOT pass a `model` parameter)

**Subagent prompt template**:

```
You are extracting the teaching content from a code exercise. Follow the methodology exactly.

## Task
1. Read the exercise README (if it exists): {exercise.readme}
2. Read all problem files from: {exercise.problem.path}
   Files: {exercise.problem.files}
3. Read all solution files from: {exercise.solution.path}
   Files: {exercise.solution.files}
4. If this exercise is in a module with a README, also read: {module.readme}
5. Apply the extraction methodology below to produce a structured extraction
6. Write your extraction to: /tmp/content-to-skill/<name>/extraction-{exercise.id}.md
7. Return a one-line summary: "Exercise {exercise.id} ({exercise.slug}): [primary concept] — [1-2 key insights]"

## Exercise Metadata
- ID: {exercise.id}
- Module: {module.name}
- Slug: {exercise.slug}
- Problem files: {exercise.problem.files}
- Solution files: {exercise.solution.files}
- TODO markers: {exercise.problem.todoMarkers}

## Hard Constraints
- Never fabricate content not present in the source files
- Flag uncertain content with [UNCLEAR: reason]
- Preserve exact code for before/after examples — do not paraphrase code
- Focus on the delta between problem and solution — this is where the learning lives

## Extraction Methodology
[full contents of code-extraction-prompt.md inlined here]
```

6. Wait for each batch to complete, then:
   - Report progress: "Batch B/T complete (exercises X-Y). Summaries: [list one-line summaries]"
   - Update `progress.json` with `lastCompletedBatch: B`
7. Repeat for the next batch until all exercises are extracted

After all extractions complete, update `progress.json`:
```json
{ "step": "synthesizing", "pipeline": "repo", "lastCompletedBatch": T, "status": "in_progress", ... }
```

## Step 3R: Synthesize into Skill

Spawn ONE subagent via `Task` with `subagent_type: "general-purpose"` (do NOT pass a `model` parameter).

**Subagent prompt**:

```
You are synthesizing per-exercise extractions from a code course into a production-ready skill package.

## Task
1. Read the manifest: /tmp/content-to-skill/<name>/exercises_manifest.json
2. Use Glob to find all extraction files: /tmp/content-to-skill/<name>/extraction-*.md
3. Read each extraction file in order
4. Analyze:
   - Recurring themes across exercises
   - Natural groupings (by module, by concept type)
   - The progression arc (what builds on what)
   - Cross-cutting patterns that appear in multiple modules

5. Create reference files:
   - mkdir -p /tmp/content-to-skill/<name>/skill/references
   - One reference file per module: references/<module-slug>.md
   - If a module has 6+ exercises, split into two reference files
   - Add cross-cutting files:
     - references/core-concepts.md — fundamental principles spanning all modules
     - references/common-patterns.md — recurring code patterns and techniques
     - references/rules-of-thumb.md — all heuristics collected and organized
   - Target: 8-15 reference files total, 60-150 lines each

   Reference file format:
   ---
   title: "[Module or Topic Name]"
   impact: "CRITICAL|HIGH|MEDIUM"
   tags: [tag1, tag2, tag3]
   exercises: ["ex_id_1", "ex_id_2"]
   ---

   Sections: Core Concepts, Key Patterns (with code examples), Before/After Quick Reference table, Rules of Thumb, Connections

6. Create SKILL.md:
   - Write to /tmp/content-to-skill/<name>/skill/SKILL.md
   - Frontmatter:
     ---
     name: <name>
     description: "[One-sentence when-to-use description]"
     ---
   - 3-level progressive disclosure:
     - Level 1 (30-second): Core framework bullets, quick lookup table, key insight
     - Level 2 (situational): "I need to..." table, 5-8 common scenarios
     - Level 3 (conceptual): A-Z concept index with definitions and reference links
     - All References: table of all reference files with impact and description
   - Use relative paths: references/filename.md
   - Keep under 500 lines
   - Use tables and lists, not prose

7. Self-verify:
   - All reference files linked in SKILL.md exist
   - SKILL.md under 500 lines
   - All relative paths correct
   - Reference files are 40-200 lines each (target 60-150)
   - Fix any issues

8. Return: "Synthesis complete. Created N reference files and SKILL.md (M lines)."
```

Wait for the synthesis subagent to complete. Report progress and update `progress.json`:
```json
{ "step": "creating-metadata", "pipeline": "repo", "status": "in_progress", ... }
```

## Step 4R: Create book.json

1. Read `/tmp/content-to-skill/<name>/skill/SKILL.md` to get the description from frontmatter
2. Read `/tmp/content-to-skill/<name>/exercises_manifest.json` for source metadata

3. **If `confirmedCategory` already exists in `progress.json`** (from the `--category` flag), use it and skip the prompt. Otherwise, present the user with a choice using `AskUserQuestion`:
   - "technical (Recommended)" — coding courses, programming exercises
   - "ai" — AI/ML focused courses
   - "science" — scientific computing courses
   - The user can always type a custom category via "Other"

4. Collect all reference filenames from `/tmp/content-to-skill/<name>/skill/references/`
5. Write `/tmp/content-to-skill/<name>/skill/book.json`:
   ```json
   {
     "name": "<name>",
     "title": "<Course/Repo Title>",
     "author": "<Author if known, else null>",
     "year": null,
     "category": "<confirmed category>",
     "tags": ["<tag1>", "<tag2>", "..."],
     "description": "<One-sentence from SKILL.md frontmatter>",
     "referenceFiles": ["references/core-concepts.md", "..."]
   }
   ```
   - Infer `title` from the repo directory name or manifest metadata
   - Infer `tags` from module names and exercise concepts (3-7 kebab-case tags)

6. Update `progress.json`:
   ```json
   { "step": "generating-cover", "pipeline": "repo", "status": "in_progress", "confirmedCategory": "<category>", ... }
   ```

## Step 5R: Generate Cover

Code repos won't have a real book cover to fetch, so generate one programmatically:

```
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/generate_covers.ts --dir /tmp/content-to-skill/<name>/skill
```

If this fails or `generate_covers.ts` doesn't support `--dir`, use `fetch_cover.ts` which falls back to programmatic generation:
```
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/fetch_cover.ts --dir /tmp/content-to-skill/<name>/skill
```

Verify:
- `cover.png` exists in `/tmp/content-to-skill/<name>/skill/`
- `book.json` contains `coverImage` and `coverSource` fields (add them if the script didn't)

Update `progress.json`:
```json
{ "step": "installing", "pipeline": "repo", "status": "in_progress", ... }
```

## Step 6R: Install Skill

Follow the exact same installation process as the book pipeline's Step 6:

1. Get install location from `--install` flag (default: `library` → `~/.claude/library/books/<name>/`)
2. Check for conflicts (respect `--on-conflict`)
3. Copy the skill:
   ```
   mkdir -p <target_dir>
   cp -r /tmp/content-to-skill/<name>/skill/* <target_dir>/
   ```
4. If installing to `library`, rebuild the index:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/library_index.ts
   ```
5. Verify installation (SKILL.md, references/, book.json)
6. Write `result.json`:
   ```json
   {
     "status": "success",
     "skill_name": "<name>",
     "installed_to": "<target_dir>",
     "install_type": "library|project|personal",
     "files_created": N,
     "exercises_processed": M,
     "working_directory": "/tmp/content-to-skill/<name>/"
   }
   ```
7. Report success:

   For `library` installs:
   > Skill "<name>" added to your library at `<target_dir>`.
   >
   > Extracted from N exercises across M modules. Contains R reference files.
   > Use `/library <name>` to load it into any conversation.

   For `project` or `personal` installs:
   > Skill "<name>" installed to `<target_dir>`.
   >
   > Extracted from N exercises across M modules. Contains R reference files.
   > Try it out by asking a question related to the course content.

8. Update `progress.json`:
   ```json
   { "step": "complete", "pipeline": "repo", "status": "complete", "installedTo": "<target_dir>", "installType": "library|project|personal" }
   ```
