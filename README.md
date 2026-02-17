# content-to-skill

Transform PDFs and EPUBs into Claude Code Agent Skills.

Chunks documents, extracts knowledge in parallel, and synthesizes structured skill packages with progressive disclosure. Includes a library system for browsing and loading book knowledge on demand.

## Installation

1. **Add the plugin from the marketplace:**

```bash
/plugin marketplace add chrislacey89/content-to-skill
```

2. **Install the plugin:**

```bash
/plugin install content-to-skill@chrislacey89-content-to-skill
```

## Quick Start

1. **Convert a book into a skill:**

```bash
/content-to-skill path/to/book.pdf --name my-book
```

2. **Browse your library:**

```bash
/library
```

3. **Load a book into any conversation:**

```bash
/library my-book
```

## Commands

### `/content-to-skill`

Convert a PDF or EPUB into an Agent Skill.

| Flag | Default | Description |
|------|---------|-------------|
| `<path>` | *(required)* | Path to the PDF or EPUB file |
| `--name <name>` | *(prompt)* | Kebab-case skill name |
| `--install <location>` | `library` | `library`, `project`, or `personal` |
| `--on-conflict <action>` | `overwrite` | `overwrite` or `cancel` |
| `--pages <n>` | `5` | Pages/sections per chunk |

### `/library`

Browse and load book knowledge.

| Flag | Default | Description |
|------|---------|-------------|
| *(no args)* | | List all books in the library |
| `<book-name>` | | Load a book's knowledge into context |
| `--search <topic>` | | Search books by topic, tags, or description |
| `--migrate` | | Migrate existing skills to the library |
| `--rebuild-index` | | Rebuild the library index |

## How It Works

1. **Chunk** -- Splits the document into manageable sections
2. **Extract** -- Parallel subagents extract knowledge from each chunk
3. **Synthesize** -- Cross-references extractions into a unified knowledge map
4. **Convert** -- Produces a structured skill with progressive disclosure and 8-15 reference files

## Requirements

- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## License

MIT
