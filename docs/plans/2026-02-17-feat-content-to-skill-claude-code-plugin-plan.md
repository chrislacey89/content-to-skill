---
title: "feat: Content-to-Skill Claude Code Plugin"
type: feat
status: implemented
date: 2026-02-17
deepened: 2026-02-17
---

# Content-to-Skill Claude Code Plugin

## Enhancement Summary

**Deepened on:** 2026-02-17
**Agents used:** 8 (create-agent-skills, RAG chunking, prompt engineering, architecture strategist, agent-native reviewer, pattern recognition specialist, performance oracle, code simplicity reviewer)

### Key Improvements

1. **Simplified architecture**: Collapse 4 conversion phases into 1 reference file, remove the background skill layer, flatten directory structure from 8 content files to 4
2. **Critical structural fixes**: Resolve command/skill name collision, add `disable-model-invocation: true`, fix `allowed-tools` format (colon separator, commas), move scripts inside skill directory
3. **Robust context management**: Two-pass architecture (extraction pass + synthesis pass), per-chunk extraction files written immediately, running context capped at 2,000 tokens, separate terminology bank, compaction-resilient recovery preamble
4. **Agent-native design**: Accept all decisions (skill name, install location, conflict resolution) as `$ARGUMENTS` so agents can invoke without interactive prompts; emit structured `result.json` on completion
5. **Prompt engineering**: Split methodology definition from per-chunk instruction template, remove chat artifacts (`/compact`, copy-paste instructions), use imperative procedural language, compressed 50-token reminder for subsequent chunks

### New Considerations Discovered

- Plugin cache directories may be read-only; bundle `node_modules` or use `esbuild`/`ncc` instead of runtime `npm install`
- `allowed-tools` uses colon syntax (`Bash(node:*)`) not space syntax (`Bash(node *)`) per reference plugin
- `user-invocable: false` skills have descriptions always in context (token overhead); explicit `Read` is more efficient
- For books >300 pages (~50 min pipeline), compaction resilience via `progress.json` + disk state recovery is essential even in V1
- `fs.readFileSync` loads entire PDF into memory; warn at 100MB+, consider `qpdf` CLI for extreme cases

---

## Overview

Package the book extraction pipeline from `/Users/christopherlacey/Documents/book_extraction` into a distributable Claude Code plugin that transforms PDFs and EPUBs into Agent Skills. The user invokes `/content-to-skill path/to/book.pdf`, and the plugin handles the entire pipeline: chunking, extraction, skill conversion, and installation — with a prompt asking whether to install locally or globally.

## Problem Statement

The book extraction pipeline currently lives as a collection of scripts and prompt templates in a standalone repository. Using it requires:
- Knowing the manual multi-step flow (chunk → extract → convert phases 1-4)
- Running `onboard.sh` (1443 lines of Bash) with specific CLI flags
- Understanding the prompt template system and context management

This friction means the pipeline is only usable by its author. Packaging it as a Claude Code plugin makes it a one-command operation usable by anyone with Claude Code.

## Proposed Solution

Create a Claude Code plugin (`content-to-skill`) that follows the compound-engineering-plugin architecture. The plugin exposes a single slash command `/content-to-skill` that orchestrates the full pipeline using Claude's own capabilities — no external agent CLIs required.

### Architecture Decision: Claude-Native Execution

The existing `onboard.sh` shells out to `codex exec` or `claude -p` for the AI-driven stages. Since this is now a Claude Code plugin, **Claude itself is the execution engine**. The extraction and skill conversion happen within Claude's own context, using the prompt templates as embedded instructions.

This means:
- **Stage 1 (Chunking)**: Runs `chunk_document.js` via Bash (the Node.js script is bundled in the plugin)
- **Stage 2 (Extraction)**: Claude processes chunks directly using the embedded research prompt (two-pass: extraction + synthesis)
- **Stage 3 (Skill Conversion)**: Claude generates the skill files using a single conversion reference file
- **Installation**: Claude writes files to the chosen location

### Research Insights: Simplified Architecture

**From code-simplicity-reviewer + architecture-strategist + pattern-recognition-specialist:**

