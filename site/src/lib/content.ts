import pluginData from "../../../.claude-plugin/plugin.json";
import libraryViewImage from "../assets/library-view.png";

export const plugin = {
	name: pluginData.name,
	version: pluginData.version,
	description: pluginData.description,
	author: pluginData.author.name,
	repository: pluginData.repository,
	license: pluginData.license,
};

export const site = {
	// Hyphenated everywhere: <title>, <h1>, footer, schema. The package name,
	// the product name and the on-page heading used to disagree.
	productName: "Content-to-Skill",
	title: "Content-to-Skill: turn a PDF or EPUB into a Claude Code Agent Skill",
	description:
		"Free, open-source Claude Code plugin that converts PDFs, EPUBs and code exercise repositories into Agent Skills — a 30-second overview, a situational index, and 8-15 reference files your agent loads on demand.",
	ogImageAlt:
		"Content-to-Skill — a Claude Code plugin that turns books into Agent Skills",
};

export const hero = {
	// Brand and descriptor render as one <h1>; the descriptor is what carries
	// the topic for search and answer extraction.
	title: "Content-to-Skill",
	titleDescriptor: "Turn any book into a Claude Code Agent Skill",
	tagline: "Your books, as agent skills",
	description:
		"Content-to-Skill is a free Claude Code plugin that reads a PDF, EPUB or code exercise repository you own and distills it into an Agent Skill — structured knowledge your AI agent loads on demand, exactly when the work calls for it.",
	audience: "Built for engineers who read technical books and work in Claude Code.",
	ctas: {
		primary: { label: "Install the plugin", href: "#install" },
		secondary: {
			label: "Read the source on GitHub",
			href: pluginData.repository,
		},
	},
};

export const headings = {
	problem: "Why your AI agent hasn't read your books",
	solution: "How Content-to-Skill distills a book into an Agent Skill",
	proof: "Benchmark: a 400-page book in 42 minutes for about $25",
	outputSample: "What a converted Agent Skill actually looks like",
	pipeline: "How the pipeline turns a PDF or EPUB into an Agent Skill",
	install: "Install Content-to-Skill in Claude Code",
	companion: "Browse your converted books with Library View",
	faq: "Frequently asked questions about Content-to-Skill",
};

export const problem = {
	heading: "The Knowledge Decay Problem",
	text: "You read a great technical book. Two weeks later, you remember the gist but none of the specifics. When you need it most, debugging a system, choosing an architecture, writing a feature, the knowledge is gone. Your AI agent has never read it at all.",
	solution:
		"Content-to-Skill doesn't summarize. It distills. The result is a personal skill your agent can load on demand: a 30-second overview, a situational index for the right concept at the right time, and deep reference dives when you need the full picture.",
};

export const pipelineIntro =
	"A multi-pass extraction pipeline adapts to each book's genre, cross-references every chapter, and produces 8-15 structured reference files.";

export const pipeline = [
	{
		step: 1,
		name: "Configure",
		description:
			"You choose citation style and genre. Extraction adapts to the book's form",
	},
	{
		step: 2,
		name: "Chunk",
		description:
			"Splits your PDF or EPUB into sections sized for processing",
	},
	{
		step: 3,
		name: "Extract",
		description:
			"Multiple AI readers work through sections simultaneously, pulling out key ideas, frameworks, and examples",
	},
	{
		step: 4,
		name: "Cross-Reference",
		description:
			"A dedicated pass reads every extraction and builds a unified knowledge map, terminology index, and chapter spine",
	},
	{
		step: 5,
		name: "Distill",
		description:
			"Each chunk is re-evaluated against the whole book. Surface observations are cut, causal chains deepened",
	},
	{
		step: 6,
		name: "Convert",
		description:
			"A complete knowledge base with layered detail: 30-second overview, situational index, deep concept dives",
	},
	{
		step: 7,
		name: "Cover",
		description:
			"Fetches real cover art from Goodreads and Open Library, or generates one",
	},
	{
		step: 8,
		name: "Install",
		description:
			"Adds to your personal library. Browse with /library, load on demand with /library <name>",
	},
];

