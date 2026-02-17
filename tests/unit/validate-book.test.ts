import { describe, expect, it, vi } from "vitest";
import { validateBook } from "../../scripts/library_index.js";

describe("validateBook", () => {
	it("returns true for a valid book with all required fields", () => {
		const book = { name: "test", title: "Test", description: "A test book" };
		expect(validateBook(book, "test-dir")).toBe(true);
	});

	it("returns false when name is missing", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const book = { title: "Test", description: "A test" };
		expect(validateBook(book, "test-dir")).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("name"));
		warnSpy.mockRestore();
	});

	it("returns false when description is missing", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const book = { name: "test", title: "Test" };
		expect(validateBook(book, "test-dir")).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("description"));
		warnSpy.mockRestore();
	});

	it("returns false when all required fields are missing", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const book = { author: "Author" };
		expect(validateBook(book, "test-dir")).toBe(false);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it("treats empty string as falsy (missing)", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const book = { name: "", title: "Test", description: "A test" };
		expect(validateBook(book, "test-dir")).toBe(false);
		warnSpy.mockRestore();
	});
});