The original plan had unnecessary indirection inherited from the old multi-process `onboard.sh` architecture. The simplified design:

1. **No background skill layer** — The `skills/` directory with `user-invocable: false` is removed. The command reads reference files directly via `${CLAUDE_PLUGIN_ROOT}/references/`. This eliminates the auto-loading token overhead and the name collision risk.

2. **Single conversion reference** — The 4 conversion phases (`SKILL_CONVERSION_PHASE_1-4.md`) are collapsed into one `skill-conversion.md`. In Claude Code, Claude has full context and doesn't need artificial phase boundaries that were designed for separate `claude -p` invocations.

3. **Arguments-first design** — All decisions (skill name, install location, conflict resolution) are passable via `$ARGUMENTS` with sensible defaults. Interactive prompts are fallbacks when arguments are omitted, not the primary path.

4. **`disable-model-invocation: true` is mandatory** — This command writes files, runs scripts, and installs skills. Every side-effect command in the reference plugin uses this flag. Without it, Claude could auto-invoke the pipeline because a user mentions a book.

## Technical Approach

### Plugin Directory Structure

```
content-to-skill/
├── .claude-plugin/
│   └── plugin.json                    # Plugin manifest
├── commands/
│   └── content-to-skill.md           # Main slash command (the orchestrator)
├── references/
│   ├── research-prompt.md             # Extraction methodology (from RESEARCH_PROMPT.md)
│   └── skill-conversion.md           # Skill conversion format + verification (consolidated from 4 phases)
├── scripts/
│   └── chunk_document.js              # Node.js chunker (from book_extraction)
├── package.json                       # Node.js deps for chunk_document.js
├── CLAUDE.md
└── .gitignore
```

### Research Insights: Directory Structure

**From pattern-recognition-specialist + architecture-strategist:**

- **Scripts inside skill directories** is the reference plugin convention (`skills/rclone/scripts/`, `skills/gemini-imagegen/scripts/`). However, since we removed the `skills/` layer, `scripts/` at the plugin root is the simplest correct placement.
- **Reference files at plugin root** (`references/`) is a deviation from the reference plugin pattern (which nests under skills), but is appropriate here because we have only one command that uses them. No need for skill-level encapsulation.
- **No `README.md` in the initial structure** — create it in Phase 4 (Polish). Focus on working code first.
- **`package.json` at plugin root** — acceptable; the reference plugin's `gemini-imagegen` places `requirements.txt` inside the skill directory, but since we have no skills directory, root is the right location.
- **Consider bundling dependencies** — Plugin cache directories (`~/.claude/plugins/cache/...`) may be read-only. Options: (a) bundle `node_modules/` in the repo, (b) use `esbuild`/`ncc` to create a single-file `chunk_document.js` with no dependencies, (c) install to user-space `~/.content-to-skill/node_modules/`. Option (b) is cleanest for distribution.

### Key Files and Their Roles

#### `.claude-plugin/plugin.json`

```json
{
  "name": "content-to-skill",
  "version": "1.1.2",
  "description": "Transform PDFs and EPUBs into Claude Code Agent Skills. Extracts, summarizes, and converts book content into structured skill packages with progressive disclosure.",
  "author": {
    "name": "Christopher Lacey"
  },
  "repository": "https://github.com/christopherlacey/content-to-skill",
  "license": "MIT",
  "keywords": ["pdf", "epub", "skills", "knowledge", "extraction", "books"]
}
```

#### `commands/content-to-skill.md` — The Orchestrator

This is the single entry point. It's a slash command that:

1. **Validates input**: Checks the provided file path exists and is a PDF or EPUB
2. **Gets skill name**: From `$ARGUMENTS` (e.g., `--name my-skill`) or prompts the user
3. **Runs chunking**: Executes `chunk_document.js` via Bash
4. **Extracts content** (Pass 1): Reads chunks sequentially, writes per-chunk extraction files to disk, maintains a capped running context block
5. **Synthesizes** (Pass 2): Reads chapter summaries from extraction files, produces book-level summary + cross-reference map
6. **Converts to skill**: Creates the skill directory using the conversion reference file
7. **Installs the skill**: Gets location from `$ARGUMENTS` (e.g., `--install project`) or prompts (project vs personal)