export const repoPipeline = {
	intro:
		"Point Content-to-Skill at a directory of code exercises instead of a book and it runs a second pipeline: it detects the exercises, extracts the teaching content from each problem/solution pair in parallel, and writes reference files per module plus cross-cutting pattern files.",
	steps: [
		{ name: "Detect", description: "Finds exercises and builds a manifest" },
		{
			name: "Extract",
			description:
				"Parallel subagents extract teaching content from problem and solution pairs",
		},
		{
			name: "Synthesize",
			description:
				"Creates reference files per module plus cross-cutting pattern files",
		},
	],
};

export const install = {
	intro:
		"Content-to-Skill runs inside Claude Code, Anthropic's AI coding assistant. If you already have it installed, you're two commands away.",
	pricing: "Free and open source · MIT licensed",
	prerequisites: ["Claude Code", "Node.js 18+"],
	commands: [
		{
			label: "Add plugin",
			command: "/plugin marketplace add chrislacey89/content-to-skill",
		},
		{
			label: "Install",
			command: "/plugin install content-to-skill@chrislacey89-content-to-skill",
		},
	],
	quickStart: [
		{
			label: "Convert a book",
			command: "/content-to-skill path/to/book.pdf --name my-book",
		},
		{
			label: "Browse your library",
			command: "/library",
		},
		{
			label: "Load a skill",
			command: "/library my-book",
		},
	],
};

export const benchmark = {
	book: "The Software Engineer's Guidebook",
	pages: "~400",
	time: "~42 minutes",
	// Labelled as an API running cost, not a product price — the plugin is free.
	costLabel: "API cost to run",
	cost: "~$25 (Opus)",
	outputLabel: "Reference files",
	output: "8-15",
	costNote:
		"The plugin itself is free and MIT licensed; the figure above is what the conversion costs in Claude API usage. Cost scales roughly with page count, so shorter books cost proportionally less, and using Sonnet instead of Opus reduces it by approximately 80%.",
};

export const output = {
	book: "The Software Engineer's Guidebook",
	overview: `## Level 1: 30-Second Reference

### The Core Framework
- Engineering careers reward intentional growth across
  technical, organizational, and business dimensions
- At every level, "getting things done", consistently
  shipping impactful work, is the universal currency
- The ratio of technical-to-organizational work shifts
  as you advance: juniors ship tasks, seniors ship
  independently, staff+ ensure organizations ship
- Career ownership is non-negotiable: maintain work logs,
  pace yourself, and make contributions visible

### Quick Lookup

| Situation             | Do This                    |
|-----------------------|----------------------------|
| Preparing for promo   | Produce → Organize → Pub   |
| Feeling burned out    | Switch to Coasting mode    |
| Starting new company  | Cost center or profit?     |
| Architecture decision | One-way or two-way door?   |
| Shipping to prod      | Staged rollouts + flags    |`,
	index: `## Level 2: Situational Index

### "I need to..."

| Goal                            | Reference                 |
|---------------------------------|---------------------------|
| Understand the career arc       | core-framework.md         |
| Ship more effectively           | getting-things-done.md    |
| Write better, readable code     | coding-and-quality.md     |
| Design a testing strategy       | testing-strategies.md     |
| Make architecture decisions     | software-architecture.md  |
| Lead a project as tech lead     | tech-lead-project-mgmt.md |
| Build reliable systems          | reliability-operations.md |`,
};

