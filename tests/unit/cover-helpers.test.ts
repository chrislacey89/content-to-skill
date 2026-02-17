import { describe, expect, it } from "vitest";
import { hexToRgb, lightenColor } from "../../scripts/generate_covers.js";

describe("hexToRgb", () => {
	it("parses #FF0000 (red)", () => {
		expect(hexToRgb("#FF0000")).toEqual({ r: 255, g: 0, b: 0 });
	});

	it("parses #1A56DB (blue)", () => {
		expect(hexToRgb("#1A56DB")).toEqual({ r: 26, g: 86, b: 219 });
	});

	it("parses #000000 (black)", () => {
		expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
	});

	it("parses #FFFFFF (white)", () => {
		expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
	});
});

describe("lightenColor", () => {
	it("lightens black by 50% to #808080", () => {
		expect(lightenColor("#000000", 0.5).toUpperCase()).toBe("#808080");
	});

	it("keeps white unchanged at 50%", () => {
		expect(lightenColor("#FFFFFF", 0.5).toUpperCase()).toBe("#FFFFFF");
	});

	it("returns same color with 0% lightening", () => {
		expect(lightenColor("#FF0000", 0).toUpperCase()).toBe("#FF0000");
	});

	it("produces lighter result for non-zero amount", () => {
		const original = hexToRgb("#1A56DB");
		const lightened = hexToRgb(lightenColor("#1A56DB", 0.3));
		expect(lightened.r).toBeGreaterThanOrEqual(original.r);
		expect(lightened.g).toBeGreaterThanOrEqual(original.g);
		expect(lightened.b).toBeGreaterThanOrEqual(original.b);
	});
});
