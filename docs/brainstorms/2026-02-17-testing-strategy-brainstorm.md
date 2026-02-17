# Testing Strategy Brainstorm

**Date:** 2026-02-17
**Status:** Draft

## What We're Building

An automated test suite for the content-to-skill plugin using Vitest. The suite covers the deterministic parts of the pipeline (chunking, library indexing, migration) but explicitly skips LLM-driven steps (extraction, synthesis, skill conversion) to avoid burning API tokens.

**Two test layers:**

1. **Unit tests** for pure functions extracted from scripts — fast, no I/O, no side effects
2. **Integration tests** that run CLI scripts against committed fixtures and validate output structure (exit codes, manifest schema, file layout)

## Why This Approach

- **Unit + Integration** gives the best signal-to-noise ratio for this codebase
- The scripts contain several pure functions (`normalizeText`, `parseFrontmatter`, `validateBook`, `extractEpubSections`) that are trivially testable
- Integration tests catch CLI-level issues (broken imports, arg parsing, output format changes) that unit tests miss
- Skipping LLM steps keeps the test suite free, fast, and deterministic
- Small committed fixtures (~50KB) keep tests self-contained and reproducible

## Key Decisions

1. **Framework:** Vitest (native TypeScript/ESM support, fast, works with tsx)
2. **Test fixtures:** Commit small test PDF (~2 pages) and minimal EPUB to `tests/fixtures/`
3. **LLM steps:** Not tested — only deterministic scripts are covered
4. **CLI testing:** Run scripts via `child_process` or Vitest's `exec`, validate exit codes and output files
5. **Refactoring:** Extract and export pure functions from scripts so they can be unit tested directly

## Scope

### In Scope

**Unit tests for:**
- `normalizeText()` — whitespace handling, non-breaking spaces, blank line collapsing
- `parseFrontmatter()` — YAML-like header extraction from SKILL.md files
- `validateBook()` — required field checks for book.json
- `extractEpubSections()` — OPF manifest parsing, spine item filtering
- `resolveInputMeta()` — file extension detection, output path generation
- CLI argument parsing logic

**Integration tests for:**
- `chunk_document.ts` with PDF fixture → verify manifest.json schema, chunk file count, naming
- `chunk_document.ts` with EPUB fixture → verify text chunks, manifest structure
- `library_index.ts` with mock book directories → verify index.json schema
- `library_migrate.ts` with mock skills directory → verify migration output

**Schema validation for:**
- `manifest.json` structure (totalPages, pagesPerChunk, chunks array)
- `book.json` required fields (name, title, description)
- `index.json` structure (version, lastUpdated, bookCount, books array)

### Out of Scope

- Testing LLM-driven extraction/synthesis (Steps 3-5 of pipeline)
- Testing `.md` command files directly (consumed by Claude Code runtime)
- Performance/load testing
- E2E tests of the full 6-step pipeline

## Test Structure

```
tests/
  fixtures/
    sample.pdf          # ~2-page PDF for chunking tests
    sample.epub         # Minimal valid EPUB
    books/              # Mock book.json files for indexing tests
      test-book/
        book.json
        SKILL.md
        references/
          ref.md
    skills/             # Mock skills for migration tests
      test-skill/
        SKILL.md
        references/
          ref.md
  unit/
    normalize-text.test.ts
    parse-frontmatter.test.ts
    validate-book.test.ts
    extract-epub-sections.test.ts
  integration/
    chunk-document.test.ts
    library-index.test.ts
    library-migrate.test.ts
```

## Open Questions

None — all key decisions have been made.
