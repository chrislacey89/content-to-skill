# Docs Extraction Methodology

You are extracting the contents of a documentation site section so that another LLM, loaded with this skill, can write idiomatic code in the library these docs describe. The skill is a teaching tool, not a paraphrase. The user is reading code generated against these docs and needs to trust both the syntax and the conceptual framing.

## Hard Constraints

These are non-negotiable. Violations make the resulting skill unfit for use.

1. **Code blocks are character-perfect verbatim.** Copy fenced code blocks (` ```ts `, ` ```bash `, ` ```jsx `, etc.) byte-for-byte from the source MDX. Do not "clean up" formatting, normalize whitespace, fix what you think are typos, change quote style, reorder imports, or paraphrase. If the source has trailing whitespace inside a code block, preserve it. **A code block that is "almost right" is wrong.** Claude will copy it into the user's program and the program will not compile.
2. **Twoslash markers stay in code blocks.** Effect-style docs use ` ```ts twoslash ` fences with `//   ^?` comment lines that the rendered site converts into type-info popovers. These look like gibberish in plain markdown — they are not. Preserve the language fence (` ```ts twoslash `), preserve every `//   ^?` line, and preserve every `// @errors:`, `// @noErrors`, `// @noImplicitAny` directive comment exactly as written. Do not strip them.
3. **Every claim carries a URL+anchor citation.** Whenever you assert a fact about the library — "X returns Y", "use A instead of B", "the default is N" — append a citation in the form `(see: https://<site>/<path>/#<anchor>)`. The citation must be constructible from the source file path + the heading the claim lives under, using the same algorithm `scripts/build_citation.ts` exposes. If you are unsure of the anchor, use the file URL with no anchor (`(see: https://<site>/<path>/)`). Never invent an anchor.
4. **Rules-of-thumb and "X vs Y" callouts are first-class content.** When the source contains an `<Aside>`, `:::tip`, `:::caution`, `:::note`, an "Idiomatic vs anti-pattern" comparison, a "When to use X over Y" decision rubric, or a "Common pitfall" — preserve it as a labeled section. These are the highest-value content for a coding LLM. Strip them and the skill knows the API but writes bad code.
5. **Relative `/docs/...` links become absolute URLs.** When the source contains `[catchTag](/docs/error-management/yieldable-errors/#catchtag)`, rewrite to `[catchTag](<site-base>/docs/error-management/yieldable-errors/#catchtag)`. The skill is loaded outside the docs site; relative links resolve to nowhere.
6. **No fabrication.** If the source does not say it, do not write it. If you must summarize for navigation, mark it `[Summary]` so it is distinguishable from quoted content.

## Extraction Priorities

Extract in order of importance:

1. **API signatures and types** — function signatures, type definitions, interface shapes. Verbatim.
2. **Working code examples** — full code blocks demonstrating the API in use. Verbatim.
3. **Conceptual framing** — "what is X", "why does X exist", "how X relates to Y". Quote-then-link.
4. **Rules of thumb / decision rubrics** — "use X when...", "prefer Y over Z because...". Preserve as bullets.
5. **Pitfalls and anti-patterns** — "do not do X because Y", "common mistake: ...". Preserve as bullets.
6. **Cross-references** — links to other sections that a reader would want to follow. Convert to absolute URLs.

## Processing Rules

- Read every file in the group, in the order given by the manifest (`sidebar.order` then filename).
- Strip the leading YAML frontmatter and the leading `import { ... } from "..."` lines from each MDX file before quoting; they are not content.
- Leave Starlight components (`<Aside>`, `<Tabs>`, `<TabItem>`, `<Code>`, `<LinkCard>`, `<Steps>`) inline. Do not unwrap them; their semantic role ("this is a tip" vs. "this is a warning") matters for how the loaded skill will treat the content.
- For multi-file sections, write one continuous reference file ordered by `sidebar.order`. Do not interleave files.
- Twoslash `//   ^?` lines: leave inside the code block, do not extract them as prose.

## Output Structure

Write one markdown file to `/tmp/content-to-skill/<name>/extraction-<group>.md`. The synthesizer in Step 5D will assemble these into reference files.

```markdown
---
group: <group-name>
files: ["<rel-path-1>.mdx", "<rel-path-2>.mdx", ...]
title: "<Group Title>"
---

# <Group Title>

## <File 1 title from frontmatter>

> Source: <absolute URL to file>

[Verbatim content, with code blocks preserved exactly. Section headings from
the source become `### <Heading>` here. Each substantive paragraph is
followed by `(see: <citation URL>)` if the claim is non-obvious.]

### <Heading from source>

[content]

```ts twoslash
// preserved verbatim
import { Effect } from "effect"
//      ^?
```

(see: <site>/docs/<file>/#<heading-anchor>)

#### Rules of thumb

- <each rule preserved verbatim>
- ...

#### Common pitfalls

- <each pitfall preserved verbatim>

## <File 2 title>
...
```

## Self-verification before returning

Before returning, check the following against the source files you read:

- [ ] Every code block in the output appears character-identical in some source file.
- [ ] Every twoslash directive (`twoslash`, `// @errors:`, `// @noErrors`, `//   ^?`) from the source survives.
- [ ] Every `<Aside>` / `:::tip` / `:::caution` / "X vs Y" / "use when" callout from the source has a corresponding section.
- [ ] Every relative `/docs/...` link is absolute.
- [ ] Every paragraph that makes a non-obvious claim ends with a `(see: <url>)` citation.
- [ ] No content was paraphrased that could have been quoted; if you summarized, the summary is labeled `[Summary]`.

Return: `"Group <group-name>: extracted N files, M code blocks preserved, K citations emitted."`
