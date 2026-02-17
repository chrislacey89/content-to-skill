import { describe, expect, it } from "vitest";
import { toArray } from "../../scripts/chunk_document.js";

describe("toArray", () => {
	it("returns empty array for null/undefined", () => {
		expect(toArray(null)).toEqual([]);
		expect(toArray(undefined)).toEqual([]);
	});

	it("wraps falsy non-null values in an array", () => {
		expect(toArray(0)).toEqual([0]);
		expect(toArray("")).toEqual([""]);
		expect(toArray(false)).toEqual([false]);
	});

	it("wraps a single value in an array", () => {
		expect(toArray("hello")).toEqual(["hello"]);
		expect(toArray(42)).toEqual([42]);
		expect(toArray({ id: 1 })).toEqual([{ id: 1 }]);
	});

	it("returns an array unchanged", () => {
		expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
		expect(toArray(["a", "b"])).toEqual(["a", "b"]);
	});

	it("returns empty array unchanged", () => {
		expect(toArray([])).toEqual([]);
	});
});
