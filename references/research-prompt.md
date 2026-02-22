# Extraction Methodology

This document defines how to extract knowledge from a book chunk. Apply this methodology to every chunk you process.

## Extraction Priorities

Extract insight, not summary. For every concept, ask *why it matters* and *what goes wrong without it* — not just what the author says. A good extraction captures the author's reasoning chain, not just their conclusions. Extract in order of importance:

1. Core thesis and central arguments
2. Frameworks, models, and methodologies (with full structure)
3. Key definitions and coined terminology
4. Causal reasoning — why the author's recommendations work, what breaks when you ignore them, what tradeoffs they acknowledge
5. Concrete examples that reveal mechanism — not just illustrations but demonstrations of *how* and *why* the principle operates
6. Counter-arguments or nuances the author addresses
7. Specific data, statistics, or research citations
8. Connections to other works or thinkers

### Genre Reinterpretation

For non-prescriptive works (fiction, philosophy, poetry, religious texts), reinterpret the priorities above:
- "Core thesis" → the work's central question or dialectic
- "Frameworks and models" → structural patterns, recurring motifs, argumentative architecture
- "Key insights" → thematic propositions, interpretive claims
- "Counter-arguments" → competing positions within the text, dialectical tensions

## Book Categories

Adjust your extraction focus based on the book type:

- **Business**: Frameworks, case studies, mental models, strategic principles. Authors often coin terminology — preserve it exactly. Trace the causal chain — why does this framework work, and what breaks when companies ignore it?
- **Self-Help / Personal Development**: Behavioral frameworks, habit systems, mindset shifts, exercises. Capture the insight from anecdotes, not the full story. Capture the mechanism behind the advice, not just the advice itself.
- **Technical / Programming**: Concepts, code patterns, architectural decisions, best practices, common pitfalls. Preserve code examples exactly. Note version-specific information.
- **Literary Fiction**: Extract the argument embedded in the plot, not the plot itself. Identify what each character *represents* in the novel's dialectic. Track why things happen, not just what happens.
- **Philosophy**: Central arguments, logical structure, thought experiments, strongest objections. Preserve the argumentative chain — which claim supports which.
- **Poetry / Drama**: Formal techniques, imagery patterns, the relationship between form and meaning. How scenes build argumentative or emotional momentum.
- **Religious / Spiritual**: Core doctrines, contemplative practices, tensions between theological claims and lived experience.

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
- **How It Works**: [mechanism or function — how the concept operates] *(For prescriptive books: actionable guidance. For literary/philosophical works: how the idea functions within the text.)*
- **Author's Example**: [concrete illustration]

### Frameworks & Models

#### [Framework Name]
- **Purpose**: What problem does this solve?
- **Components**:
  1. [Component]: [explanation]
  2. [Component]: [explanation]
- **How It Works**: [mechanism — how and why this framework operates] *(For prescriptive books: step-by-step application. For literary/philosophical works: how the pattern functions in the text.)*
- **Context**: [conditions and situations where this applies] *(For prescriptive books: when to deploy this. For literary/philosophical works: the circumstances or tensions that activate this pattern.)*
- **Complications**: [what complicates this] *(For prescriptive books: common mistakes and failure modes. For literary/philosophical works: tensions, contradictions, or competing forces.)*

### Key Insights
- [Interpretive claim, action item, or thematic proposition with context]
- [Another insight]

### Key Quotes
> "[Exact quote]" (Chapter [N]: [Title])
> Context: [why this quote matters]

Every quote MUST include its citation. If the exact location cannot be determined from the chunk, use the best available locator and flag: [UNCLEAR: exact chapter/page].

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
- Every direct quote must include a chapter number, page number, or structural locator. Never output a bare quote without attribution.
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
- **How It Works**: Before any decision, ask "what does observed reality tell me?" rather than "what does morality prescribe?" Ground strategy in how people actually behave.
- **Author's Example**: "Many writers have dreamed up republics and kingdoms that bear no resemblance to experience." Rulers who follow these fantasies pursue their downfall rather than their preservation.

### Frameworks & Models

#### The Moral Inversion Principle
- **Purpose**: Prevent rulers from confusing virtue with effectiveness.
- **Components**:
  1. Some actions that look morally right lead to disaster
  2. Some actions that look wrong bring security and success
  3. Judge by outcomes, not by moral labels
- **How It Works**: For each decision, evaluate the real consequences rather than the moral appearance. A reputation for "meanness" that preserves the treasury is better than generosity that bankrupts the state.
- **Context**: Any leadership decision where moral intuition conflicts with strategic reality.
- **Complications**: Confusing this with nihilism; Machiavelli doesn't reject morality — he insists on realistic assessment of trade-offs.