The command uses `$ARGUMENTS` to receive the file path and optional flags, and leverages `${CLAUDE_PLUGIN_ROOT}` to reference bundled scripts and templates.

**Frontmatter:**
```yaml
---
name: content-to-skill
description: "Transforms PDFs and EPUBs into Claude Code Agent Skills by chunking, extracting, and converting document content into structured skill packages with progressive disclosure. Use when converting books or documents into reusable agent skills."
argument-hint: "<path> [--name <skill-name>] [--install project|personal] [--on-conflict overwrite|cancel]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Bash(node:*), Bash(npm:*), Bash(mkdir:*), Bash(ls:*), Bash(cp:*), Bash(rm:*)
---
```

### Research Insights: Command Design

**From agent-native-reviewer + prompt-engineering + create-agent-skills skill:**

- **`disable-model-invocation: true` is critical** — Without it, Claude could auto-invoke the 30+ minute pipeline just because a user mentions a book. Every side-effect command in the compound-engineering reference plugin uses this flag.
- **`allowed-tools` format** — Uses comma-separated list with colon syntax for Bash globs (`Bash(node:*)` not `Bash(node *)`). The space-delimited format in the original plan may cause tool permission failures.
- **Arguments-first, prompts-second** — Enables autonomous agent invocation. When `--name` and `--install` are provided, the command runs without any interactive prompts. When omitted, falls back to asking the user.
- **Description uses third-person voice** — "Transforms..." not "Transform..." or "Use when the user wants to..." per skill authoring best practices.
- **No separate background skill** — The original plan's `skills/content-to-skill/SKILL.md` with `user-invocable: false` is removed. It caused a name collision (skill takes precedence over command), consumed context tokens via auto-loading, and the plan already acknowledged the command should explicitly `Read` references anyway.

#### `scripts/chunk_document.js` — Document Chunker

Ported directly from `/Users/christopherlacey/Documents/book_extraction/chunk_document.js` (364 lines). Handles both PDF and EPUB splitting:

- **PDF**: Uses `pdf-lib` to copy page ranges into separate PDF files
- **EPUB**: Uses `jszip` + `fast-xml-parser` + `html-to-text` to extract text from spine sections

CLI: `node ${CLAUDE_PLUGIN_ROOT}/scripts/chunk_document.js <input> [-p <pages>] [-o <output-dir>]`

Dependencies in `package.json`: `pdf-lib`, `jszip`, `fast-xml-parser`, `html-to-text`

#### Reference Files (Prompt Templates)

Adapted from the book_extraction prompt templates, consolidated and modified for plugin context:

| File | Source | Purpose |
|------|--------|---------|
| `references/research-prompt.md` | `RESEARCH_PROMPT.md` | Extraction methodology only (schema, priorities, quality standards). No per-chunk instructions — those live in the command. |
| `references/skill-conversion.md` | `SKILL_CONVERSION_PHASE_1-4.md` (consolidated) | Complete skill conversion format: directory planning, reference file template, SKILL.md structure with progressive disclosure, verification checklist. Single file. |

### Research Insights: Prompt Templates

**From prompt-engineering agent + code-simplicity-reviewer:**

- **Split methodology from instruction** — `research-prompt.md` defines WHAT good extraction looks like (schema, priorities, output format). The command defines WHAT TO DO with each chunk (read file, apply methodology, write output). Mixing these concerns increases token overhead when only one is needed.
- **Remove chat artifacts** — The original `RESEARCH_PROMPT.md` contains `/compact` instructions, `{{CHAPTER_CONTENT}}` template variables (for shell interpolation), synthesis prompt copy-paste sections, and emoji headers. All must be stripped for plugin context.
- **Single conversion reference** — The 4 phases were designed for separate `claude -p` invocations with isolated contexts. In Claude Code, Claude has full context and can plan directories, create files, build SKILL.md, and verify in one logical step.
- **Include a few-shot example** — Add one complete, real chapter extraction (60-80 lines) as an example in `research-prompt.md`. Concrete examples are more effective than abstract schema templates for maintaining format consistency across 30 chunks.
- **Phase 1 output as JSON** — When planning reference files, output the plan as a JSON array (`reference-plan.json`) for machine-parseable iteration in Phase 2, rather than prose that needs re-interpretation.

