#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOKS_DIR = path.join(os.homedir(), ".claude", "library", "books");

const CATEGORY_COLORS: Record<string, string> = {
	business: "#1A56DB",
	health: "#057A55",
	ai: "#7E3AF2",
	technology: "#0694A2",
	psychology: "#C27803",
	science: "#1F2A37",
	finance: "#0E9F6E",
	leadership: "#E02424",
};
const DEFAULT_COLOR = "#374151";

const COVER_WIDTH = 400;
const COVER_HEIGHT = 600;

interface BookJson {
	name: string;
	title: string;
	author?: string;
	category?: string;
	coverImage?: string;
}

interface GenerateOpts {
	all: boolean;
	name: string | null;
	force: boolean;
	help: boolean;
}

function parseArgs(): GenerateOpts {
	const args = process.argv.slice(2);
	let name: string | null = null;
	const nameIdx = args.indexOf("--name");
	if (nameIdx !== -1 && args[nameIdx + 1]) {
		name = args[nameIdx + 1];
	}
	return {
		all: args.includes("--all"),
		name,
		force: args.includes("--force"),
		help: args.includes("-h") || args.includes("--help"),
	};
}

function printUsage(): void {
	console.log(`
Usage: tsx generate_covers.ts [options]

Generates programmatic book cover images for library books.

Options:
  --all             Generate covers for all books missing them
  --name <name>     Generate cover for a specific book
  --force           Regenerate even if cover already exists
  -h, --help        Show this help message
`);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const n = parseInt(hex.slice(1), 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function lightenColor(hex: string, amount: number): string {
	const { r, g, b } = hexToRgb(hex);
	const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
	const toHex = (c: number) => c.toString(16).padStart(2, "0");
	return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}

function wrapText(
	ctx: import("@napi-rs/canvas").SKRSContext2D,
	text: string,
	maxWidth: number,
): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		const metrics = ctx.measureText(testLine);
		if (metrics.width > maxWidth && currentLine) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = testLine;
		}
	}
	if (currentLine) lines.push(currentLine);
	return lines;
}

async function generateCover(bookDir: string, book: BookJson): Promise<string> {
	const { createCanvas } = await import("@napi-rs/canvas");
	const canvas = createCanvas(COVER_WIDTH, COVER_HEIGHT);
	const ctx = canvas.getContext("2d");

	const bgColor = CATEGORY_COLORS[book.category || ""] || DEFAULT_COLOR;
	const accentColor = lightenColor(bgColor, 0.3);

	// Background
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

	// Top accent bar
	ctx.fillStyle = accentColor;
	ctx.fillRect(0, 0, COVER_WIDTH, 8);

	// Category badge (upper-right)
	if (book.category) {
		const badgeText = book.category.toUpperCase();
		ctx.font = "600 12px sans-serif";
		const badgeMetrics = ctx.measureText(badgeText);
		const badgeWidth = badgeMetrics.width + 20;
		const badgeX = COVER_WIDTH - badgeWidth - 20;
		const badgeY = 28;

		ctx.fillStyle = accentColor;
		// Rounded pill
		const radius = 10;
		ctx.beginPath();
		ctx.moveTo(badgeX + radius, badgeY);
		ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
		ctx.arc(badgeX + badgeWidth - radius, badgeY + radius, radius, -Math.PI / 2, Math.PI / 2);
		ctx.lineTo(badgeX + radius, badgeY + 2 * radius);
		ctx.arc(badgeX + radius, badgeY + radius, radius, Math.PI / 2, -Math.PI / 2);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#FFFFFF";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + radius);
	}

	// Title
	const titleMaxWidth = COVER_WIDTH - 60;
	let titleFontSize = 36;
	ctx.font = `700 ${titleFontSize}px sans-serif`;
	let titleLines = wrapText(ctx, book.title, titleMaxWidth);

	// Drop to smaller font if too many lines
	if (titleLines.length > 4) {
		titleFontSize = 28;
		ctx.font = `700 ${titleFontSize}px sans-serif`;
		titleLines = wrapText(ctx, book.title, titleMaxWidth);
	}

	const lineHeight = titleFontSize * 1.25;
	const titleBlockHeight = titleLines.length * lineHeight;
	const authorHeight = book.author ? 40 : 0;
	const totalContentHeight = titleBlockHeight + authorHeight;
	const startY = (COVER_HEIGHT - totalContentHeight) / 2;

	ctx.fillStyle = "#FFFFFF";
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	for (let i = 0; i < titleLines.length; i++) {
		ctx.fillText(titleLines[i], COVER_WIDTH / 2, startY + i * lineHeight);
	}

	// Author
	if (book.author) {
		ctx.font = "400 20px sans-serif";
		ctx.globalAlpha = 0.75;
		ctx.fillText(book.author, COVER_WIDTH / 2, startY + titleBlockHeight + 16);
		ctx.globalAlpha = 1.0;
	}

	// Bottom bar with slug
	ctx.fillStyle = accentColor;
	ctx.fillRect(0, COVER_HEIGHT - 36, COVER_WIDTH, 36);
	ctx.fillStyle = "#FFFFFF";
	ctx.font = "400 13px monospace";
	ctx.globalAlpha = 0.8;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(book.name, COVER_WIDTH / 2, COVER_HEIGHT - 18);
	ctx.globalAlpha = 1.0;

	// Write PNG
	const coverPath = path.join(bookDir, "cover.png");
	const buffer = canvas.toBuffer("image/png");
	fs.writeFileSync(coverPath, buffer);

	return coverPath;
}

