import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");
const SCRIPT = path.join(import.meta.dirname, "..", "..", "scripts", "library_index.ts");

describe("library_index.ts", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cts-test-index-"));
		// Create the library/books structure expected by the script
		const booksDir = path.join(tmpDir, ".claude", "library", "books");
		fs.mkdirSync(booksDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("creates index.json with valid book", () => {
		const srcBook = path.join(FIXTURES_DIR, "books", "test-book");
		const destBook = path.join(tmpDir, ".claude", "library", "books", "test-book");
		fs.cpSync(srcBook, destBook, { recursive: true });

		execSync(`npx tsx "${SCRIPT}"`, {
			stdio: "pipe",
			env: { ...process.env, HOME: tmpDir },
		});

		const indexPath = path.join(tmpDir, ".claude", "library", "index.json");
		expect(fs.existsSync(indexPath)).toBe(true);

		const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
		expect(index.version).toBe(1);
		expect(index.lastUpdated).toBeTruthy();
		expect(index.bookCount).toBe(1);
		expect(index.books).toHaveLength(1);
		expect(index.books[0].name).toBe("test-book");
		expect(index.books[0].title).toBe("Test Book Title");
		expect(index.books[0].description).toBe("A test book for validating library indexing.");
		expect(index.books[0].coverImage).toBeNull();
	});

	it("skips incomplete book.json (missing required fields)", () => {
		const booksDir = path.join(tmpDir, ".claude", "library", "books");

		fs.cpSync(path.join(FIXTURES_DIR, "books", "test-book"), path.join(booksDir, "test-book"), {
			recursive: true,
		});
		fs.cpSync(
			path.join(FIXTURES_DIR, "books", "incomplete-book"),
			path.join(booksDir, "incomplete-book"),
			{ recursive: true },
		);

		execSync(`npx tsx "${SCRIPT}"`, {
			stdio: "pipe",
			env: { ...process.env, HOME: tmpDir },
		});

		const indexPath = path.join(tmpDir, ".claude", "library", "index.json");
		const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

		// Only the valid book should be indexed
		expect(index.bookCount).toBe(1);
		expect(index.books[0].name).toBe("test-book");
	});

	it("creates empty index for empty books directory", () => {
		execSync(`npx tsx "${SCRIPT}"`, {
			stdio: "pipe",
			env: { ...process.env, HOME: tmpDir },
		});

		const indexPath = path.join(tmpDir, ".claude", "library", "index.json");
		const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
		expect(index.bookCount).toBe(0);
		expect(index.books).toHaveLength(0);
	});
});