// Rendered as visible text AND as FAQPage schema, from this one source, so the
// two can never drift apart.
export const faq = [
	{
		question: "What is an Agent Skill?",
		answer:
			"An Agent Skill is a folder of structured markdown that Claude Code loads into a conversation on demand. It follows the Agent Skills specification: a SKILL.md entry point plus a references/ directory. Content-to-Skill produces one from a book, so the knowledge is available to your agent as working context rather than something you have to re-explain.",
	},
	{
		question: "Does it work with EPUB as well as PDF?",
		answer:
			"Yes. Content-to-Skill accepts PDF and EPUB files. It also accepts a directory of code exercises, which it processes through a separate repository pipeline.",
	},
	{
		question: "How much does it cost to convert a book?",
		answer:
			"The plugin is free and MIT licensed. You pay only for Claude API usage during the conversion. A ~400-page book cost approximately $25 running on Opus, taking about 42 minutes. Running on Sonnet instead reduces that by roughly 80%, and shorter books cost proportionally less.",
	},
	{
		question: "Can I use Sonnet instead of Opus?",
		answer:
			"Yes. Model choice is the biggest factor in cost. Running the conversion on Sonnet costs approximately 80% less than Opus for comparable results.",
	},
	{
		question: "Can it process a code repository too?",
		answer:
			"Yes. Point /content-to-skill at a directory of code exercises and it runs the repository pipeline instead: it detects the exercises, extracts the teaching content from each problem and solution pair in parallel, and writes reference files per module alongside cross-cutting pattern files.",
	},
	{
		question: "Where do converted skills get installed?",
		answer:
			"By default into your personal library at ~/.claude/library/books/<name>/, where /library lists them and /library <name> loads one into the current conversation. The --install flag also accepts project or personal to install the skill directly as a Claude Code skill instead.",
	},
	{
		question: "Is Content-to-Skill free?",
		answer:
			"Yes. Content-to-Skill is free and open source under the MIT license. The only cost of using it is your own Claude API usage while a document is being converted.",
	},
	{
		question: "Is it legal to convert a book I own?",
		answer:
			"Content-to-Skill is designed for content you have legally purchased and own. Only process books and materials you have the right to use, and respect authors and publishers by using legitimately acquired content. The plugin does not distribute or host any book content — everything stays on your own machine.",
	},
	{
		question: "Do I need anything besides Claude Code?",
		answer:
			"Claude Code and Node.js 18 or newer. Nothing else — the plugin runs entirely locally and stores converted skills on your own filesystem.",
	},
];

export const companion = {
	title: "Your Library",
	description:
		"Library View is a companion web app that lets you browse your converted books visually — cover art, search, and quick access to every skill in your collection.",
	repo: "https://github.com/chrislacey89/library_visualizer",
	image: libraryViewImage,
	imageAlt:
		"Library View web app showing a grid of converted book covers with a search field and category filters",
};

export const author = {
	name: pluginData.author.name,
	github: "https://github.com/chrislacey89",
};

/**
 * JSON-LD for the homepage, built from the same objects the page renders so the
 * markup and the structured data cannot disagree. Rendered server-side by
 * Layout.astro — client-injected blocks arrive too late for crawlers that don't
 * execute JavaScript.
 */
export function homepageSchema(canonicalUrl: string, ogImageUrl: string) {
	const authorNode = {
		"@type": "Person",
		name: author.name,
		url: author.github,
	};

	return [
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: site.productName,
			alternateName: plugin.name,
			description: plugin.description,
			url: canonicalUrl,
			image: ogImageUrl,
			applicationCategory: "DeveloperApplication",
			applicationSubCategory: "Claude Code plugin",
			operatingSystem: "macOS, Linux, Windows",
			softwareVersion: plugin.version,
			softwareRequirements: "Claude Code, Node.js 18+",
			license: "https://opensource.org/licenses/MIT",
			codeRepository: plugin.repository,
			isAccessibleForFree: true,
			author: authorNode,
			maintainer: authorNode,
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "HowTo",
			name: headings.pipeline,
			description: pipelineIntro,
			totalTime: "PT42M",
			estimatedCost: {
				"@type": "MonetaryAmount",
				currency: "USD",
				value: "25",
			},
			supply: [
				{ "@type": "HowToSupply", name: "A PDF or EPUB you legally own" },
			],
			tool: [
				{ "@type": "HowToTool", name: "Claude Code" },
				{ "@type": "HowToTool", name: "Node.js 18+" },
			],
			step: pipeline.map((s) => ({
				"@type": "HowToStep",
				position: s.step,
				name: s.name,
				text: s.description,
				url: `${canonicalUrl}#pipeline`,
			})),
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: faq.map((entry) => ({
				"@type": "Question",
				name: entry.question,
				acceptedAnswer: {
					"@type": "Answer",
					text: entry.answer,
				},
			})),
		},
	];
}
