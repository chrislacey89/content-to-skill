---
title: "feat: Add Vitest test suite for deterministic scripts"
type: feat
status: completed
date: 2026-02-17
---

# feat: Add Vitest test suite for deterministic scripts

## Overview

Add a Vitest-based test suite covering the three TypeScript CLI scripts (`chunk_document.ts`, `library_index.ts`, `library_migrate.ts`) with unit tests for pure functions and integration tests for CLI behavior. No LLM-driven steps are tested — only deterministic code.

## Problem Statement / Motivation

The plugin has zero automated tests. All validation is manual (`npx tsx scripts/chunk_document.ts <file>`). This means regressions in chunking logic, frontmatter parsing, library indexing, or migration can ship undetected. The scripts contain pure functions that are trivially testable, and the CLI interfaces have clear input/output contracts that can be validated against fixtures.

## Proposed Solution

Two test layers using Vitest:

1. **Unit tests** — Import and exercise pure functions directly (no I/O, no mocking)
2. **Integration tests** — Spawn CLI scripts via `child_process.execSync` against committed fixtures, validate exit codes and output structure

### Key Architectural Decisions

**Refactoring strategy:** Add `import.meta.url` entry-point guards to all three scripts so they can be imported by Vitest without auto-executing. Export pure functions as named exports. This is the minimal-diff approach — no new files, scripts keep working as CLIs.

```typescript
// Pattern applied to all three scripts:
export function normalizeText(text: string): string { /* ... */ }
// ... other exports ...

function main() { /* ... */ }

// Guard: only run when executed directly, not when imported
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main();
}
```

**`os.homedir()` isolation:** Integration tests override `HOME` via the `env` option on `child_process.execSync`, pointing to a temp directory. Scripts already use `os.homedir()` which reads `HOME` on Unix, so no script changes needed for this.

```typescript
execSync('npx tsx scripts/library_index.ts', {
  env: { ...process.env, HOME: tmpDir }
});
```

**`extractEpubSections` classification:** This is an integration test (reads from disk, uses jszip), not a unit test. It lives in `tests/integration/` and uses the committed EPUB fixture.

**`__dirname` fix:** Replace `__dirname` in `library_migrate.ts:199` with ESM-compatible equivalent:

```typescript
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Module system:** Add `"type": "module"` to `package.json` and create a `tsconfig.json`. This aligns the project with the ESM imports already used in the scripts.

## Technical Considerations

- **Fixture isolation:** Integration tests that test destructive operations (`--remove-originals`) must copy fixtures to a temp directory first, never operate on committed fixtures directly
- **Temp directory cleanup:** Each integration test creates a unique temp dir via `fs.mkdtempSync(path.join(os.tmpdir(), 'cts-test-'))` and cleans up in `afterEach`
- **`process.exit` in scripts:** Unit tests that call `main()` must `vi.spyOn(process, 'exit')` to prevent terminating the test runner
- **EPUB fixture validity:** Must have `META-INF/container.xml`, OPF package, and at least 2 spine items with non-empty text content to exercise chunking
- **PDF fixture:** A 2-page PDF created with any tool (even a "Hello World" doc exported from a text editor)

## Acceptance Criteria

### Phase 1: Setup & Refactoring

- [x]Add `"type": "module"` to `package.json`
- [x]Create `tsconfig.json` with ESM settings
- [x]Install `vitest` as dev dependency
- [x]Create `vitest.config.ts`
- [x]Add `"test"`, `"test:unit"`, `"test:integration"` scripts to `package.json`
- [x]Refactor `scripts/chunk_document.ts`: add entry-point guard, export pure functions (`normalizeText`, `toArray`, `resolveInputMeta`)
- [x]Refactor `scripts/library_index.ts`: add entry-point guard, export `validateBook`
- [x]Refactor `scripts/library_migrate.ts`: add entry-point guard, export `parseFrontmatter`, fix `__dirname` to ESM-compatible

### Phase 2: Fixtures

- [x]Commit `tests/fixtures/sample.pdf` (~2 pages, <50KB)
- [x]Commit `tests/fixtures/sample.epub` (valid EPUB, 2+ spine items, <50KB)
- [x]Create `tests/fixtures/books/test-book/book.json` (valid, all required fields)
- [x]Create `tests/fixtures/books/test-book/SKILL.md` (with frontmatter)
- [x]Create `tests/fixtures/books/test-book/references/ref.md`
- [x]Create `tests/fixtures/books/incomplete-book/book.json` (missing `description` field — tests warning path)
- [x]Create `tests/fixtures/skills/test-skill/SKILL.md` (with frontmatter for migration testing)
- [x]Create `tests/fixtures/skills/test-skill/references/ref.md`

### Phase 3: Unit Tests

- [x]`tests/unit/normalize-text.test.ts` — whitespace collapsing, non-breaking spaces, blank lines, empty string, already-normalized text
- [x]`tests/unit/to-array.test.ts` — array passthrough, single value wrapping, `undefined`/`null`/`false` handling
- [x]`tests/unit/resolve-input-meta.test.ts` — `.pdf`/`.epub` detection, case insensitivity, output path generation
- [x]`tests/unit/parse-frontmatter.test.ts` — happy path, missing delimiters, quoted values, values with colons, empty content
- [x]`tests/unit/validate-book.test.ts` — valid book, missing fields, empty string fields, `console.warn` side effect

### Phase 4: Integration Tests

- [x]`tests/integration/chunk-document.test.ts`
  - PDF: exits 0, creates output dir, manifest.json has correct schema (totalPages, pagesPerChunk, chunks array), chunk files are named `chunk_NNN.pdf`
  - EPUB: exits 0, manifest.json has correct schema, chunk files are `.txt`
  - Missing file: exits non-zero
  - Invalid extension: exits non-zero
- [x]`tests/integration/library-index.test.ts`
  - Valid books dir: exits 0, creates `index.json` with correct schema (version, lastUpdated, bookCount, books array)
  - Incomplete book.json: skipped with warning, not included in index
  - Empty books dir: exits 0, creates index with `bookCount: 0`
- [x]`tests/integration/library-migrate.test.ts`
  - Skills with `references/` dir: migrated to library, `book.json` generated
  - `--remove-originals`: source skill directory deleted (using copied fixtures in temp dir)
  - No matching skills: exits 0, no migration performed

### Quality Gates

- [x]`npm test` passes (runs both layers)
- [x]`npm run test:unit` passes (unit only, <2s)
- [x]`npm run test:integration` passes (integration only, <30s)
- [x]All tests are deterministic — no network, no LLM calls, no reliance on `~/.claude/`

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| `import.meta.url` guard doesn't work identically in tsx vs Vitest | Verify with a smoke test immediately after refactoring; both runtimes support `import.meta.url` |
| EPUB fixture is structurally invalid | Create using Pandoc or manually assemble a known-good ZIP structure; validate by running `extractEpubSections` manually before committing |
| Integration tests are slow | Separate `test:unit` and `test:integration` scripts; unit tests run in <2s for fast feedback |
| `HOME` override doesn't work on all platforms | Only Darwin is targeted (per environment); `os.homedir()` reads `HOME` env var on Unix |

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Edit | Add `"type": "module"`, vitest dev dep, test scripts |
| `tsconfig.json` | Create | Minimal ESM TypeScript config |
| `vitest.config.ts` | Create | Test runner configuration |
| `scripts/chunk_document.ts` | Edit | Add exports, entry-point guard |
| `scripts/library_index.ts` | Edit | Add exports, entry-point guard |
| `scripts/library_migrate.ts` | Edit | Add exports, entry-point guard, fix `__dirname` |
| `tests/fixtures/*` | Create | PDF, EPUB, mock book/skill directories |
| `tests/unit/*.test.ts` | Create | 5 unit test files |
| `tests/integration/*.test.ts` | Create | 3 integration test files |

## References

- Brainstorm: `docs/brainstorms/2026-02-17-testing-strategy-brainstorm.md`
- Scripts: `scripts/chunk_document.ts`, `scripts/library_index.ts`, `scripts/library_migrate.ts`
- CLAUDE.md testing section for manual test commands
