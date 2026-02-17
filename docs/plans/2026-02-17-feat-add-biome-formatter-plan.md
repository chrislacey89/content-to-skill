---
title: Add Biome as formatter and linter
type: feat
status: completed
date: 2026-02-17
---

# Add Biome as Formatter and Linter

## Overview

Add Biome as the project's formatter and linter. No existing formatters or linters are configured — this is a greenfield setup covering 4 source files in `scripts/`, 8 test files in `tests/`, and `vitest.config.ts`.

## Acceptance Criteria

- [x] `@biomejs/biome` installed as exact dev dependency
- [x] `biome.json` created with sensible defaults for this project
- [x] `npm run format`, `npm run lint`, and `npm run check` scripts work
- [x] All existing source and test files are formatted
- [x] Tests pass after formatting
- [x] `CLAUDE.md` updated with formatting conventions

## Implementation

### 1. Install Biome

```bash
npm install --save-dev --save-exact @biomejs/biome
npx @biomejs/biome init
```

### 2. Configure `biome.json`

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "files": {
    "ignore": [
      "node_modules/",
      ".cache/",
      "docs/",
      "references/",
      "commands/",
      ".claude-plugin/"
    ]
  }
}
```

**Key decisions:**
- **Tabs + 100 line width** — Biome defaults. Adjust if you prefer spaces or a different width.
- **`useIgnoreFile: true`** — respects `.gitignore`, so `node_modules/` is already excluded.
- **Ignore non-code dirs** — `docs/`, `references/`, `commands/`, `.claude-plugin/` contain markdown and JSON that shouldn't be reformatted by Biome.
- **Recommended lint rules** — safe starting point; can tighten later.
- **Organize imports** — auto-sorts imports on format.

### 3. Add scripts to `package.json`

```json
"scripts": {
  "format": "biome format --write .",
  "format:check": "biome format .",
  "lint": "biome lint .",
  "check": "biome check --write .",
  "chunk": "npx tsx scripts/chunk_document.ts",
  "test": "vitest run",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration"
}
```

**Script semantics:**
| Script | What it does | Writes changes? | CI use? |
|--------|-------------|-----------------|---------|
| `format` | Reformat all files | Yes | No |
| `format:check` | Report formatting violations | No | Yes |
| `lint` | Report lint violations | No | Yes |
| `check` | Format + lint + fix | Yes | No |

### 4. Format existing codebase

```bash
npx @biomejs/biome check --write .
```

This will format and auto-fix all source and test files in one pass.

**Files affected (~15):**
- `scripts/chunk_document.ts`
- `scripts/generate_covers.ts`
- `scripts/library_index.ts`
- `scripts/library_migrate.ts`
- `tests/create-fixtures.ts`
- `tests/unit/*.test.ts` (5 files)
- `tests/integration/*.test.ts` (3 files)
- `vitest.config.ts`

### 5. Verify tests pass

```bash
npm test
```

### 6. Update `CLAUDE.md`

Add a **Formatting** section:

```markdown
## Formatting

This project uses [Biome](https://biomejs.dev/) for formatting and linting.

```bash
npm run check    # Format + lint + fix
npm run format   # Format only
npm run lint     # Lint only (no fixes)
```

Run `npm run check` before committing.
```

### 7. Commit strategy

Make **two commits** to keep formatting noise separate from tooling changes:

1. **Commit 1:** Add Biome config, `package.json` scripts, `CLAUDE.md` update — the tooling setup
2. **Commit 2:** Run `npm run check` and commit all formatting changes — pure formatting, no logic changes

This keeps `git blame` clean: the formatting commit can be added to `.git-blame-ignore-revs` later if desired.

## Context

- **Project:** Claude Code plugin (TypeScript, ES modules, strict mode, ES2022)
- **No existing formatters** — clean setup, no migration needed
- **Package manager:** npm
- **Test runner:** vitest (unaffected by formatting)

## References

- Biome docs: https://biomejs.dev/
- `package.json` — existing scripts at lines 6-11
- `tsconfig.json` — TypeScript config (ES2022, NodeNext, strict)
- `.gitignore` — currently ignores `node_modules/` and `.cache/`