function loadBookJson(bookDir: string): BookJson | null {
	const bookJsonPath = path.join(bookDir, "book.json");
	if (!fs.existsSync(bookJsonPath)) return null;
	try {
		return JSON.parse(fs.readFileSync(bookJsonPath, "utf8")) as BookJson;
	} catch {
		return null;
	}
}

function updateBookJsonCover(bookDir: string): void {
	const bookJsonPath = path.join(bookDir, "book.json");
	if (!fs.existsSync(bookJsonPath)) return;
	try {
		const data = JSON.parse(fs.readFileSync(bookJsonPath, "utf8"));
		data.coverImage = "cover.png";
		fs.writeFileSync(bookJsonPath, `${JSON.stringify(data, null, 2)}\n`);
	} catch {
		console.warn(`WARNING: Could not update ${bookJsonPath}`);
	}
}

async function run(opts: GenerateOpts): Promise<void> {
	if (!fs.existsSync(BOOKS_DIR)) {
		console.log("No library found at ~/.claude/library/books/");
		return;
	}

	let bookDirs: string[] = [];

	if (opts.name) {
		const dir = path.join(BOOKS_DIR, opts.name);
		if (!fs.existsSync(dir)) {
			console.error(`Book "${opts.name}" not found in library.`);
			process.exit(1);
		}
		bookDirs = [dir];
	} else if (opts.all) {
		const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });
		bookDirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(BOOKS_DIR, e.name));
	} else {
		console.error("Specify --all or --name <name>. Use -h for help.");
		process.exit(1);
	}

	let generated = 0;

	for (const bookDir of bookDirs) {
		const book = loadBookJson(bookDir);
		if (!book) {
			console.warn(`WARNING: No book.json in ${path.basename(bookDir)}/, skipping`);
			continue;
		}

		const coverPath = path.join(bookDir, "cover.png");
		if (fs.existsSync(coverPath) && !opts.force) {
			console.log(`  SKIP: ${book.name} (cover exists, use --force to regenerate)`);
			continue;
		}

		try {
			const outPath = await generateCover(bookDir, book);
			updateBookJsonCover(bookDir);
			console.log(`  OK: ${book.name} -> ${outPath}`);
			generated++;
		} catch (err) {
			console.error(`  ERROR: ${book.name}: ${(err as Error).message}`);
		}
	}

	console.log(`\nGenerated ${generated} cover(s).`);

	if (generated > 0) {
		console.log("Rebuilding library index...");
		const indexScript = path.join(__dirname, "library_index.ts");
		spawnSync("npx", ["tsx", indexScript], { stdio: "inherit" });
	}
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const opts = parseArgs();
	if (opts.help) {
		printUsage();
		process.exit(0);
	}
	run(opts).catch((err) => {
		console.error("Fatal error:", err.message);
		process.exit(1);
	});
}
