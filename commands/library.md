---
name: library
description: "Browse and load book knowledge on demand. Use /library to list books, /library <name> to load one."
argument-hint: "[<book-name>] [--search <topic>] [--migrate] [--rebuild-index] [--generate-covers]"
allowed-tools: Read, Glob, Bash(npx:*), Bash(ls:*), Bash(mkdir:*), Bash(cp:*), Bash(rm:*), Bash(echo:*)
---

# Library

Browse and load book-derived knowledge on demand.

## Arguments

Parse `$ARGUMENTS` for these flags. Any unrecognized positional argument is the book name.

| Flag | Default | Description |
|------|---------|-------------|
| `<book-name>` | (none) | Load a specific book's knowledge into context |
| `--search <topic>` | (none) | Search books by topic, tags, or description |
| `--migrate` | (none) | Migrate existing book-skills from `~/.claude/skills/` to the library |
| `--rebuild-index` | (none) | Rebuild the library index from book.json files |
| `--generate-covers` | (none) | Generate cover images for all books missing them |

## Mode: List All Books (`/library`)

When no arguments are provided:

1. **MANDATORY FIRST STEP — resolve the library path.** Do NOT call Read yet. Run this bash command first:
   ```
   echo "${CLAUDE_LIBRARY_DIR:-$([ -f "$HOME/.claude/library/index.json" ] && echo "$HOME/.claude/library" || ([ -f "$(pwd)/.claude/library/index.json" ] && echo "$(pwd)/.claude/library" || echo "NOT_FOUND"))}"
   ```
   This outputs one absolute path or `NOT_FOUND`. Save the output as `LIB` for all subsequent steps.

   If the output is `NOT_FOUND`, report this and stop:
   > Library not found. Checked `~/.claude/library/` and `.claude/library/` (project-relative).
   >
   > **Cowork users:** Authorize a folder containing `.claude/library/`, or set `CLAUDE_LIBRARY_DIR`.
   > **Local users:** Run `/content-to-skill` to add your first book, or `/library --migrate` to import existing book-skills.

2. Now read the library index using the resolved path from step 1:
   ```
   Read {LIB}/index.json
   ```

3. If the file doesn't exist or is empty, report:
   > No books in your library yet. Use `/content-to-skill` to add books, or `/library --migrate` to import existing book-skills.

4. If books exist, display each book as a card. For each book:
   - Read the cover image (this renders it inline for the user):
     ```
     Read {LIB}/books/<name>/cover.png
     ```
   - Immediately after the cover, display the book's details:
     ```
     **<title>** by <author> (`<name>`)
     Category: <category> | Tags: <tags>
     ```
   - Add a blank line between each book card.

   If a book has no `coverImage` field, display its details without a cover.

   After all books, add:
   > Use `/library <name>` to load a book's knowledge into this conversation.

## Mode: Load a Book (`/library <name>`)

When a book name is provided:

1. **MANDATORY FIRST STEP — resolve the library path.** Do NOT call Read yet. Run this bash command first:
   ```
   echo "${CLAUDE_LIBRARY_DIR:-$([ -f "$HOME/.claude/library/index.json" ] && echo "$HOME/.claude/library" || ([ -f "$(pwd)/.claude/library/index.json" ] && echo "$(pwd)/.claude/library" || echo "NOT_FOUND"))}"
   ```
   Save the output as `LIB`. If `NOT_FOUND`, report the error (same as List mode) and stop.

2. Read the book's SKILL.md:
   ```
   Read {LIB}/books/<name>/SKILL.md
   ```

3. If not found, report:
   > Book "<name>" not found in library. Use `/library` to see available books.

4. If found, check for a cover image and display it:
   ```
   Read {LIB}/books/<name>/cover.png
   ```
   If the cover exists, it will display inline. If not, skip silently.

5. Output the full SKILL.md content into the conversation so the model has the book's knowledge available.

6. Then report:
   > Loaded **<title>** by <author>. Reference files are available at `{LIB}/books/<name>/references/`.
   >
   > Ask me anything about this book's concepts, or I'll apply its frameworks when relevant.

## Mode: Search (`/library --search <topic>`)

1. **MANDATORY FIRST STEP — resolve the library path.** Do NOT call Read yet. Run this bash command first:
   ```
   echo "${CLAUDE_LIBRARY_DIR:-$([ -f "$HOME/.claude/library/index.json" ] && echo "$HOME/.claude/library" || ([ -f "$(pwd)/.claude/library/index.json" ] && echo "$(pwd)/.claude/library" || echo "NOT_FOUND"))}"
   ```
   Save the output as `LIB`. If `NOT_FOUND`, report the error (same as List mode) and stop.

2. Read the library index:
   ```
   Read {LIB}/index.json
   ```

3. If the index is empty or missing, report no books available.

4. Match the search query against each book's:
   - `title`
   - `description`
   - `tags` array
   - `category`
   - `name`

5. Display matching books as a table (same format as list mode), sorted by relevance.

6. If no matches, suggest:
   > No books matched "<topic>". Use `/library` to see all available books.

## Mode: Migrate (`/library --migrate`)

1. Run the migration script:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/library_migrate.ts
   ```

2. The script will:
   - Scan `~/.claude/skills/` for directories containing a `references/` subdirectory
   - Copy each matching skill to the library books directory
   - Generate a minimal `book.json` from SKILL.md frontmatter
   - Rebuild the library index

3. After migration completes, resolve the library path:
   ```
   echo "${CLAUDE_LIBRARY_DIR:-$([ -f "$HOME/.claude/library/index.json" ] && echo "$HOME/.claude/library" || ([ -f "$(pwd)/.claude/library/index.json" ] && echo "$(pwd)/.claude/library" || echo "NOT_FOUND"))}"
   ```
   Save the output as `LIB`.

4. Review each migrated book's `book.json` and fill in any placeholder fields:
   - Read each `{LIB}/books/<name>/book.json`
   - Read the corresponding `SKILL.md` to infer missing metadata
   - Update `title`, `author`, `year`, `category`, and `tags` if they are placeholders
   - Write updated `book.json`

5. Rebuild the index:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/library_index.ts
   ```

6. Report results:
   > Migrated N book(s) to the library:
   > - `<name>`: <title> by <author>
   >
   > Original skills remain in `~/.claude/skills/`. You can remove them manually once you've verified the migration.

## Mode: Generate Covers (`/library --generate-covers`)

1. Run the cover generation script:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/generate_covers.ts --all
   ```

2. Report the result:
   > Generated cover images for N book(s).

## Mode: Rebuild Index (`/library --rebuild-index`)

1. Run the index builder:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/library_index.ts
   ```

2. Report the result:
   > Library index rebuilt. Found N book(s).
