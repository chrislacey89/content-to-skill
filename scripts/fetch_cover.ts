#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type BookJson,
	generateCover,
	loadBookJson,
	updateBookJsonCover,
} from "./generate_covers.js";
import { resolveBooksDir } from "./resolve-library.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOKS_DIR = resolveBooksDir();
const MIN_WIDTH = 100;
const MIN_HEIGHT = 150;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FetchOpts {
	all: boolean;
	name: string | null;
	dir: string | null;
	author: string | null;
	force: boolean;
	help: boolean;
}

function parseArgs(): FetchOpts {
	const args = process.argv.slice(2);
	let name: string | null = null;
	let dir: string | null = null;
	let author: string | null = null;
	const nameIdx = args.indexOf("--name");
	if (nameIdx !== -1 && args[nameIdx + 1]) {
		name = args[nameIdx + 1];
	}
	const dirIdx = args.indexOf("--dir");
	if (dirIdx !== -1 && args[dirIdx + 1]) {
		dir = args[dirIdx + 1];
	}
	const authorIdx = args.indexOf("--author");
	if (authorIdx !== -1 && args[authorIdx + 1]) {
		author = args[authorIdx + 1];
	}
	return {
		all: args.includes("--all"),
		name,
		dir,
		author,
		force: args.includes("--force"),
		help: args.includes("-h") || args.includes("--help"),
	};
}

function printUsage(): void {
	console.log(`
Usage: tsx fetch_cover.ts [options]

Fetches real book cover images from APIs, falling back to programmatic generation.

API chain: Bookcover API (Goodreads) → Open Library → Programmatic generation
Quality gate: minimum ${MIN_WIDTH}x${MIN_HEIGHT} (rejects tiny thumbnails)

Options:
  --all             Fetch covers for all books (upgrades existing if better found)
  --name <name>     Fetch cover for a specific book in the library
  --dir <path>      Fetch cover for a book.json in a custom directory
  --author <name>   Override author name for search (e.g., correct diacritics)
  --force           Re-fetch even if cover already exists
  -h, --help        Show this help message
`);
}

/** Parse JPEG dimensions from a buffer by reading SOF markers. */
function getJpegDimensions(buf: Buffer): { width: number; height: number } | null {
	let offset = 2; // skip SOI marker
	while (offset < buf.length - 1) {
		if (buf[offset] !== 0xff) return null;
		const marker = buf[offset + 1];
		// SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
		if (
			(marker >= 0xc0 && marker <= 0xc3) ||
			(marker >= 0xc5 && marker <= 0xc7) ||
			(marker >= 0xc9 && marker <= 0xcb) ||
			(marker >= 0xcd && marker <= 0xcf)
		) {
			const height = buf.readUInt16BE(offset + 5);
			const width = buf.readUInt16BE(offset + 7);
			return { width, height };
		}
		// Skip to next marker
		const segmentLength = buf.readUInt16BE(offset + 2);
		offset += 2 + segmentLength;
	}
	return null;
}

/** Parse PNG dimensions from the IHDR chunk. */
function getPngDimensions(buf: Buffer): { width: number; height: number } | null {
	// PNG signature: 8 bytes, then IHDR chunk starts at offset 8
	if (buf.length < 24) return null;
	// Verify PNG signature
	if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e) return null;
	const width = buf.readUInt32BE(16);
	const height = buf.readUInt32BE(20);
	return { width, height };
}

/** Get image dimensions from a buffer (supports JPEG and PNG). */
function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
	if (buf[0] === 0xff && buf[1] === 0xd8) return getJpegDimensions(buf);
	if (buf[0] === 0x89 && buf[1] === 0x50) return getPngDimensions(buf);
	return null;
}

/** Check if dimensions meet the quality gate. */
function meetsQualityGate(dims: { width: number; height: number }): boolean {
	return dims.width >= MIN_WIDTH && dims.height >= MIN_HEIGHT;
}

/** Extract first author from multi-author strings like "Gabriel Weinberg & Justin Mares". */
function firstAuthor(author: string | undefined): string | undefined {
	if (!author) return undefined;
	// Split on " & ", " and ", ", "
	return author.split(/\s*[&,]\s*|\s+and\s+/i)[0].trim() || undefined;
}