### The Pipeline Flow (What the Command Does)

```
User: /content-to-skill ~/Books/outlive.epub --name outlive --install project

┌─────────────────────────────────────────────────────────┐
│ Step 1: VALIDATE + SETUP                                │
│ - Check file exists, is PDF or EPUB                     │
│ - Get skill name from --name arg or prompt user         │
│ - Create working dir: /tmp/content-to-skill/<name>/     │
│ - Verify Node.js deps: npm ls or npm install            │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Step 2: CHUNK                                           │
│ - Run: node ${CLAUDE_PLUGIN_ROOT}/scripts/              │
│   chunk_document.js <input> -p 5 -o .../chunks          │
│ - Produces: chunk files + manifest.json                 │
│ - PDF chunks: Claude reads natively via Read tool       │
│ - EPUB chunks: already text, Read directly              │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Step 3: EXTRACT (Pass 1 — Per-Chunk)                    │
│ - Read research-prompt.md ONCE for methodology          │
│ - For each chunk sequentially:                          │
│   1. Read chunk content + running-context.md            │
│   2. Extract structured content                         │
│   3. Write to extraction-chunk-NNN.md (IMMEDIATELY)     │
│   4. Update running-context.md (cap at 2,000 tokens)    │
│   5. Update terminology.md (append new terms)           │
│   6. Update progress.json                               │
│   7. Report: "Chunk N/M complete"                       │
│ - Subsequent chunks use compressed 50-token reminder,   │
│   NOT the full research prompt                          │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Step 4: SYNTHESIZE (Pass 2 — Book-Level)                │
│ - Read ONLY book-spine.md (one-line per chapter) +      │
│   metadata from extraction-chunk-001.md                 │
│ - Produce: EXTRACTION_SUMMARY.md (under 5,000 tokens)   │
│ - Includes: book-level summary, quick reference index,  │
│   cross-reference map, master terminology               │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Step 5: CONVERT TO SKILL                                │
│ - Read skill-conversion.md reference                    │
│ - Plan reference files (output reference-plan.json)     │
│ - Create reference files in batches of 3-4              │
│   (reading specific chapter extractions as needed)      │
│ - Create SKILL.md with progressive disclosure           │
│ - Self-verify: all links resolve, SKILL.md < 500 lines  │
│ - Output: complete skill directory in working dir       │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Step 6: INSTALL                                         │
│ - Get location from --install arg or prompt user        │
│   - Project: .claude/skills/<name>/                     │
│   - Personal: ~/.claude/skills/<name>/                  │
│ - If dir exists: overwrite with warning (default)       │
│ - Copy skill directory to chosen location               │
│ - Write result.json with structured output              │
│ - Confirm installation                                  │
└─────────────────────────────────────────────────────────┘
```

### Context Window Management

The biggest technical challenge is fitting a full book extraction + skill conversion within Claude's context window.

#### Strategy: Two-Pass Architecture with Disk-as-Memory

**Pass 1 (Chunk Extraction)** — Sequential, per-chunk:

| Component | Token Budget |
|-----------|-------------|
| Command instructions (compressed reminder after chunk 1) | ~50-2,000 tokens |
| Running context block (from previous chunk) | ~2,000 tokens |
| Current chunk content | ~3,000-5,000 tokens |
| Output space for extraction + updated running context | ~4,000-6,000 tokens |
| **Total per step** | **~11,000-15,000 tokens** |

