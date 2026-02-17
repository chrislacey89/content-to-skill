import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../scripts/library_migrate.js";

describe("parseFrontmatter", () => {
	it("parses simple key-value pairs", () => {
		const content = `---
name: my-skill
title: My Skill
---

# Content`;
		const result = parseFrontmatter(content);
		expect(result.name).toBe("my-skill");
		expect(result.title).toBe("My Skill");
	});

	it("strips surrounding double quotes", () => {
		const content = `---
description: "A quoted description"
---`;
		expect(parseFrontmatter(content).description).toBe("A quoted description");
	});

	it("strips surrounding single quotes", () => {
		const content = `---
description: 'A single-quoted description'
---`;
		expect(parseFrontmatter(content).description).toBe("A single-quoted description");
	});

	it("returns empty object for no frontmatter", () => {
		expect(parseFrontmatter("# Just a heading")).toEqual({});
		expect(parseFrontmatter("")).toEqual({});
	});

	it("handles values with colons", () => {
		const content = `---
title: Thinking, Fast and Slow: A Summary
---`;
		// Current implementation splits on first colon, so the full value after first colon is preserved
		expect(parseFrontmatter(content).title).toBe("Thinking, Fast and Slow: A Summary");
	});

	it("skips lines without colons", () => {
		const content = `---
name: test
invalid line
title: Test Title
---`;
		const result = parseFrontmatter(content);
		expect(result.name).toBe("test");
		expect(result.title).toBe("Test Title");
		expect(Object.keys(result)).toHaveLength(2);
	});
});