/** Try fetching a cover from Bookcover API (Goodreads source). */
async function tryBookcoverApi(
	title: string,
	author: string | undefined,
): Promise<{ buffer: Buffer; dims: { width: number; height: number } } | null> {
	const params = new URLSearchParams({ book_title: title });
	// Bookcover API works best with a single author name
	const singleAuthor = firstAuthor(author);
	if (singleAuthor) params.set("author_name", singleAuthor);

	const searchUrl = `https://bookcover.longitood.com/bookcover?${params}`;
	console.log("  Bookcover API: searching...");

	let res: Response;
	try {
		res = await fetch(searchUrl);
	} catch (err) {
		console.log(`  Bookcover API: network error — ${(err as Error).message}`);
		return null;
	}
	if (!res.ok) {
		console.log(`  Bookcover API: not found (${res.status})`);
		return null;
	}

	const data = (await res.json()) as { url?: string };
	if (!data.url) {
		console.log("  Bookcover API: no cover URL returned");
		return null;
	}

	console.log(`  Bookcover API: found → ${data.url}`);
	try {
		const coverRes = await fetch(data.url);
		if (!coverRes.ok) {
			console.log(`  Bookcover API: cover download failed (${coverRes.status})`);
			return null;
		}
		const buffer = Buffer.from(await coverRes.arrayBuffer());
		const dims = getImageDimensions(buffer);
		if (!dims) {
			console.log("  Bookcover API: could not read image dimensions");
			return null;
		}
		console.log(`  Bookcover API: ${dims.width}x${dims.height}`);
		if (!meetsQualityGate(dims)) {
			console.log("  Bookcover API: below quality gate");
			return null;
		}
		return { buffer, dims };
	} catch (err) {
		console.log(`  Bookcover API: download error — ${(err as Error).message}`);
		return null;
	}
}

