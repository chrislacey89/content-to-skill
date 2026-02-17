#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME = os.homedir();
const SKILLS_DIR = path.join(HOME, ".claude", "skills");
const BOOKS_DIR = path.join(HOME, ".claude", "library", "books");

interface MigrateOpts {
	removeOriginals: boolean;
	help: boolean;
}

interface BookSkill {
	name: string;
	sourceDir: string;
	hasSkillMd: boolean;
}

interface BookJson {
	name: string;
	title: string;
	author: string;
	year: number | null;
	category: string;
	tags: string[];
	description: string;
	referenceFiles: string[];
}

function parseArgs(): MigrateOpts {
	const args = process.argv.slice(2);
	return {
		removeOriginals: args.includes("--remove-originals"),
		help: args.includes("-h") || args.includes("--help"),
	};
}

function printUsage(): void {
	console.log(`
Usage: tsx library_migrate.ts [options]

Migrates book-skills from ~/.claude/skills/ to ~/.claude/library/books/.

Options:
  --remove-originals  Delete originals from ~/.claude/skills/ after migration
  -h, --help          Show this help message

A "book-skill" is detected by the presence of a references/ subdirectory.
`);
}

export function parseFrontmatter(content: string): Record<string, string> {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};

	const fm: Record<string, string> = {};
	const lines = match[1].split("\n");
	for (const line of lines) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		let value = line.slice(colonIdx + 1).trim();
		// Strip surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		fm[key] = value;
	}
	return fm;
}

function findBookSkills(): BookSkill[] {
	if (!fs.existsSync(SKILLS_DIR)) {
		console.log("No ~/.claude/skills/ directory found.");
		return [];
	}

	const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
	const bookSkills: BookSkill[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const skillDir = path.join(SKILLS_DIR, entry.name);
		const refsDir = path.join(skillDir, "references");
		const skillMd = path.join(skillDir, "SKILL.md");

		// Book-skill signature: has references/ subdirectory
		if (fs.existsSync(refsDir) && fs.statSync(refsDir).isDirectory()) {
			bookSkills.push({
				name: entry.name,
				sourceDir: skillDir,
				hasSkillMd: fs.existsSync(skillMd),
			});
		}
	}

	return bookSkills;
}

function copyDirRecursive(src: string, dest: string): void {
	fs.mkdirSync(dest, { recursive: true });
	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDirRecursive(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

function generateBookJson(name: string, sourceDir: string): BookJson {
	const skillMdPath = path.join(sourceDir, "SKILL.md");
	let fm: Record<string, string> = {};

	if (fs.existsSync(skillMdPath)) {
		const content = fs.readFileSync(skillMdPath, "utf8");
		fm = parseFrontmatter(content);
	}

	// Collect reference files
	const refsDir = path.join(sourceDir, "references");
	let referenceFiles: string[] = [];
	if (fs.existsSync(refsDir)) {
		referenceFiles = fs
			.readdirSync(refsDir)
			.filter((f) => f.endsWith(".md"))
			.map((f) => `references/${f}`);
	}

	return {
		name: fm.name || name,
		title: fm.title || "(fill in title)",
		author: fm.author || "(fill in author)",
		year: null,
		category: fm.category || "(fill in category)",
		tags: [],
		description: fm.description || "(fill in description)",
		referenceFiles,
	};
}

function migrate(opts: MigrateOpts): void {
	const bookSkills = findBookSkills();

	if (bookSkills.length === 0) {
		console.log(
			"No book-skills found in ~/.claude/skills/ (no directories with references/ subdirectory).",
		);
		return;
	}

	console.log(`Found ${bookSkills.length} book-skill(s) to migrate:\n`);

	// Ensure library directory exists
	fs.mkdirSync(BOOKS_DIR, { recursive: true });

	const migrated: BookSkill[] = [];

	for (const skill of bookSkills) {
		const destDir = path.join(BOOKS_DIR, skill.name);

		if (fs.existsSync(destDir)) {
			console.log(`  SKIP: ${skill.name} (already exists in library)`);
			continue;
		}

		// Copy files
		copyDirRecursive(skill.sourceDir, destDir);

		// Generate book.json if it doesn't already exist
		const bookJsonPath = path.join(destDir, "book.json");
		if (!fs.existsSync(bookJsonPath)) {
			const bookJson = generateBookJson(skill.name, skill.sourceDir);
			fs.writeFileSync(bookJsonPath, `${JSON.stringify(bookJson, null, 2)}\n`);
		}

		console.log(`  OK: ${skill.name} -> ~/.claude/library/books/${skill.name}/`);
		migrated.push(skill);

		// Remove original if requested
		if (opts.removeOriginals) {
			fs.rmSync(skill.sourceDir, { recursive: true, force: true });
			console.log(`      Removed original: ~/.claude/skills/${skill.name}/`);
		}
	}

	console.log(`\nMigrated ${migrated.length} book(s).`);

	if (migrated.length > 0) {
		console.log("\nRebuilding library index...");
		const indexScript = path.join(__dirname, "library_index.ts");
		spawnSync("npx", ["tsx", indexScript], { stdio: "inherit" });
	}
}

// Only run when executed directly, not when imported
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const opts = parseArgs();
	if (opts.help) {
		printUsage();
		process.exit(0);
	}
	migrate(opts);
}
