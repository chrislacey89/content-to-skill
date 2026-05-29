# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).
Releases prior to 1.8.0 are not itemized here.

## [1.8.0] - 2026-05-29

### Changed

- **Diagram generation now uses inline Mermaid instead of Excalidraw.** Step 5c of the
  skill-conversion pipeline embeds ` ```mermaid ` fenced blocks directly in the relevant
  reference Markdown for concepts that lack a source figure. Diagrams render natively on
  GitHub, in VS Code, and in other Mermaid-aware viewers — no renderer, no image files,
  no extra toolchain.
- **Bundled skill swapped from `excalidraw-diagram` to `mermaid`** in `plugin.json`. The
  Mermaid skill ships strict per-type syntax references for 23 diagram types plus a
  GitHub-contrast guide. Step 5c invokes `/mermaid` to generate each diagram rather than
  paraphrasing its workflow, keeping the skill as the single source of truth for diagram
  syntax and verification.

### Removed

- The `excalidraw-diagram` skill and its `uv` / Python / Playwright PNG renderer.
- The `diagrams/` output directory and the `diagrams` field in `book.json` — diagrams now
  live inline in reference files rather than as separate `.excalidraw` files.
