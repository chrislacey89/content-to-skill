import { describe, expect, it } from "vitest";
import { resolveInputMeta } from "../../scripts/chunk_document.js";

describe("resolveInputMeta", () => {
	it("detects .pdf extension (lowercase)", () => {
		const result = resolveInputMeta("/path/to/book.pdf");
		expect(result.ext).toBe(".pdf");
		expect(result.name).toBe("book");
	});

	it("detects .epub extension (lowercase)", () => {
		const result = resolveInputMeta("/path/to/book.epub");
		expect(result.ext).toBe(".epub");
		expect(result.name).toBe("book");
	});

	it("lowercases the extension", () => {
		expect(resolveInputMeta("book.PDF").ext).toBe(".pdf");
		expect(resolveInputMeta("book.EPUB").ext).toBe(".epub");
		expect(resolveInputMeta("book.Pdf").ext).toBe(".pdf");
	});

	it("extracts basename without extension", () => {
		expect(resolveInputMeta("/a/b/my-book.pdf").name).toBe("my-book");
		expect(resolveInputMeta("simple.epub").name).toBe("simple");
	});

	it("handles files with dots in the name", () => {
		const result = resolveInputMeta("/path/my.book.v2.pdf");
		expect(result.ext).toBe(".pdf");
		expect(result.name).toBe("my.book.v2");
	});

	it("handles files with no extension", () => {
		const result = resolveInputMeta("/path/noext");
		expect(result.ext).toBe("");
		expect(result.name).toBe("noext");
	});
});
