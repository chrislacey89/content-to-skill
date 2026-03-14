declare module "html-to-text" {
	export interface HtmlToTextNode {
		attribs?: Record<string, string | undefined>;
		children?: HtmlToTextNode[];
	}

	export interface HtmlToTextBuilder {
		addInline: (text: string) => void;
	}

	export type HtmlToTextWalk = (
		nodes: HtmlToTextNode[] | undefined,
		builder: HtmlToTextBuilder,
	) => void;

	export type HtmlToTextFormatter = (
		elem: HtmlToTextNode,
		walk: HtmlToTextWalk,
		builder: HtmlToTextBuilder,
	) => void;

	export interface HtmlToTextSelector {
		selector: string;
		format: string;
	}

	export interface HtmlToTextOptions {
		wordwrap?: boolean | number;
		preserveNewlines?: boolean;
		formatters?: Record<string, HtmlToTextFormatter>;
		selectors?: HtmlToTextSelector[];
	}

	export function convert(html: string, options?: HtmlToTextOptions): string;
}
