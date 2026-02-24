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

## Genre-Specific Extraction Strategies

The extraction priorities above are the baseline — optimized for prescriptive nonfiction. Different genres require fundamentally different strategies, not just relabeled terminology. Use the genre type set by the pipeline to select the appropriate strategy below.

### Prescriptive (business, self-help, health, technical)

This is the baseline the extraction priorities were designed for. No reinterpretation needed.

- **What to extract**: Frameworks, mechanisms, causal chains, implementation reasoning. Authors often coin terminology — preserve it exactly.
- **How to handle structure**: Extract as portable, self-contained insight chunks. Each concept should stand alone.
- **What "mechanism" means**: The causal chain — why the author's recommendation works, what breaks when you ignore it, what tradeoffs they acknowledge.
- **What to preserve**: The reasoning behind the advice, not just the advice itself. For every concept, answer: "what goes wrong without this?"

### Literary Fiction

The Holiday notecard method (extract portable wisdom, file by theme) actively flattens literature. A novel's structure IS its argument — extracting "key takeaways" misses the point. Use a fundamentally different approach.

- **What to extract**: The novel's *architectural argument* — how its structure embodies meaning. Track character-as-philosophy: what each character represents in the work's dialectic, and how their *fate* tests their philosophical position. Extract embodied counterarguments — scenes where the strongest opposing view is shown sympathetically, not just mentioned.
- **How to handle structure**: The sequence matters. Do not atomize into portable chunks. Track how the work builds, complicates, and (often deliberately) refuses to resolve its central tensions.
- **What "mechanism" means**: How does the narrative *demonstrate* a truth through lived consequence? Not "how do you implement this" but "how does the story show this playing out in a human life?"
- **What to preserve that other genres would cut**: Dialectical tensions and irresolution — do NOT resolve what the author leaves unresolved. Preserve the novel's method of argument (embodiment, consequence, irony) alongside its conclusions. If something resists being reduced to a notecard, that resistance is a signal it captures something important.
- **Key question**: "What does this work DO that cannot be reduced to a statement?"

### Philosophy / Essays

Philosophy sits between prescriptive and literary extraction. Frameworks and heuristics extract well (like prescriptive), but the argumentative sequence is load-bearing (like literature). Losing the sequence loses the philosophy.

- **What to extract**: Central arguments and their logical structure. The author's treatment of rejected alternatives — these are often where the real insight lives, because the reasons for rejection reveal the author's actual commitments. Thought experiments and demonstrations that make abstract claims concrete.
- **How to handle structure**: Preserve the argumentative chain — which claim supports which, what the strongest objection is, and how the author handles it. The *sequence* of the argument matters, not just the conclusions.
- **What "mechanism" means**: The logical structure connecting premises to conclusions. How the author moves from observation to claim to implication.
- **What to preserve that other genres would cut**: Rhetorical movement — the path the argument takes, including detours that seem tangential but establish necessary groundwork. The author's engagement with the strongest version of opposing views.
- **Key question**: "Why does the author reject the alternatives, and how honest is that rejection?"

### Poetry / Drama

Poetry is already maximally compressed. The extraction should illuminate, not reduce. Form and content are inseparable — describing a poem's "key insight" without its formal technique is like describing a song's lyrics without its melody.

- **What to extract**: Formal techniques alongside thematic content — always together, never separated. Imagery patterns and their development across the work. How scenes or stanzas build argumentative or emotional momentum.
- **How to handle structure**: Track how the work *moves* — its rhythm of tension and release, its accumulation of imagery and meaning. Do not break into portable chunks.
- **What "mechanism" means**: How form creates meaning — meter, line breaks, staging, silence, repetition. The technique IS the insight.
- **What to preserve that other genres would cut**: Almost everything. Extract less, describe more. Show how formal choices produce meaning rather than summarizing what the meaning is.
- **Key question**: "Does this show how form creates meaning, or does it just paraphrase content?"

### Religious / Spiritual

Religious texts contain both extractable doctrine (which works like prescriptive frameworks) and experiential testimony (which works like literature). The extraction must handle both modes and preserve the tension between them.

- **What to extract**: Core doctrines extract well — treat them like prescriptive frameworks with structure and logical relationships. Contemplative practices need experiential description — describe what the practice *produces* in the practitioner, not just the steps. Track how the text moves between declarative teaching and experiential testimony.
- **How to handle structure**: Doctrinal content can be chunked portably. Experiential and narrative content should preserve sequence and context.
- **What "mechanism" means**: For doctrines, the logical or theological structure connecting claims. For practices, the phenomenological description — what happens internally when someone does this.
- **What to preserve that other genres would cut**: The tension between theological claims and lived experience. The gap between what a tradition teaches and what practitioners report is often where the deepest insight lives.
- **Key question**: "Does this preserve the tension between doctrine and lived experience, or does it flatten one into the other?"

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
