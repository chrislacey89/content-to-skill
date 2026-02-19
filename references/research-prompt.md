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

## Citation Style

Use the citation style specified by the pipeline:

- **Chapter citations** (for books): `(Chapter [N]: [Title])` for quotes, `## Chapter [N]: [Title]` for section headers, `[Figure X.X, Chapter [N]]` for figures
- **Page citations** (for papers/whitepapers): `(p. [N])` or `(pp. [N]-[M])` for ranges, `## Section [N]: [Title]` for section headers, `[Figure X.X, p. [N]]` for figures

Apply the specified format consistently. If the source material does not contain the expected citation anchors (e.g., page-style was selected but the text has no meaningful page numbers, or chapter-style was selected but the text uses Book/Part/Canto divisions instead of numbered chapters):

1. Adapt to the source's actual structure — use the most specific locator present in the text (Book V, Ch. 3 / Part II / Canto XII / Act III, Scene 2 / etc.)
2. Keep the parenthetical format consistent: `(Book V, Ch. 3)` or `(Part II)` — always parenthetical, always referencing the text's own divisions
3. Never cite PDF-viewer page numbers as if they were the source's page numbers — if the document is a plain-text rendering with no real pagination, use structural citations instead
4. Apply the adapted format consistently across the entire extraction — do not mix styles

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
> "[Exact quote]" (Chapter [N]: [Title])
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
4. Note location: `[Figure X.X, Chapter [N]]` (or `[Figure X.X, p. [N]]` for page citations)

## Cross-Referencing Rules

- When a concept connects to another chapter, note: `See also: [Chapter X: Section Name]`
- When the author references their own earlier point, link it
- When the author references external works, capture: Author, Title, and the specific idea referenced

## Tone

Preserve the author's original tone, voice, and technical terminology. Be concise and substantive — no filler, no unnecessary summarization that loses nuance. This extraction replaces the book.

## Few-Shot Example

Given a chunk about "The Prince" Chapter 15:

```markdown
## Chapter 15: How Rulers Are Judged

### Chapter Summary
Machiavelli breaks from political philosophy tradition by insisting rulers must be judged by effectual truth — how they actually succeed — not by moral ideals. Anyone who insists on always being good among people who are not good is "schooling himself for catastrophe."

### Key Concepts

#### Effectual Truth
- **Definition**: The method of analyzing political actions by their real-world outcomes rather than their moral character. Study what rulers actually do, not what they should do.
- **Why It Matters**: Traditional advice based on imaginary ideals leads to destruction. A ruler who follows idealism in a world of self-interested actors will be overthrown.
- **How To Apply**: Before any decision, ask "what does observed reality tell me?" rather than "what does morality prescribe?" Ground strategy in how people actually behave.
- **Author's Example**: "Many writers have dreamed up republics and kingdoms that bear no resemblance to experience." Rulers who follow these fantasies pursue their downfall rather than their preservation.

### Frameworks & Models

#### The Moral Inversion Principle
- **Purpose**: Prevent rulers from confusing virtue with effectiveness.
- **Components**:
  1. Some actions that look morally right lead to disaster
  2. Some actions that look wrong bring security and success
  3. Judge by outcomes, not by moral labels
- **How To Use**: For each decision, evaluate the real consequences rather than the moral appearance. A reputation for "meanness" that preserves the treasury is better than generosity that bankrupts the state.
- **When To Use**: Any leadership decision where moral intuition conflicts with strategic reality.
- **Pitfalls**: Confusing this with nihilism; Machiavelli doesn't reject morality — he insists on realistic assessment of trade-offs.

### Actionable Advice
- Never assume people will behave as they should — plan for how they actually do
- Distinguish between failings that threaten your position and those that do not
- Accept moral costs that preserve the state rather than pursuing virtue that destroys it

### Key Quotes
> "There is such a gap between how people actually live and how they ought to live that anyone who declines to behave as people do, in order to behave as they should, is schooling himself for catastrophe." (Chapter 15: How Rulers Are Judged)
> Context: The foundational statement of political realism — the gap between idealism and effective action.
```

## Few-Shot Example (Page Citations)

Given a chunk from an academic paper (pages 12-15):

```markdown
## Section 3: Methodology

### Section Summary
The authors introduce retrieval-augmented generation as a technique to ground LLM outputs in retrieved documents, reducing hallucination rates substantially compared to closed-book approaches.

### Key Concepts

#### Retrieval-Augmented Generation
- **Definition**: A technique that augments language model generation by first retrieving relevant documents from an external corpus, then conditioning generation on those documents.
- **Why It Matters**: Reduces factual hallucination by providing grounded context from verified sources.
- **How To Apply**: Index your document corpus with dense embeddings, retrieve top-k passages at inference time, prepend them to the prompt.
- **Author's Example**: On the Natural Questions benchmark, RAG outperforms closed-book models by 15 points on exact match.

### Key Quotes
> "RAG reduces factual hallucination by 54% compared to closed-book generation." (p. 14)
> Context: The central empirical finding supporting the paper's thesis.

### Data & Evidence
- 54% reduction in hallucination rate vs closed-book baseline (p. 14)
- 15-point improvement on Natural Questions exact match (p. 13)
```
