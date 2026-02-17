import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");
const SCRIPT = path.join(import.meta.dirname, "..", "..", "scripts", "library_migrate.ts");

describe("library_migrate.ts", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cts-test-migrate-"));
		// Create the expected directory structure
		fs.mkdirSync(path.join(tmpDir, ".claude", "skills"), { recursive: true });
		fs.mkdirSync(path.join(tmpDir, ".claude", "library", "books"), { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("migrates a skill with references/ directory", () => {
		const srcSkill = path.join(FIXTURES_DIR, "skills", "test-skill");
		const destSkill = path.join(tmpDir, ".claude", "skills", "test-skill");
		fs.cpSync(srcSkill, destSkill, { recursive: true });

		execSync(`npx tsx "${SCRIPT}"`, {
			stdio: "pipe",
			env: { ...process.env, HOME: tmpDir },
		});

		// Verify skill was migrated to library
		const migratedDir = path.join(tmpDir, ".claude", "library", "books", "test-skill");
		expect(fs.existsSync(migratedDir)).toBe(true);
		expect(fs.existsSync(path.join(migratedDir, "SKILL.md"))).toBe(true);
		expect(fs.existsSync(path.join(migratedDir, "references", "ref.md"))).toBe(true);

		// Verify book.json was generated
		const bookJsonPath = path.join(migratedDir, "book.json");
		expect(fs.existsSync(bookJsonPath)).toBe(true);

		const bookJson = JSON.parse(fs.readFileSync(bookJsonPath, "utf8"));
		expect(bookJson.name).toBe("test-skill");
		expect(bookJson.title).toBe("Test Skill Title");
		expect(bookJson.description).toBe("A test skill for migration testing.");
	});

	it("removes originals with --remove-originals flag", () => {
		const srcSkill = path.join(FIXTURES_DIR, "skills", "test-skill");
		const destSkill = path.join(tmpDir, ".claude", "skills", "test-skill");
		fs.cpSync(srcSkill, destSkill, { recursive: true });

		execSync(`npx tsx "${SCRIPT}" --remove-originals`, {
			stdio: "pipe",
			env: { ...process.env, HOME: tmpDir },
		});

		// Original should be deleted
		expect(fs.existsSync(destSkill)).toBe(false);

		// Migrated copy should exist
		const migratedDir = path.join(tmpDir, ".claude", "library", "books", "test-skill");
		expect(fs.existsSync(migratedDir)).toBe(true);
	});

	it("exits 0 with no matching skills", () => {
		// Empty skills dir — no skills with references/
		execSync(`npx tsx "${SCRIPT}"`, {
			stdio: "pipe",
			env: { ...process.env, HOME: tmpDir },
		});

		// No books should be created
		const booksDir = path.join(tmpDir, ".claude", "library", "books");
		const entries = fs.readdirSync(booksDir);
		expect(entries).toHaveLength(0);
	});
});
