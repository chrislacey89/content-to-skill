import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseInput, walkAndGroup } from "../../scripts/fetch_docs_repo.js";

describe("parseInput — shorthand grammar", () => {
	it("parses owner/repo only", () => {
		expect(parseInput("github:Effect-TS/website")).toEqual({
			kind: "shorthand",
			owner: "Effect-TS",
			repo: "website",
		});
	});

	it("parses owner/repo#ref", () => {
		expect(parseInput("github:Effect-TS/website#main")).toEqual({
			kind: "shorthand",
			owner: "Effect-TS",
			repo: "website",
			ref: "main",
		});
	});

	it("parses owner/repo:path", () => {
		expect(parseInput("github:Effect-TS/website:content/src/content/docs/docs")).toEqual({
			kind: "shorthand",
			owner: "Effect-TS",
			repo: "website",
			path: "content/src/content/docs/docs",
		});
	});

	it("parses owner/repo#ref:path", () => {
		expect(parseInput("github:Effect-TS/website#main:content/src/content/docs/docs")).toEqual({
			kind: "shorthand",
			owner: "Effect-TS",
			repo: "website",
			ref: "main",
			path: "content/src/content/docs/docs",
		});
	});

	it("rejects malformed shorthand", () => {
		expect(() => parseInput("github:no-slash-here")).toThrow();
		expect(() => parseInput("github:")).toThrow();
	});
});

describe("parseInput — URL grammar", () => {
	it("parses bare GitHub URL", () => {
		expect(parseInput("https://github.com/Effect-TS/website")).toEqual({
			kind: "url",
			owner: "Effect-TS",
			repo: "website",
		});
	});

	it("parses /tree/<ref>/<path> URL", () => {
		expect(
			parseInput("https://github.com/Effect-TS/website/tree/main/content/src/content/docs/docs"),
		).toEqual({
			kind: "url",
			owner: "Effect-TS",
			repo: "website",
			ref: "main",
			path: "content/src/content/docs/docs",
		});
	});

	it("parses /tree/<ref> with no path", () => {
		expect(parseInput("https://github.com/Effect-TS/website/tree/v1.2.3")).toEqual({
			kind: "url",
			owner: "Effect-TS",
			repo: "website",
			ref: "v1.2.3",
		});
	});

	it("strips trailing .git from repo", () => {
		expect(parseInput("https://github.com/Effect-TS/website.git")).toEqual({
			kind: "url",
			owner: "Effect-TS",
			repo: "website",
		});
	});

	it("rejects non-github.com URL", () => {
		expect(() => parseInput("https://example.com/foo/bar")).toThrow();
	});

	it("rejects unparseable string", () => {
		expect(() => parseInput("just-a-string")).toThrow();
	});
});

describe("walkAndGroup", () => {
	function makeFixture(): {
		sourceRoot: string;
		docsRoot: string;
		cleanup: () => void;
	} {
		const sourceRoot = mkdtempSync(path.join(tmpdir(), "docs-walk-"));
		const docsRoot = path.join(sourceRoot, "docs");
		mkdirSync(path.join(docsRoot, "error-management"), { recursive: true });
		mkdirSync(path.join(docsRoot, "concurrency"), { recursive: true });

		writeFileSync(
			path.join(docsRoot, "error-management", "expected-errors.mdx"),
			"---\ntitle: Expected Errors\nsidebar:\n  order: 1\n---\n# body",
		);
		writeFileSync(
			path.join(docsRoot, "error-management", "unexpected-errors.mdx"),
			"---\ntitle: Unexpected Errors\nsidebar:\n  order: 2\n---\n# body",
		);
		writeFileSync(
			path.join(docsRoot, "concurrency", "fibers.mdx"),
			"---\ntitle: Fibers\nsidebar:\n  order: 1\n---\n# body",
		);
		writeFileSync(
			path.join(docsRoot, "introduction.mdx"),
			"---\ntitle: Introduction\nsidebar:\n  order: 1\n---\n# body",
		);

		return {
			sourceRoot,
			docsRoot,
			cleanup: () => rmSync(sourceRoot, { recursive: true, force: true }),
		};
	}

	it("groups files by first path segment after docsRoot", async () => {
		const { sourceRoot, docsRoot, cleanup } = makeFixture();
		try {
			const manifest = await walkAndGroup(
				sourceRoot,
				path.relative(sourceRoot, docsRoot),
				"https://example.com",
			);
			const groupNames = manifest.groups.map((g) => g.name).sort();
			expect(groupNames).toContain("error-management");
			expect(groupNames).toContain("concurrency");
		} finally {
			cleanup();
		}
	});

	it("collapses flat docsRoot files into a 'core' group", async () => {
		const { sourceRoot, docsRoot, cleanup } = makeFixture();
		try {
			const manifest = await walkAndGroup(
				sourceRoot,
				path.relative(sourceRoot, docsRoot),
				"https://example.com",
			);
			const core = manifest.groups.find((g) => g.name === "core");
			expect(core).toBeDefined();
			expect(core?.files.map((f) => f.relPath)).toContain("introduction.mdx");
		} finally {
			cleanup();
		}
	});

	it("sorts intra-group by sidebar.order then filename", async () => {
		const { sourceRoot, docsRoot, cleanup } = makeFixture();
		try {
			const manifest = await walkAndGroup(
				sourceRoot,
				path.relative(sourceRoot, docsRoot),
				"https://example.com",
			);
			const errMgmt = manifest.groups.find((g) => g.name === "error-management");
			expect(errMgmt?.files.map((f) => f.relPath)).toEqual([
				"error-management/expected-errors.mdx",
				"error-management/unexpected-errors.mdx",
			]);
		} finally {
			cleanup();
		}
	});

	it("fails clearly when no file has sidebar.order frontmatter", async () => {
		const sourceRoot = mkdtempSync(path.join(tmpdir(), "docs-walk-"));
		const docsRoot = path.join(sourceRoot, "docs");
		mkdirSync(docsRoot, { recursive: true });
		writeFileSync(path.join(docsRoot, "plain.mdx"), "---\ntitle: Plain\n---\n# body");
		try {
			await expect(
				walkAndGroup(sourceRoot, path.relative(sourceRoot, docsRoot), "https://example.com"),
			).rejects.toThrow(/Starlight/);
		} finally {
			rmSync(sourceRoot, { recursive: true, force: true });
		}
	});

	it("walker invariant: every file's relPath starts with docsRoot's last segment or is below it", async () => {
		const { sourceRoot, docsRoot, cleanup } = makeFixture();
		try {
			const manifest = await walkAndGroup(
				sourceRoot,
				path.relative(sourceRoot, docsRoot),
				"https://example.com",
			);
			for (const group of manifest.groups) {
				for (const file of group.files) {
					expect(file.relPath).toMatch(/\.(mdx|md)$/);
					expect(file.relPath.startsWith("/")).toBe(false);
				}
			}
		} finally {
			cleanup();
		}
	});
});
