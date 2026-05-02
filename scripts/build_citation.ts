import path from "node:path";
import { slug } from "github-slugger";

/**
 * Build a canonical Starlight URL+anchor citation for a docs file.
 *
 * The URL is derived as `<siteBase>/<lastSegment(docsRoot)>/<relPath-without-ext>/`,
 * where `relPath` is `filePath` made relative to the parent of `docsRoot`. The
 * heading is slugified with `github-slugger` (the same slugifier Starlight uses).
 *
 * `headingText` may be `null` or empty — in that case no `#anchor` is appended.
 *
 * Repeated headings on the same page (Starlight appends `-1`, `-2`, ...) are
 * out of scope for this pure function: it always returns the slug for the
 * first occurrence. Callers needing per-page deduplication should keep a
 * stateful `GithubSlugger` instance and pass the deduped heading text in.
 */
export function buildCitation(
	filePath: string,
	headingText: string | null,
	siteBase: string,
	docsRoot: string,
): string {
	const normalizedDocsRoot = docsRoot.replace(/\/+$/, "");
	const docsRootParent = path.posix.dirname(normalizedDocsRoot);
	const stripPrefix = docsRootParent === "." || docsRootParent === "" ? "" : `${docsRootParent}/`;

	let urlPath = filePath.startsWith(stripPrefix) ? filePath.slice(stripPrefix.length) : filePath;

	urlPath = urlPath.replace(/\.(mdx|md)$/i, "");
	urlPath = urlPath.replace(/\/index$/, "");

	const base = siteBase.replace(/\/+$/, "");
	let url = `${base}/${urlPath}/`;

	if (headingText && headingText.length > 0) {
		url += `#${slug(headingText)}`;
	}

	return url;
}
