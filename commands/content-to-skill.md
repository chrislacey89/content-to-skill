---
name: content-to-skill
description: "Transforms PDFs and EPUBs into Claude Code Agent Skills by chunking, extracting, and converting document content into structured skill packages with progressive disclosure. Use when converting books or documents into reusable agent skills."
argument-hint: "<path> [--name <skill-name>] [--install project|personal] [--on-conflict overwrite|cancel]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Bash(node:*), Bash(npm:*), Bash(mkdir:*), Bash(ls:*), Bash(cp:*), Bash(rm:*)
---

# Content to Skill

Convert a PDF or EPUB into a complete Agent Skill package.

## Arguments

Parse `$ARGUMENTS` for these flags. Any unrecognized positional argument is the file path.

| Flag | Default | Description |
|------|---------|-------------|
| `<path>` | (required) | Path to the PDF or EPUB file |
| `--name <name>` | (prompt user) | Kebab-case skill name (max 64 chars, lowercase alphanumeric + hyphens) |
| `--install <location>` | (prompt user) | `project` or `personal` |
| `--on-conflict <action>` | `overwrite` | `overwrite` or `cancel` |
| `--pages <n>` | `5` | Pages/sections per chunk |

## Pipeline Progress Checklist

Copy this checklist and update as you complete each step:

```
- [ ] Step 1: Validate input and setup
- [ ] Step 2: Chunk document
- [ ] Step 3: Extract content (Pass 1 — per-chunk)
- [ ] Step 4: Synthesize (Pass 2 — book-level)
- [ ] Step 5: Convert to skill
- [ ] Step 6: Install skill
```

## Recovery Preamble

If you have lost context (e.g., after compaction), reconstruct state by reading these files from the working directory:

1. Read `/tmp/content-to-skill/<name>/progress.json` — tells you which step and chunk you were on
2. Read `/tmp/content-to-skill/<name>/running-context.md` — the extraction state
3. Read `/tmp/content-to-skill/<name>/book-spine.md` — chapter summaries so far
4. Resume from the last completed chunk or step

## Step 1: Validate Input and Setup

1. Parse `$ARGUMENTS` to extract the file path and optional flags
2. Verify the file exists and is a `.pdf` or `.epub`:
   - Use `Bash(ls:*)` to check: `ls -la "<file_path>"`
   - If not found or wrong type, report a clear error and stop
3. Get the skill name:
   - If `--name` was provided, validate it: lowercase, alphanumeric + hyphens, max 64 chars, no leading/trailing/consecutive hyphens
   - If not provided, ask the user: "What should this skill be called? (kebab-case, e.g., `outlive`, `mom-test`)"
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
   { "step": "chunking", "skillName": "<name>", "inputFile": "<path>", "status": "in_progress" }
   ```

## Step 2: Chunk the Document

1. Run the chunker:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/chunk_document.js "<input_file>" -p <pages> -o /tmp/content-to-skill/<name>/chunks
   ```
   Use the `--pages` value from arguments (default: 5).

2. Read the manifest to confirm chunking succeeded:
   ```
   Read /tmp/content-to-skill/<name>/chunks/manifest.json
   ```

3. Report progress: "Chunking complete. Created N chunks from M pages/sections."

4. Update `progress.json`:
   ```json
   { "step": "extracting", "skillName": "<name>", "totalChunks": N, "lastCompletedChunk": 0, "status": "in_progress" }
   ```

## Step 3: Extract Content (Pass 1 — Per-Chunk)

Read the extraction methodology ONCE:
```
Read ${CLAUDE_PLUGIN_ROOT}/references/research-prompt.md
```

Then process each chunk sequentially:

### For chunk 1:
1. Read the chunk file: `/tmp/content-to-skill/<name>/chunks/chunk_001.pdf` (or `.txt` for EPUB)
2. Apply the full extraction methodology from `research-prompt.md`
3. Write the extraction output to: `/tmp/content-to-skill/<name>/extraction-chunk-001.md`
4. Write the initial running context to: `/tmp/content-to-skill/<name>/running-context.md`
5. Write the initial terminology bank to: `/tmp/content-to-skill/<name>/terminology.md`
6. Start the book spine: `/tmp/content-to-skill/<name>/book-spine.md` with one-line chapter summary

