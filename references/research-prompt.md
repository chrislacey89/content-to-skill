# Extraction Methodology

This document defines how to extract knowledge from a book chunk. Apply this methodology to every chunk you process.

## Extraction Priorities

Extract in order of importance:

1. Core thesis and central arguments
2. Frameworks, models, and methodologies (with full structure)
3. Key definitions and coined terminology
4. Actionable advice and implementation steps
5. Memorable examples that illustrate principles
6. Counter-arguments or nuances the author addresses
7. Specific data, statistics, or research citations
8. Connections to other works or thinkers

## Book Categories

Adjust your extraction focus based on the book type:

- **Business**: Frameworks, case studies, mental models, strategic principles. Authors often coin terminology — preserve it exactly.
- **Self-Help / Personal Development**: Behavioral frameworks, habit systems, mindset shifts, exercises. Capture the insight from anecdotes, not the full story.
- **Technical / Programming**: Concepts, code patterns, architectural decisions, best practices, common pitfalls. Preserve code examples exactly. Note version-specific information.

## Output Schema

For each chunk, produce a markdown extraction following this structure:

```markdown
## Chapter [N]: [Chapter Title]

### Chapter Summary
[2-3 sentence overview of this chapter's contribution to the book's thesis]

### Key Concepts

#### [Concept Name]
- **Definition**: [precise definition]
- **Why It Matters**: [significance]
- **How To Apply**: [actionable guidance]
- **Author's Example**: [concrete illustration]

### Frameworks & Models

#### [Framework Name]
- **Purpose**: What problem does this solve?
- **Components**:
  1. [Component]: [explanation]
  2. [Component]: [explanation]
- **How To Use**: [step-by-step if applicable]
- **When To Use**: [context/situations]
- **Pitfalls**: [what to avoid]

### Actionable Advice
- [Specific action item with context]
- [Another action item]

### Key Quotes
> "[Exact quote]" (p. XX)
> Context: [why this quote matters]

### Data & Evidence
- [Statistic or research finding with source]

### Cross-References
- Builds on: [previous chapter concepts]
- Sets up: [what this enables in later chapters]
- External references: [other books/authors mentioned]
```

## Quality Standards

- Never fabricate or infer content not present in the source chunk.
- When uncertain about a term or concept, flag it with `[UNCLEAR: reason]`.
- Preserve exact quotes for definitional or particularly powerful statements.
- If a chunk is unreadable or has OCR issues, output an Extraction Error block:

```markdown
## Extraction Error

**Issue Type**: [OCR Quality | Missing Content | Formatting Issues]
**Affected Pages**: [page numbers or section identifiers]
**Description**: [specific details]
**Recommendation**: [suggested resolution]
```

## Visual Content

For images, charts, diagrams, and tables found in the chunk:

1. Describe what the visual shows
2. Extract all data points, labels, and relationships
3. Explain the insight or argument the visual supports
4. Note location: `[Figure X.X, p. XX]`

## Cross-Referencing Rules

- When a concept connects to another chapter, note: `See also: [Chapter X: Section Name]`
- When the author references their own earlier point, link it
- When the author references external works, capture: Author, Title, and the specific idea referenced

## Tone

Preserve the author's original tone, voice, and technical terminology. Be concise and substantive — no filler, no unnecessary summarization that loses nuance. This extraction replaces the book.

## Few-Shot Example

Given a chunk about "The Mom Test" Chapter 1:

```markdown
## Chapter 1: The Mom Test

### Chapter Summary
The Mom Test is a set of rules for crafting questions that even your mom can't lie to you about. The core insight is that people will always be nice to you and tell you your idea is great — so you must never tell them your idea. Instead, ask about their life and specific past behaviors.

### Key Concepts

#### The Mom Test
- **Definition**: Three rules for useful customer conversations: (1) Talk about their life, not your idea. (2) Ask about specifics in the past, not generics or opinions about the future. (3) Talk less and listen more.
- **Why It Matters**: Most founder conversations produce false positives because people are polite, not honest.
- **How To Apply**: Before any customer conversation, write down your three most important questions. Ensure none of them mention your product or idea.
- **Author's Example**: Asking "Would you ever use an app that..." always gets a "yes" because it costs nothing to say. Asking "When did you last try to solve this problem?" reveals real behavior.

### Frameworks & Models

#### The Mom Test Rules
- **Purpose**: Prevent collecting false validation during customer conversations.
- **Components**:
  1. Talk about their life, not your idea
  2. Ask about specifics in the past, not generics about the future
  3. Talk less and listen more
- **How To Use**: Before each conversation, review your questions against these three rules. Remove any question that violates them.
- **When To Use**: Every customer discovery or validation conversation.
- **Pitfalls**: Slipping into pitch mode; asking "would you" instead of "did you."

### Actionable Advice
- Never say "would you ever use something that..." — it always gets false positives
- Replace opinion questions ("do you think...") with behavior questions ("when did you last...")
- Keep conversations under 15 minutes to maintain focus

### Key Quotes
> "The measure of usefulness of an early customer conversation is whether it gives us concrete facts about our customers' lives and world views." (p. 7)
> Context: Defines the success metric for customer conversations — facts, not compliments.
```