/** Try fetching a cover from Open Library. */
async function tryOpenLibrary(
	title: string,
	author: string | undefined,
): Promise<{ buffer: Buffer; dims: { width: number; height: number } } | null> {
	const params = new URLSearchParams({
		title,
		fields: "cover_i",
		limit: "5",
	});
	if (author) params.set("author", author);

	const searchUrl = `https://openlibrary.org/search.json?${params}`;
	console.log(`  OpenLibrary: searching...`);

	let searchRes: Response;
	try {
		searchRes = await fetch(searchUrl);
	} catch (err) {
		console.log(`  OpenLibrary: network error — ${(err as Error).message}`);
		return null;
	}
	if (!searchRes.ok) {
		console.log(`  OpenLibrary: search failed (${searchRes.status})`);
		return null;
	}

	const data = (await searchRes.json()) as {
		docs: Array<{ cover_i?: number }>;
	};
	const docs = data.docs || [];
	if (docs.length === 0) {
		console.log("  OpenLibrary: no results found");
		return null;
	}

	let best: { buffer: Buffer; dims: { width: number; height: number } } | null = null;
	let bestPixels = 0;

	for (const doc of docs) {
		if (!doc.cover_i) continue;
		const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`;
		try {
			const coverRes = await fetch(coverUrl);
			if (!coverRes.ok) continue;
			const buffer = Buffer.from(await coverRes.arrayBuffer());
			const dims = getImageDimensions(buffer);
			if (!dims) continue;
			const pixels = dims.width * dims.height;
			console.log(`  OpenLibrary: cover_i=${doc.cover_i} → ${dims.width}x${dims.height}`);
			if (!meetsQualityGate(dims)) {
				console.log("  OpenLibrary: below quality gate, trying next...");
				continue;
			}
			if (pixels > bestPixels) {
				best = { buffer, dims };
				bestPixels = pixels;
			}
		} catch {}
	}

	if (best) {
		console.log(`  OpenLibrary: best cover → ${best.dims.width}x${best.dims.height}`);
		return best;
	}

	console.log("  OpenLibrary: no cover met quality requirements");
	return null;
}

/** Strip subtitle from a title (text after first colon or dash preceded by space). */
function stripSubtitle(title: string): string | null {
	const colonIdx = title.indexOf(":");
	const dashIdx = title.indexOf(" —");
	const emDashIdx = title.indexOf(" –");

	const candidates = [colonIdx, dashIdx, emDashIdx].filter((i) => i > 0);
	if (candidates.length === 0) return null;

	const cutAt = Math.min(...candidates);
	const stripped = title.slice(0, cutAt).trim();
	return stripped.length >= 3 ? stripped : null;
}

async function fetchCoverForBook(
	bookDir: string,
	book: BookJson,
	isAllMode: boolean,
	authorOverride: string | null,
): Promise<{ source: string; upgraded: boolean }> {
	const coverPath = path.join(bookDir, "cover.png");
	const existingDims = fs.existsSync(coverPath)
		? getImageDimensions(fs.readFileSync(coverPath))
		: null;

	const searchAuthor = authorOverride || book.author;

	// Try Bookcover API (Goodreads) first — try short title before full title
	// since Goodreads matches better on canonical titles without subtitles
	const shortTitle = stripSubtitle(book.title);
	let result: { buffer: Buffer; dims: { width: number; height: number } } | null = null;
	let source = "goodreads";

	if (shortTitle) {
		result = await tryBookcoverApi(shortTitle, searchAuthor);
	}
	if (!result) {
		result = await tryBookcoverApi(book.title, searchAuthor);
	}

	if (!result) {
		result = await tryOpenLibrary(book.title, searchAuthor);
		source = "openlibrary";
	}

	if (!result && shortTitle) {
		console.log(`  Retrying OpenLibrary with short title: "${shortTitle}"`);
		result = await tryOpenLibrary(shortTitle, searchAuthor);
		source = "openlibrary";
	}

	if (result) {
		// In --all mode, skip only if existing cover is already from an API source
		const existingSource = book.coverSource;
		if (isAllMode && existingDims && existingSource && existingSource !== "generated") {
			const existingPixels = existingDims.width * existingDims.height;
			const newPixels = result.dims.width * result.dims.height;
			if (newPixels <= existingPixels) {
				console.log(
					`  SKIP: existing ${existingSource} cover (${existingDims.width}x${existingDims.height}) is same or better`,
				);
				return { source: "kept", upgraded: false };
			}
			console.log(
				`  UPGRADE: ${existingDims.width}x${existingDims.height} → ${result.dims.width}x${result.dims.height}`,
			);
		} else if (isAllMode && existingSource === "generated") {
			console.log(
				`  REPLACING generated cover with real ${source} cover (${result.dims.width}x${result.dims.height})`,
			);
		}

		fs.writeFileSync(coverPath, result.buffer);
		updateBookJsonCover(bookDir, source);
		console.log(`  OK: ${book.name} → ${source} (${result.dims.width}x${result.dims.height})`);
		if (source !== "goodreads" && !authorOverride) {
			console.log(
				`  HINT: Bookcover API failed for "${book.title}" by "${searchAuthor}". A better Goodreads cover may be available if the author name needs diacritics. Retry with:\n` +
					`  npx tsx scripts/fetch_cover.ts --dir ${bookDir} --author "<corrected author>" --force`,
			);
		}
		return { source, upgraded: true };
	}

	// Fallback to programmatic generation
	console.log("  Falling back to programmatic cover generation...");
	console.log(
		`  HINT: No cover found for "${book.title}" by "${searchAuthor}". If the author name may need diacritics, retry with:\n` +
			`  npx tsx scripts/fetch_cover.ts --dir ${bookDir} --author "<corrected author>" --force`,
	);
	await generateCover(bookDir, book);
	updateBookJsonCover(bookDir, "generated");
	console.log(`  OK: ${book.name} → generated (programmatic)`);
	return { source: "generated", upgraded: true };
}

async function run(opts: FetchOpts): Promise<void> {
	let bookDirs: string[] = [];

	if (opts.dir) {
		if (!fs.existsSync(opts.dir)) {
			console.error(`Directory "${opts.dir}" not found.`);
			process.exit(1);
		}
		bookDirs = [opts.dir];
	} else if (!fs.existsSync(BOOKS_DIR)) {
		console.log("No library found at ~/.claude/library/books/");
		return;
	} else if (opts.name) {
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
		console.error("Specify --all, --name <name>, or --dir <path>. Use -h for help.");
		process.exit(1);
	}

	let processed = 0;

	for (const bookDir of bookDirs) {
		const book = loadBookJson(bookDir);
		if (!book) {
			console.warn(`WARNING: No book.json in ${path.basename(bookDir)}/, skipping`);
			continue;
		}

		const coverPath = path.join(bookDir, "cover.png");
		if (fs.existsSync(coverPath) && !opts.force && !opts.all) {
			console.log(`  SKIP: ${book.name} (cover exists, use --force to re-fetch)`);
			continue;
		}

		// Delay between books to avoid API rate limits
		if (processed > 0 || bookDirs.indexOf(bookDir) > 0) {
			await sleep(1000);
		}

		console.log(`\nFetching cover for: ${book.title} by ${book.author || "unknown"}`);
		try {
			const result = await fetchCoverForBook(bookDir, book, opts.all, opts.author);
			if (result.upgraded) processed++;
		} catch (err) {
			console.error(`  ERROR: ${book.name}: ${(err as Error).message}`);
		}
	}

	console.log(`\nProcessed ${processed} cover(s).`);

	if (processed > 0) {
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