### For chunks 2 through N:
1. Read: `/tmp/content-to-skill/<name>/running-context.md`
2. Read: `/tmp/content-to-skill/<name>/terminology.md`
3. Read the next chunk file
4. Apply extraction using this compressed reminder (NOT the full research prompt):
   > Continue extraction. Follow the same schema as chunk 1. Focus on: key frameworks, actionable advice, definitions, notable quotes. Maintain terminology consistency with the terminology bank.
5. Write extraction to: `/tmp/content-to-skill/<name>/extraction-chunk-NNN.md`
6. Update `running-context.md` (OVERWRITE — cap at 2,000 tokens):
   - Keep only the 15 most important concepts
   - Prune resolved threads
   - Merge recurring themes
7. Append new terms to `terminology.md`
8. Append one-line chapter summary to `book-spine.md`
9. Update `progress.json` with `lastCompletedChunk: N`
10. Report: "Chunk N/M complete."

### Running Context Format

```markdown
## Running Context

### Core Thesis (frozen after Chapter 1)
[2-3 sentences]

### Key Concepts (top 15)
- [Term]: [brief definition] (Ch. N)

### Unresolved Threads (max 5)
- [Topic the author promised to address later]

### Recurring Themes (3-5)
- [Theme]: [how it's developing]
```

### Hard Constraints for Extraction
- Never fabricate content not present in the source chunk
- Flag uncertain content with [UNCLEAR: reason]
- If a chunk is unreadable, write an Extraction Error block and continue to the next chunk
- Preserve exact quotes for definitional statements

## Step 4: Synthesize (Pass 2 — Book-Level)

After all chunks are extracted:

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
   { "step": "converting", "status": "in_progress", ... }
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
   - For each file in the plan, read the relevant `extraction-chunk-NNN.md` files
   - Write each reference file to `/tmp/content-to-skill/<name>/skill/references/<filename>`
   - Follow the reference file template from `skill-conversion.md`

3. **Create SKILL.md**:
   - Write to `/tmp/content-to-skill/<name>/skill/SKILL.md`
   - Include proper frontmatter (name, description — no triggers field)
   - Use 3-level progressive disclosure
   - Link to all reference files
   - Keep under 500 lines

4. **Self-verify**:
   - All reference files linked in SKILL.md exist
   - SKILL.md is under 500 lines
   - All relative paths are correct
   - Frontmatter is valid (name matches directory name)
   - Fix any issues found

5. Update `progress.json`:
   ```json
   { "step": "installing", "status": "in_progress", ... }
   ```

## Step 6: Install Skill

1. Get install location:
   - If `--install project` was provided, use `.claude/skills/<name>/`
   - If `--install personal` was provided, use `~/.claude/skills/<name>/`
   - If neither, ask: "Install as project skill (`.claude/skills/<name>/`) or personal skill (`~/.claude/skills/<name>/`)?"

2. Check if target directory exists:
   - If `--on-conflict cancel` and directory exists, stop with message
   - Otherwise (default `overwrite`), warn: "Overwriting existing skill at <path>"

3. Copy the skill:
   ```
   mkdir -p <target_dir>
   cp -r /tmp/content-to-skill/<name>/skill/* <target_dir>/
   ```

4. Verify installation:
   - Check SKILL.md exists at target
   - Check references/ directory exists

5. Write `result.json` to working directory:
   ```json
   {
     "status": "success",
     "skill_name": "<name>",
     "installed_to": "<target_dir>",
     "files_created": N,
     "chunks_processed": M,
     "working_directory": "/tmp/content-to-skill/<name>/"
   }
   ```

6. Report success:
   > Skill "<name>" installed to `<target_dir>`.
   >
   > The skill contains N reference files covering the key concepts from the document.
   > Try it out by asking a question related to the book's content.

7. Update `progress.json`:
   ```json
   { "step": "complete", "status": "complete", "installedTo": "<target_dir>" }
   ```