**Key rules:**
1. **Write per-chunk extraction files immediately** — `extraction-chunk-001.md`, `extraction-chunk-002.md`, etc. Never accumulate full extraction in context.
2. **Cap running context at 2,000 tokens** — Keep only 15 most important concepts, prune resolved threads, merge recurring themes.
3. **Separate terminology bank** — `terminology.md` grows linearly but stays compact (~15 tokens per entry). Loaded alongside running context.
4. **Maintain a book spine** — `book-spine.md` contains one-line summaries per chapter. This is what Pass 2 reads.
5. **Freeze core thesis after Chapter 1** — Do not let it drift or get rewritten with each chunk.
6. **Full research prompt loaded once** — For chunk 2+, use a compressed 50-token reminder instead.

**Pass 2 (Synthesis)** — Single pass after all chunks:

Reads only `book-spine.md` + metadata from first extraction file. Produces `EXTRACTION_SUMMARY.md` with book-level summary, cross-reference map, quick reference index, master terminology. This file is what Step 5 (conversion) reads for planning.

#### Compaction Resilience

The command includes a recovery preamble: if Claude's context is compacted mid-pipeline, it can reconstruct state by reading `progress.json` (last completed chunk), `running-context.md`, and `book-spine.md` from the working directory. All state lives on disk.

#### Working Directory Structure
```
/tmp/content-to-skill/<name>/
├── chunks/                    # Output from chunk_document.js
│   ├── chunk-001.pdf (or .txt)
│   ├── chunk-002.pdf (or .txt)
│   └── manifest.json
├── extraction-chunk-001.md    # Per-chunk extraction (Pass 1)
├── extraction-chunk-002.md
├── ...
├── running-context.md         # Overwritten after each chunk
├── terminology.md             # Append-only term glossary
├── book-spine.md              # One-line chapter summaries
├── progress.json              # { lastChunk: N, total: M, status: "extracting" }
├── EXTRACTION_SUMMARY.md      # Book-level synthesis (Pass 2)
├── reference-plan.json        # Skill conversion plan
└── skill/                     # Final skill output (Step 5)
    ├── SKILL.md
    └── references/
```

### Research Insights: Context Management

**From RAG chunking agent + performance oracle + prompt engineering agent:**

- **5-8 pages per chunk is better than 10** — Smaller chunks give Claude more output space for high-fidelity extraction. For visual-heavy books, use 5 pages.
- **Add 1-page overlap for PDF chunks** — Prevents losing arguments that span page boundaries. EPUB already splits on section boundaries.
- **Use Claude's native PDF reading** — Claude Code's Read tool can view PDF pages as images. This is better for visual-heavy content (diagrams, charts) than text extraction.
- **For books >300 pages** (~50 chunks), pipeline takes 25-50 minutes. Context window saturation is the primary bottleneck, not CPU or I/O.
- **Estimated token economics**: ~400K-600K input tokens, ~80K-120K output tokens for a 300-page book across 37-38 tool-use turns.

### Installation Prompt

If `--install` is not provided in `$ARGUMENTS`, the command asks:

```
Installing skill "<name>".
Where should it go?

1. Project skill (.claude/skills/<name>/) - Available in this project only (default)
2. Personal skill (~/.claude/skills/<name>/) - Available in all your projects
```

If the target directory already exists, overwrite with a warning message (no prompt — the user is re-running intentionally).

### Structured Output

On completion, write `result.json` to the working directory for agent consumption:

```json
{
  "status": "success",
  "skill_name": "outlive",
  "installed_to": ".claude/skills/outlive/",
  "files_created": 14,
  "chunks_processed": 30,
  "working_directory": "/tmp/content-to-skill/outlive/"
}
```

## Implementation Phases

### Phase 1: Plugin Scaffold + Chunking (Foundation)

**Goal**: Working plugin that can chunk documents via `/content-to-skill`.

- [x] Initialize git repo in `/Users/christopherlacey/Documents/content-to-skill/`
- [x] Create `.claude-plugin/plugin.json` manifest (with `repository` and `license` fields)
- [x] Create `package.json` with dependencies (`pdf-lib`, `jszip`, `fast-xml-parser`, `html-to-text`)
- [x] Port `chunk_document.js` from book_extraction to `scripts/chunk_document.js`
  - Add file-size warning at 100MB+ (for scanned/image-heavy PDFs)
  - Lower default chunk size from 10 to 5 pages
