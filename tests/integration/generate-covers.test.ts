import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");
const SCRIPT = path.join(import.meta.dirname, "..", "..", "scripts", "generate_covers.ts");

describe("generate_covers.ts", () => {
	let tmpDir: string;
	let booksDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cts-test-covers-"));
		booksDir = path.join(tmpDir, ".claude", "library", "books");
		fs.mkdirSync(booksDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function copyFixtureBook(destName: string = "test-book"): string {
		const src = path.join(FIXTURES_DIR, "books", "test-book");
		const dest = path.join(booksDir, destName);
		fs.cpSync(src, dest, { recursive: true });
		return dest;
	}

	function runCovers(args: string): string {
		return execSync(`npx tsx "${SCRIPT}" ${args}`, {
			stdio: "pipe",
			env: { ...process.env, HOME: tmpDir },
		}).toString();
	}

	it("generates cover.png for a valid book", () => {
		const bookDir = copyFixtureBook();
		runCovers("--name test-book");

		const coverPath = path.join(bookDir, "cover.png");
		expect(fs.existsSync(coverPath)).toBe(true);

		// Check PNG magic bytes
		const buf = fs.readFileSync(coverPath);
		expect(buf[0]).toBe(0x89);
		expect(buf[1]).toBe(0x50); // P
		expect(buf[2]).toBe(0x4e); // N
		expect(buf[3]).toBe(0x47); // G
	});

	it("updates book.json with coverImage", () => {
		const bookDir = copyFixtureBook();
		runCovers("--name test-book");

		const bookJson = JSON.parse(fs.readFileSync(path.join(bookDir, "book.json"), "utf8"));
		expect(bookJson.coverImage).toBe("cover.png");
	});

	it("skips existing covers without --force", () => {
		const bookDir = copyFixtureBook();
		const coverPath = path.join(bookDir, "cover.png");

		// Create a dummy cover
		const dummyContent = Buffer.from("dummy-cover");
		fs.writeFileSync(coverPath, dummyContent);

		runCovers("--name test-book");

		// File should be unchanged
		const afterContent = fs.readFileSync(coverPath);
		expect(afterContent.equals(dummyContent)).toBe(true);
	});

	it("regenerates with --force", () => {
		const bookDir = copyFixtureBook();
		const coverPath = path.join(bookDir, "cover.png");

		// Create a small dummy cover
		fs.writeFileSync(coverPath, Buffer.from("tiny"));

		const sizeBefore = fs.statSync(coverPath).size;
		runCovers("--name test-book --force");

		const sizeAfter = fs.statSync(coverPath).size;
		expect(sizeAfter).not.toBe(sizeBefore);
	});

	it("--all generates for multiple books", () => {
		const bookA = copyFixtureBook("book-alpha");
		const bookB = copyFixtureBook("book-beta");

		runCovers("--all");

		expect(fs.existsSync(path.join(bookA, "cover.png"))).toBe(true);
		expect(fs.existsSync(path.join(bookB, "cover.png"))).toBe(true);
	});

	it("skips directories without book.json", () => {
		copyFixtureBook();
		// Create an empty directory (no book.json)
		fs.mkdirSync(path.join(booksDir, "empty-dir"), { recursive: true });

		// Should not crash; WARNING goes to stderr
		execSync(`npx tsx "${SCRIPT}" --all`, {
			env: { ...process.env, HOME: tmpDir },
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		// No cover should be generated for the empty dir
		expect(fs.existsSync(path.join(booksDir, "empty-dir", "cover.png"))).toBe(false);
	});
});
