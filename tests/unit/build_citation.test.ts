import { describe, expect, it } from "vitest";
import { buildCitation } from "../../scripts/build_citation.js";

const EFFECT_DOCS_ROOT = "content/src/content/docs/docs";
const EFFECT_SITE = "https://effect.website";

describe("buildCitation — known Effect docs anchors", () => {
	it("error-management/expected-errors: Catching Tagged Errors", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/error-management/expected-errors.mdx",
				"Catching Tagged Errors",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/error-management/expected-errors/#catching-tagged-errors");
	});

	it("error-management/expected-errors: Catching Multiple Errors", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/error-management/expected-errors.mdx",
				"Catching Multiple Errors",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe(
			"https://effect.website/docs/error-management/expected-errors/#catching-multiple-errors",
		);
	});

	it("concurrency/fibers: Forking Effects", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/concurrency/fibers.mdx",
				"Forking Effects",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/concurrency/fibers/#forking-effects");
	});

	it("observability/tracing: Spans", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/observability/tracing.mdx",
				"Spans",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/observability/tracing/#spans");
	});

	it("schema/transformations: Encoding and Decoding", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/schema/transformations.mdx",
				"Encoding and Decoding",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/schema/transformations/#encoding-and-decoding");
	});

	it("getting-started/why-effect: works without trailing punctuation", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/getting-started/why-effect.mdx",
				"Why Effect?",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/getting-started/why-effect/#why-effect");
	});
});

describe("buildCitation — edge cases", () => {
	it("null heading returns URL without anchor", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/error-management/expected-errors.mdx",
				null,
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/error-management/expected-errors/");
	});

	it("empty-string heading returns URL without anchor", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/error-management/expected-errors.mdx",
				"",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/error-management/expected-errors/");
	});

	it("is deterministic for repeated calls with the same heading", () => {
		const call = () =>
			buildCitation(
				"content/src/content/docs/docs/concurrency/fibers.mdx",
				"Examples",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			);
		expect(call()).toBe(call());
	});

	it("preserves unicode characters per github-slugger rules", () => {
		// github-slugger preserves unicode letters and lowercases them
		expect(
			buildCitation(
				"content/src/content/docs/docs/intl/configuração.mdx",
				"Configuração de Idioma",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/intl/configuração/#configuração-de-idioma");
	});

	it("strips .md extension as well as .mdx", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/getting-started/installation.md",
				"Quickstart",
				EFFECT_SITE,
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/getting-started/installation/#quickstart");
	});

	it("trailing slash in siteBase does not produce a double slash", () => {
		expect(
			buildCitation(
				"content/src/content/docs/docs/error-management/expected-errors.mdx",
				"Catching Tagged Errors",
				"https://effect.website/",
				EFFECT_DOCS_ROOT,
			),
		).toBe("https://effect.website/docs/error-management/expected-errors/#catching-tagged-errors");
	});

	it("works when docsRoot is at the repo root (e.g., 'docs')", () => {
		expect(buildCitation("docs/intro.mdx", "Welcome", "https://example.com", "docs")).toBe(
			"https://example.com/docs/intro/#welcome",
		);
	});
});