- [x] Create `commands/content-to-skill.md` with all 6 steps
  - Include `disable-model-invocation: true` and full `allowed-tools` from the start
  - Parse `$ARGUMENTS` for `--name` and other flags
- [x] Run `npm install` to verify dependencies
- [x] Create `.gitignore` (node_modules, .cache/)
- [x] Create `CLAUDE.md` with development conventions
- [ ] Test: `/content-to-skill ~/path/to/test.pdf` produces chunks

**Files created:**
- `.claude-plugin/plugin.json`
- `package.json`
- `scripts/chunk_document.js`
- `commands/content-to-skill.md`
- `CLAUDE.md`
- `.gitignore`

### Phase 2: Extraction Pipeline (Two-Pass)

**Goal**: The command can chunk AND extract structured content from a document.

- [x] Create `references/research-prompt.md` adapted from `RESEARCH_PROMPT.md`:
  - Remove chat artifacts: `/compact` instructions, `{{}}` template variables, synthesis copy-paste section, emoji headers
  - Contains ONLY methodology definition: extraction priorities, output schema, quality standards, running context format
  - Use imperative procedural language, not conversational framing
  - Include one complete chapter extraction example (60-80 lines) as few-shot
- [x] Extend `commands/content-to-skill.md` with Steps 3-4 (extraction + synthesis):
  - **Pass 1**: Sequential per-chunk extraction with disk writes
    - Read research-prompt.md ONCE, then use compressed reminder for subsequent chunks
    - Write `extraction-chunk-NNN.md` after each chunk
    - Update `running-context.md` (cap at 2,000 tokens), `terminology.md`, `book-spine.md`
    - Write `progress.json` after each chunk for compaction resilience
    - Report progress: "Chunk N/M complete"
  - **Pass 2**: Book-level synthesis
    - Read `book-spine.md` + first chunk metadata
    - Produce `EXTRACTION_SUMMARY.md` (under 5,000 tokens)
  - Include recovery preamble for compaction resilience
- [ ] Test: Full extraction from a test PDF/EPUB produces per-chunk files + EXTRACTION_SUMMARY.md

**Files created/modified:**
- `references/research-prompt.md` (new)
- `commands/content-to-skill.md` (modified)

### Phase 3: Skill Conversion Pipeline

**Goal**: The command can chunk, extract, AND convert to a complete skill package.

- [x] Create `references/skill-conversion.md` (consolidated from 4 phases):
  - Describes the desired output format (directory structure, reference files with YAML frontmatter, SKILL.md with progressive disclosure)
  - Includes reference file template (frontmatter, problem, key principle, examples, quotes, rules of thumb)
  - Includes SKILL.md structure template (3-level progressive disclosure)
  - Includes verification checklist (file structure, links, content quality, line counts)
  - Remove `.agents/skills/` references (use `.claude/skills/` only)
  - Remove `triggers` frontmatter field (not in Agent Skills spec; use `description` for discoverability)
- [x] Extend `commands/content-to-skill.md` with Step 5 (conversion):
  - Read `skill-conversion.md` reference
  - Plan reference files, output `reference-plan.json` (structured, not prose)
  - Create reference files in batches of 3-4 (reading specific chapter extractions from disk)
  - Create SKILL.md
  - Self-verify all links resolve, SKILL.md < 500 lines
- [ ] Test: Full pipeline produces a valid skill directory

**Files created/modified:**
- `references/skill-conversion.md` (new)
- `commands/content-to-skill.md` (modified)

### Phase 4: Installation + Polish

**Goal**: Complete end-to-end plugin with installation and error handling.

- [x] Extend `commands/content-to-skill.md` with Step 6 (installation):
  - Parse `--install` from `$ARGUMENTS` or prompt (project/personal, default: project)
  - If target dir exists, overwrite with warning (no prompt)
  - Copy skill directory to chosen location
  - Write `result.json` with structured output
