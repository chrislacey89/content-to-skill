---
name: library
description: "Browse and load book knowledge on demand. Use /library to list books, /library <name> to load one."
argument-hint: "[<book-name>] [--search <topic>] [--migrate] [--rebuild-index] [--generate-covers]"
allowed-tools: Read, Glob, Bash(npx:*), Bash(ls:*), Bash(mkdir:*), Bash(cp:*), Bash(rm:*)
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

1. Read the library index:
   ```
   Read ~/.claude/library/index.json
   ```

2. If the file doesn't exist or is empty, report:
   > No books in your library yet. Use `/content-to-skill` to add books, or `/library --migrate` to import existing book-skills.

3. If books exist, for each book that has a `coverImage` field (non-null), read the cover image file:
   ```
   Read ~/.claude/library/books/<name>/cover.png
   ```
   This will display the cover inline.

4. Display a table with all books:

   | # | Name | Title | Author | Category | Tags |
   |---|------|-------|--------|----------|------|
   | 1 | `mom-test` | The Mom Test | Rob Fitzpatrick | business | customer-discovery, validation |

   Show each book's cover image directly above or beside its table entry. If a book has no cover, skip it silently.

   Then add:
   > Use `/library <name>` to load a book's knowledge into this conversation.

## Mode: Load a Book (`/library <name>`)

When a book name is provided:

1. Read the book's SKILL.md:
   ```
   Read ~/.claude/library/books/<name>/SKILL.md
   ```

2. If not found, report:
   > Book "<name>" not found in library. Use `/library` to see available books.

3. If found, check for a cover image and display it:
   ```
   Read ~/.claude/library/books/<name>/cover.png
   ```
   If the cover exists, it will display inline. If not, skip silently.

4. Output the full SKILL.md content into the conversation so the model has the book's knowledge available.

5. Then report:
   > Loaded **<title>** by <author>. Reference files are available at `~/.claude/library/books/<name>/references/`.
   >
   > Ask me anything about this book's concepts, or I'll apply its frameworks when relevant.

## Mode: Search (`/library --search <topic>`)

1. Read the library index:
   ```
   Read ~/.claude/library/index.json
   ```

2. If the index is empty or missing, report no books available.

3. Match the search query against each book's:
   - `title`
   - `description`
   - `tags` array
   - `category`
   - `name`

4. Display matching books as a table (same format as list mode), sorted by relevance.

5. If no matches, suggest:
   > No books matched "<topic>". Use `/library` to see all available books.

## Mode: Migrate (`/library --migrate`)

1. Run the migration script:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/library_migrate.ts
   ```

2. The script will:
   - Scan `~/.claude/skills/` for directories containing a `references/` subdirectory
   - Copy each matching skill to `~/.claude/library/books/<name>/`
   - Generate a minimal `book.json` from SKILL.md frontmatter
   - Rebuild the library index

3. After migration completes, review each migrated book's `book.json` and fill in any placeholder fields:
   - Read each `~/.claude/library/books/<name>/book.json`
   - Read the corresponding `SKILL.md` to infer missing metadata
   - Update `title`, `author`, `year`, `category`, and `tags` if they are placeholders
   - Write updated `book.json`

4. Rebuild the index:
   ```
   npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/library_index.ts
   ```

5. Report results:
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
