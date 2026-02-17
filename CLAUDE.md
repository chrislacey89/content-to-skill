# Content-to-Skill Plugin

## Overview

Claude Code plugin that transforms PDFs and EPUBs into Agent Skills.

## Conventions

- Use `${CLAUDE_PLUGIN_ROOT}` for all plugin-relative paths (never `${PLUGIN_ROOT}`)
- `allowed-tools` uses comma-separated colon syntax: `Bash(npx:*)`
- All side-effect commands must have `disable-model-invocation: true`
- Reference files are declarative methodology docs, not conversational prompts
- Generated skills follow the Agent Skills spec (agentskills.io)

## Directory Structure

```
.claude-plugin/plugin.json    # Plugin manifest
commands/content-to-skill.md  # Main slash command
commands/library.md           # Library browse/load command
references/                   # Prompt methodology files
scripts/chunk_document.ts     # Document chunker
scripts/library_index.ts      # Library index builder
scripts/library_migrate.ts    # Skills-to-library migrator
```

## Testing

```bash
# Test chunking
npx tsx scripts/chunk_document.ts <input.pdf> -p 5 -o /tmp/test-chunks

# Test library index
npx tsx scripts/library_index.ts

# Test migration
npx tsx scripts/library_migrate.ts

# Install plugin locally for testing
# /plugin install /Users/christopherlacey/Documents/content-to-skill
```