- [x] Add error handling throughout the command:
  - File not found → clear message
  - Unsupported format → clear message
  - Node.js not available → clear message
  - npm dependencies not installed → auto-run `npm install --prefix ${CLAUDE_PLUGIN_ROOT}`
- [ ] Create `README.md` with usage, installation, prerequisites
- [ ] Consider bundling dependencies (esbuild/ncc) for distribution reliability
- [ ] Test full end-to-end: PDF → installed skill → invoke the generated skill

**Files created/modified:**
- `commands/content-to-skill.md` (modified)
- `README.md` (new)

## Acceptance Criteria

### Functional Requirements

- [ ] `/content-to-skill path/to/book.pdf` chunks a PDF and extracts content
- [ ] `/content-to-skill path/to/book.epub` chunks an EPUB and extracts content
- [ ] Extracted content is converted into a valid Agent Skills package
- [ ] Generated skill follows the 3-level progressive disclosure pattern
- [ ] User is prompted for skill name and installation location
- [ ] Skill installs correctly to `.claude/skills/` (project) or `~/.claude/skills/` (personal)
- [ ] Generated skills pass the Phase 4 verification checklist

### Non-Functional Requirements

- [ ] Plugin follows compound-engineering-plugin conventions exactly
- [ ] Generated skills conform to the Agent Skills spec (agentskills.io)
- [ ] Works without external agent CLIs (no `codex`, no `claude -p`)
- [ ] Handles books of 100-500 pages within Claude's context management

### Quality Gates

- [ ] Plugin loads correctly via `/plugin install content-to-skill`
- [ ] Slash command appears in `/` menu with description
- [ ] At least one book successfully converted end-to-end (e.g., Outlive EPUB)
- [ ] Generated skill is usable — invoking it returns relevant knowledge

## Dependencies & Prerequisites

| Dependency | Purpose | Required? |
|-----------|---------|-----------|
| Node.js (v18+) | Running `chunk_document.js` | Yes |
| `pdf-lib` | PDF page splitting | Yes (npm) |
| `jszip` | EPUB archive reading | Yes (npm) |
| `fast-xml-parser` | EPUB OPF parsing | Yes (npm) |
| `html-to-text` | EPUB HTML-to-text conversion | Yes (npm) |
| `pdftotext` (poppler) | Text extraction from PDF chunks | Optional (Claude can read PDFs natively) |

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Context window overflow on large books (300+ pages) | High | High | Two-pass architecture; per-chunk disk writes; running context capped at 2K tokens; compressed prompts after chunk 1; compaction-resilient recovery preamble |
| Plugin cache directory is read-only (npm install fails) | Medium | High | Bundle `node_modules/` in repo, or use `esbuild`/`ncc` for single-file chunker; test with installed (cached) plugin |
| `fs.readFileSync` OOM on large scanned PDFs (100MB+) | Low | High | Add file-size warning at 100MB; consider `qpdf` CLI for extreme cases in V2 |
| Plugin caching breaks script paths | Medium | Medium | Use `${CLAUDE_PLUGIN_ROOT}` consistently (never `${PLUGIN_ROOT}`); test with installed plugin |
| npm dependencies not installed after plugin install | Medium | Medium | Auto-detect and run `npm install --prefix ${CLAUDE_PLUGIN_ROOT}` at command start |
| Quality of generated skills varies by book | Medium | Medium | Verification checklist in `skill-conversion.md`; extraction density metric (30-60% of input = healthy) |
| EPUB format variations cause chunking failures | Low | Medium | The existing `chunk_document.js` handles standard EPUBs; add error handling for edge cases |

### Research Insights: Performance

**From performance oracle:**

- **Primary bottleneck is Claude processing time**, not I/O or CPU. A 300-page book takes ~25-50 minutes. Optimizing JavaScript has negligible impact on total duration.
- **Token economics**: ~400K-600K input tokens, ~80K-120K output tokens for a 300-page book across ~38 turns.
- **npm install cold start**: 5-25 seconds (one-time). Commit `package-lock.json` for faster deterministic installs.
- **Temp file accumulation**: Each run produces ~30-150MB of chunks. Add cleanup after successful installation.