### Key Insights
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
- **How It Works**: Index your document corpus with dense embeddings, retrieve top-k passages at inference time, prepend them to the prompt.
- **Author's Example**: On the Natural Questions benchmark, RAG outperforms closed-book models by 15 points on exact match.

### Key Quotes
> "RAG reduces factual hallucination by 54% compared to closed-book generation." (p. 14)
> Context: The central empirical finding supporting the paper's thesis.

### Data & Evidence
- 54% reduction in hallucination rate vs closed-book baseline (p. 14)
- 15-point improvement on Natural Questions exact match (p. 13)
```

## Few-Shot Example (Literary Fiction)

Given a chunk from "The Brothers Karamazov" Book V:

```markdown
## Book V: Pro and Contra

### Chapter Summary
Dostoevsky stages the novel's central philosophical confrontation: Ivan's rational rebellion against a God who permits children's suffering versus Alyosha's inarticulate faith. The Grand Inquisitor parable extends this into a political argument — that humanity cannot bear the freedom Christ offered, and must be governed by miracle, mystery, and authority instead.

### Key Concepts

#### The Problem of Innocent Suffering
- **Definition**: Ivan's argument that no future harmony can justify the suffering of innocent children — a challenge to theodicy that refuses consolation.
- **Why It Matters**: This is not an abstract theological objection. Ivan accepts God's existence but *returns the ticket* — he rejects the moral order itself. The force of the argument comes from its specificity: he catalogues real cases, refusing to let philosophy escape into abstraction.
- **How It Works**: Ivan builds an empirical case (collected stories of cruelty to children) and then applies a moral criterion: no amount of eventual harmony can retroactively justify a child's tears. The structure is deductive — if the price of truth is one child's suffering, truth is too expensive.
- **Author's Example**: "Imagine that you are creating a fabric of human destiny with the object of making men happy in the end... but that it was essential and inevitable to torture to death only one tiny creature... would you consent to be the architect on those conditions?" (Book V, Ch. 4)

### Frameworks & Models

#### The Grand Inquisitor's Three Temptations
- **Purpose**: A reinterpretation of Christ's three temptations in the desert as a political theory of human nature.
- **Components**:
  1. **Miracle** (bread): Humanity wants material security, not spiritual freedom — "Feed them first, then ask virtue of them"
  2. **Mystery** (spectacle): Humanity craves certainty and proof, not faith under doubt
  3. **Authority** (earthly power): Humanity cannot bear the burden of free choice and will surrender it to anyone who relieves the anxiety
- **How It Works**: The Inquisitor argues that Christ overestimated humanity by offering freedom without compulsion. The Church "corrected" Christ's work by taking up the three temptations He rejected — giving people bread, mystery, and authority in exchange for their freedom. The framework reveals a tension between respecting human autonomy and acknowledging human weakness.
- **Context**: Any situation where a leader or institution faces the choice between empowering people and managing them — political governance, institutional design, education.
- **Complications**: The Inquisitor's argument is seductive because it's partly true — people do crave security over freedom. But Dostoevsky complicates it: Christ's silent kiss at the end neither refutes nor concedes the argument. The reader must decide whether the kiss represents a higher truth beyond argument or simply an inability to answer.

### Key Insights
- Ivan's rebellion is not atheism — it is moral refusal. He believes in God but rejects God's world. This distinction drives the entire novel's dialectic.
- The Grand Inquisitor does not argue against Christ's message but against Christ's *method* — freedom is the right gift for the wrong species.
- Alyosha's kiss mirrors Christ's kiss: faith expressed as action rather than argument, suggesting that some truths operate below the level of rational debate.

### Key Quotes
> "It's not that I don't accept God, Alyosha, I just most respectfully return him the ticket." (Book V, Ch. 4)
> Context: Ivan's moral rebellion — accepting God's existence while rejecting the moral order that permits innocent suffering.

> "We have corrected your great work... Men rejoiced that they were once more led like sheep." (Book V, Ch. 5: The Grand Inquisitor)
> Context: The Inquisitor's claim that the Church improved on Christ by relieving humanity of the unbearable burden of free choice.

### Cross-References
- Builds on: Zosima's theology of active love (Book II) as the implicit counter-position
- Sets up: Dmitri's trial (Book XII) where the abstract question of justice becomes concrete
- External references: The three temptations of Christ (Matthew 4:1-11), reworked as political philosophy
```
