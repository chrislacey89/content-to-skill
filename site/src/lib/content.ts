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
		"A Claude Code plugin that transforms any PDF or EPUB into a structured skill your agent can load on demand.",
};

export const problem = {
	heading: "The Knowledge Decay Problem",
	text: "You read a great technical book. Two weeks later, you remember the gist but none of the specifics. When you need it most — debugging a system, choosing an architecture, writing a feature — the knowledge is gone. Your AI agent has never read it at all.",
	solution:
		"Content-to-Skill doesn't summarize — it distills. A 3-pass extraction pipeline adapts to each book's genre, cross-references every chapter, and produces 8–15 reference files with progressive disclosure: a 30-second overview, a situational index, and deep concept dives. The result lives in your personal library, loadable on demand.",
};

export const pipeline = [
	{
		step: 1,
		name: "Chunk",
		description:
			"Splits your PDF or EPUB into sections sized for parallel processing",
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
			"Up to 5 subagents process chunks in parallel, pulling frameworks, patterns, and evidence",
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
			"8–15 reference files with progressive disclosure: 30-second overview, situational index, deep concept dives",
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
	inputTokens: "~21k",
	outputTokens: "~280k",
	cost: "~$25 (Opus)",
	output: "Complete skill with 8–15 reference files",
};
