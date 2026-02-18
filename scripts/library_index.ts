#!/usr/bin/env tsx

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIBRARY_DIR = path.join(os.homedir(), ".claude", "library");
const BOOKS_DIR = path.join(LIBRARY_DIR, "books");
const INDEX_PATH = path.join(LIBRARY_DIR, "index.json");

const REQUIRED_FIELDS = ["name", "title", "description"] as const;

interface BookJson {
	name: string;
	title: string;
	author?: string;
	year?: number | null;
	category?: string;
	documentType?: "book" | "paper";
	tags?: string[];
	description: string;
	referenceFiles?: string[];
	coverImage?: string;
}

interface IndexEntry {
	name: string;
	title: string;
	author: string | null;
	year: number | null;
	category: string | null;
	documentType: "book" | "paper";
	tags: string[];
	description: string;
	referenceFiles: string[];
	coverImage: string | null;
}

interface LibraryIndex {
	version: number;
	lastUpdated: string;
	bookCount: number;
	books: IndexEntry[];
}

function loadBookJson(bookDir: string): BookJson | null {
	const bookJsonPath = path.join(bookDir, "book.json");
	if (!fs.existsSync(bookJsonPath)) return null;

	try {
		const raw = fs.readFileSync(bookJsonPath, "utf8");
		return JSON.parse(raw) as BookJson;
	} catch (err) {
		console.warn(`WARNING: Failed to parse ${bookJsonPath}: ${(err as Error).message}`);
		return null;
	}
}

export function validateBook(book: Partial<BookJson>, dirName: string): boolean {
	const missing = REQUIRED_FIELDS.filter((f) => !book[f]);
	if (missing.length > 0) {
		console.warn(`WARNING: ${dirName}/book.json missing required fields: ${missing.join(", ")}`);
		return false;
	}
	return true;
}

function buildIndex(): LibraryIndex {
	// Ensure library directory exists
	if (!fs.existsSync(BOOKS_DIR)) {
		fs.mkdirSync(BOOKS_DIR, { recursive: true });
	}

	const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });
	const books: IndexEntry[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const bookDir = path.join(BOOKS_DIR, entry.name);
		const book = loadBookJson(bookDir);
		if (!book) {
			console.warn(`WARNING: No book.json in ${entry.name}/, skipping`);
			continue;
		}

		if (!validateBook(book, entry.name)) continue;

		books.push({
			name: book.name,
			title: book.title,
			author: book.author || null,
			year: book.year || null,
			category: book.category || null,
			documentType: book.documentType || "book",
			tags: book.tags || [],
			description: book.description,
			referenceFiles: book.referenceFiles || [],
			coverImage: book.coverImage || null,
		});
	}

	// Sort alphabetically by name
	books.sort((a, b) => a.name.localeCompare(b.name));

	const index: LibraryIndex = {
		version: 1,
		lastUpdated: new Date().toISOString(),
		bookCount: books.length,
		books,
	};

	fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
	console.log(`Index rebuilt: ${books.length} book(s) at ${INDEX_PATH}`);

	return index;
}

// Only run when executed directly, not when imported
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	buildIndex();
}