## Key Differences from book_extraction

| Aspect | book_extraction | content-to-skill plugin |
|--------|----------------|------------------------|
| Execution engine | `codex exec` or `claude -p` | Claude Code itself (in-context) |
| Installation | Manual clone + run scripts | `/plugin install content-to-skill` |
| Output format | `.agents/skills/` + `~/.codex/skills/` | `.claude/skills/` or `~/.claude/skills/` (Agent Skills standard) |
| Automation | `onboard.sh` (1443 lines Bash) | `commands/content-to-skill.md` (Claude-native orchestration) |
| Skill format | Custom (older standalone + newer modular) | Agent Skills spec compliant |
| User interaction | CLI flags + fzf picker | AskUserQuestion prompts within Claude Code |

## Open Questions & Edge Cases

### Resolved by Deepening (incorporated into plan above)

- ~~Context management without `/compact`~~ → Two-pass architecture with per-chunk disk writes, capped running context, compressed prompts
- ~~Large extraction exceeds context for conversion~~ → EXTRACTION_SUMMARY.md (under 5K tokens) for planning; read specific chapters for reference file creation
- ~~`triggers` field not in Agent Skills spec~~ → Embed trigger phrases in `description`; remove `triggers`
- ~~Name collision between command and skill~~ → Background skill removed entirely; command is the single entry point
- ~~`allowed-tools` format and completeness~~ → Fixed to comma-separated colon syntax with full tool list
- ~~Missing `disable-model-invocation: true`~~ → Added to command frontmatter
- ~~4 installation options too many~~ → Reduced to 2 (project/personal)
- ~~Target directory already exists~~ → Overwrite with warning (no prompt)
- ~~`/compact` in risk mitigation table~~ → Replaced with compaction-resilient recovery strategy

### Remaining — Decide During Implementation

**Dependency bundling strategy**: Should we (a) bundle `node_modules/` in the repo (~29MB), (b) use `esbuild`/`ncc` to create a single-file chunker with zero deps, or (c) rely on runtime `npm install`? Option (b) is cleanest but requires a build step. **Decide in Phase 1.**

**Chunk size configuration**: Default is 5 pages. Should the command expose `--pages N` to the user, or auto-detect based on document type? The pre-scan pass (read TOC + first/last pages to determine doc type) is valuable but adds complexity. **Decide in Phase 2.**

**Resumability in V1**: The `progress.json` is written for compaction resilience. Should V1 also check for existing progress on startup and offer to resume? Nearly free to implement (10 lines of logic) and saves 30-minute restarts. **Recommend: yes, implement in V1.**

**Working directory location**: `/tmp/` is cleaned periodically on macOS. Consider `.content-to-skill-workdir/` in the current directory instead. Tradeoff: more durable but creates visible dotfiles. **Decide in Phase 1.**

### Edge Cases

- **Password-protected / DRM EPUBs**: The chunker will fail naturally. The error message is sufficient for V1. Add explicit DRM detection in V2 if users report confusion.
- **Scanned/image-only PDFs**: Claude can read PDF pages as images via Read tool, but extraction quality depends on image clarity. Warn the user if no text is extractable.
- **Books >500 pages (~80+ minutes)**: May hit conversation limits. Document as a known limitation; recommend splitting into volumes.

## References

### Internal
- Book extraction pipeline: `/Users/christopherlacey/Documents/book_extraction/`
- Chunker script: `/Users/christopherlacey/Documents/book_extraction/chunk_document.js`
- Research prompt: `/Users/christopherlacey/Documents/book_extraction/RESEARCH_PROMPT.md`
- Conversion phases: `/Users/christopherlacey/Documents/book_extraction/SKILL_CONVERSION_PHASE_*.md`
- Onboarding wizard: `/Users/christopherlacey/Documents/book_extraction/onboard.sh`

### External
- [Agent Skills Specification](https://agentskills.io/specification)
- [Claude Code Plugin Docs](https://code.claude.com/docs/en/plugins)
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
- [Compound Engineering Plugin (reference implementation)](https://github.com/EveryInc/compound-engineering-plugin)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
