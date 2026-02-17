# Content-to-Skill Plugin

## Overview

Claude Code plugin that transforms PDFs and EPUBs into Agent Skills.

## Conventions

- Use `${CLAUDE_PLUGIN_ROOT}` for all plugin-relative paths (never `${PLUGIN_ROOT}`)
- `allowed-tools` uses comma-separated colon syntax: `Bash(node:*)`
- All side-effect commands must have `disable-model-invocation: true`
- Reference files are declarative methodology docs, not conversational prompts
- Generated skills follow the Agent Skills spec (agentskills.io)

## Directory Structure

```
.claude-plugin/plugin.json    # Plugin manifest
commands/content-to-skill.md  # Main slash command
references/                   # Prompt methodology files
scripts/chunk_document.js     # Node.js document chunker
```

## Testing

```bash
# Test chunking
node scripts/chunk_document.js <input.pdf> -p 5 -o /tmp/test-chunks

# Install plugin locally for testing
# /plugin install /Users/christopherlacey/Documents/content-to-skill
```
