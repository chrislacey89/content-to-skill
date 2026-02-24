import pluginData from "../../../.claude-plugin/plugin.json";

export const plugin = {
	name: pluginData.name,
	version: pluginData.version,
	description: pluginData.description,
	author: pluginData.author.name,
	repository: pluginData.repository,
	license: pluginData.license,
};

export const hero = {
	title: "Content to Skill",
	tagline: "Your books, as agent skills",
	description:
		"Turn any book into structured knowledge your AI assistant can use — whenever you need it.",
};

export const problem = {
	heading: "The Knowledge Decay Problem",
	text: "You read a great technical book. Two weeks later, you remember the gist but none of the specifics. When you need it most — debugging a system, choosing an architecture, writing a feature — the knowledge is gone. Your AI agent has never read it at all.",
	solution:
		"Content-to-Skill doesn't summarize — it distills. The result is a personal skill your agent can load on demand: a 30-second overview, a situational index for the right concept at the right time, and deep reference dives when you need the full picture.",
};

export const pipelineIntro =
	"A multi-pass extraction pipeline adapts to each book's genre, cross-references every chapter, and produces 8–15 structured reference files.";

export const pipeline = [
	{
		step: 1,
		name: "Chunk",
		description:
			"Splits your PDF or EPUB into sections sized for processing",
	},
	{
		step: 2,
		name: "Configure",
		description:
			"You choose citation style and genre — extraction adapts to the book's form",
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
			"Each chunk is re-evaluated against the whole book — surface observations are cut, causal chains deepened",
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
			"Adds to your personal library — browse with /library, load on demand with /library <name>",
	},
];

export const install = {
	intro: "Content-to-Skill runs inside Claude Code, Anthropic's AI coding assistant. If you already have it installed, you're two commands away.",
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
	cost: "~$25 (Opus)",
	output: "A complete knowledge base from a single book",
	costNote:
		"Cost scales roughly with page count. Shorter books cost proportionally less. Using Sonnet instead of Opus reduces cost by approximately 80%.",
};

export const output = {
	book: "The Software Engineer's Guidebook",
	overview: `## Level 1: 30-Second Reference

### The Core Framework
- Engineering careers reward intentional growth across
  technical, organizational, and business dimensions
- At every level, "getting things done" — consistently
  shipping impactful work — is the universal currency
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

export const author = {
	name: "Chris Lacey",
	github: "https://github.com/chrislacey89",
};
