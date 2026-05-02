import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type FetchInput =
	| { kind: "shorthand"; owner: string; repo: string; ref?: string; path?: string }
	| { kind: "url"; owner: string; repo: string; ref?: string; path?: string };

export type DocFile = {
	relPath: string;
	group: string;
	frontmatter: {
		title?: string;
		description?: string;
		sidebar?: { order?: number; label?: string };
	};
};

export type Manifest = {
	siteBase: string;
	docsRoot: string;
	groups: Array<{ name: string; files: DocFile[] }>;
};

export function parseInput(raw: string): FetchInput {
	if (raw.startsWith("github:")) {
		const body = raw.slice("github:".length);
		if (!body.includes("/")) {
			throw new Error(
				`Malformed github: shorthand: '${raw}'. Expected github:owner/repo[#ref][:path]`,
			);
		}
		// Split off path first (after `:`), then ref (after `#`)
		let pathPart: string | undefined;
		let rest = body;
		const colonIdx = rest.indexOf(":");
		if (colonIdx !== -1) {
			pathPart = rest.slice(colonIdx + 1) || undefined;
			rest = rest.slice(0, colonIdx);
		}
		let refPart: string | undefined;
		const hashIdx = rest.indexOf("#");
		if (hashIdx !== -1) {
			refPart = rest.slice(hashIdx + 1) || undefined;
			rest = rest.slice(0, hashIdx);
		}
		const [owner, repo] = rest.split("/");
		if (!owner || !repo) {
			throw new Error(
				`Malformed github: shorthand: '${raw}'. Expected github:owner/repo[#ref][:path]`,
			);
		}
		const out: FetchInput = { kind: "shorthand", owner, repo };
		if (refPart) out.ref = refPart;
		if (pathPart) out.path = pathPart;
		return out;
	}

	if (raw.startsWith("https://github.com/") || raw.startsWith("http://github.com/")) {
		const url = new URL(raw);
		const segs = url.pathname.split("/").filter(Boolean);
		const owner = segs[0];
		let repo = segs[1];
		if (!owner || !repo) {
			throw new Error(`Malformed GitHub URL: '${raw}'`);
		}
		if (repo.endsWith(".git")) {
			repo = repo.slice(0, -".git".length);
		}
		const out: FetchInput = { kind: "url", owner, repo };
		if (segs[2] === "tree" && segs[3]) {
			out.ref = segs[3];
			if (segs.length > 4) {
				out.path = segs.slice(4).join("/");
			}
		}
		return out;
	}

	throw new Error(
		`Unrecognized input: '${raw}'. Expected github:owner/repo[#ref][:path] or https://github.com/owner/repo[/tree/<ref>/<path>].`,
	);
}

async function runCmd(
	cmd: string,
	args: string[],
	opts: { cwd?: string; stdoutFile?: string } = {},
): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd: opts.cwd,
			stdio: opts.stdoutFile ? ["ignore", "pipe", "inherit"] : "inherit",
		});
		if (opts.stdoutFile && child.stdout) {
			const out = createWriteStream(opts.stdoutFile);
			child.stdout.pipe(out);
		}
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
		});
	});
}

async function defaultBranchOf(owner: string, repo: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn("gh", ["api", `repos/${owner}/${repo}`, "-q", ".default_branch"], {
			stdio: ["ignore", "pipe", "inherit"],
		});
		let buf = "";
		child.stdout.on("data", (d) => {
			buf += d.toString();
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) resolve(buf.trim());
			else reject(new Error(`gh api repos/${owner}/${repo} exited with code ${code}`));
		});
	});
}

/**
 * Download the repo tarball via `gh api repos/<o>/<r>/tarball/<ref>` and extract to
 * `<workingDir>/source/`. Returns the absolute path of the extracted tree root and
 * the resolved ref.
 */
export async function fetchDocsRepo(
	input: FetchInput,
	workingDir: string,
): Promise<{ sourceRoot: string; defaultRef: string }> {
	const { owner, repo } = input;
	const ref = input.ref ?? (await defaultBranchOf(owner, repo));

	const sourceDir = path.join(workingDir, "source");
	await mkdir(sourceDir, { recursive: true });

	const tarPath = path.join(workingDir, "source.tar.gz");
	await runCmd("gh", ["api", `repos/${owner}/${repo}/tarball/${ref}`], {
		stdoutFile: tarPath,
	});
	await runCmd("tar", ["-xzf", tarPath, "-C", sourceDir, "--strip-components=1"]);

	return { sourceRoot: sourceDir, defaultRef: ref };
}

function parseFrontmatter(content: string): DocFile["frontmatter"] {
	const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!fmMatch) return {};

	const fm: DocFile["frontmatter"] = {};
	const lines = fmMatch[1].split(/\r?\n/);
	let inSidebar = false;

	for (const rawLine of lines) {
		// Top-level keys: key: value (no leading whitespace)
		const topMatch = rawLine.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
		if (topMatch) {
			const [, key, valueRaw] = topMatch;
			const value = valueRaw.replace(/^["']|["']$/g, "").trim();
			if (key === "sidebar") {
				inSidebar = true;
				fm.sidebar = fm.sidebar ?? {};
				continue;
			}
			inSidebar = false;
			if (key === "title") fm.title = value;
			else if (key === "description") fm.description = value;
			continue;
		}
		// Indented sidebar.* keys
		if (inSidebar) {
			const subMatch = rawLine.match(/^\s+([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
			if (subMatch) {
				const [, key, valueRaw] = subMatch;
				const value = valueRaw.replace(/^["']|["']$/g, "").trim();
				fm.sidebar = fm.sidebar ?? {};
				if (key === "order") {
					const n = Number(value);
					if (!Number.isNaN(n)) fm.sidebar.order = n;
				} else if (key === "label") {
					fm.sidebar.label = value;
				}
			}
		}
	}

	return fm;
}

async function walkMdx(dir: string): Promise<string[]> {
	const out: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await walkMdx(abs)));
		} else if (entry.isFile() && /\.(mdx|md)$/i.test(entry.name)) {
			out.push(abs);
		}
	}
	return out;
}

export async function walkAndGroup(
	sourceRoot: string,
	docsRoot: string,
	siteBase: string,
): Promise<Manifest> {
	const docsAbs = path.isAbsolute(docsRoot) ? docsRoot : path.join(sourceRoot, docsRoot);
	const docsRootRel = path.relative(sourceRoot, docsAbs);

	let docsStat: Awaited<ReturnType<typeof stat>>;
	try {
		docsStat = await stat(docsAbs);
	} catch {
		throw new Error(`docsRoot does not exist: ${docsAbs}`);
	}
	if (!docsStat.isDirectory()) {
		throw new Error(`docsRoot is not a directory: ${docsAbs}`);
	}

	const absFiles = await walkMdx(docsAbs);

	const docFiles: DocFile[] = [];
	let starlightCount = 0;
	for (const abs of absFiles) {
		const content = await readFile(abs, "utf8");
		const frontmatter = parseFrontmatter(content);
		if (frontmatter.sidebar?.order !== undefined) starlightCount++;

		const relFromDocsRoot = path.relative(docsAbs, abs);
		const firstSeg = relFromDocsRoot.split(path.sep)[0];
		const isFlat = !relFromDocsRoot.includes(path.sep);
		const group = isFlat ? "core" : firstSeg;

		// Walker invariant: relPath should start with docsRoot's last segment or be below it
		const relPathPosix = relFromDocsRoot.split(path.sep).join("/");
		const docsRootLastSeg = path.basename(docsRootRel);
		const relPathFromDocsRootParent = `${docsRootLastSeg}/${relPathPosix}`;
		if (!relPathFromDocsRootParent.startsWith(`${docsRootLastSeg}/`)) {
			throw new Error(
				`Walker invariant violated: ${relPathPosix} does not live under ${docsRootLastSeg}`,
			);
		}

		docFiles.push({
			relPath: relPathPosix,
			group,
			frontmatter,
		});
	}

	if (absFiles.length > 0 && starlightCount === 0) {
		throw new Error(
			`docs-to-skill v1 requires Starlight-format MDX. No \`sidebar.order\` frontmatter found in ${absFiles.length} files.`,
		);
	}

	// Group + sort
	const groupMap = new Map<string, DocFile[]>();
	for (const f of docFiles) {
		const arr = groupMap.get(f.group) ?? [];
		arr.push(f);
		groupMap.set(f.group, arr);
	}
	for (const [, files] of groupMap) {
		files.sort((a, b) => {
			const ao = a.frontmatter.sidebar?.order ?? Number.POSITIVE_INFINITY;
			const bo = b.frontmatter.sidebar?.order ?? Number.POSITIVE_INFINITY;
			if (ao !== bo) return ao - bo;
			return a.relPath.localeCompare(b.relPath);
		});
	}

	const groups = [...groupMap.entries()]
		.map(([name, files]) => ({ name, files }))
		.sort((a, b) => a.name.localeCompare(b.name));

	return { siteBase, docsRoot: docsRootRel, groups };
}

/**
 * CLI entry. Used by content-to-skill.md Steps 2D and 3D.
 *   --input <github-shorthand-or-url>
 *   --working-dir <path>
 *   --site-base <url>
 *   --docs-root <path>
 *   [--skip-fetch]   useful in tests / for re-running walk
 */
async function main(argv: string[]): Promise<void> {
	const args = new Map<string, string>();
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith("--")) {
			const next = argv[i + 1];
			if (next === undefined || next.startsWith("--")) {
				args.set(a.slice(2), "true");
			} else {
				args.set(a.slice(2), next);
				i++;
			}
		}
	}

	const inputRaw = args.get("input");
	const workingDir = args.get("working-dir");
	const siteBase = args.get("site-base");
	const docsRootArg = args.get("docs-root") ?? "docs";

	if (!inputRaw || !workingDir || !siteBase) {
		console.error(
			"Usage: fetch_docs_repo.ts --input <github:...|https://github.com/...> --working-dir <path> --site-base <url> [--docs-root <path>] [--skip-fetch]",
		);
		process.exit(1);
	}

	await mkdir(workingDir, { recursive: true });
	const input = parseInput(inputRaw);

	let sourceRoot: string;
	let defaultRef: string;
	if (args.get("skip-fetch") === "true") {
		sourceRoot = path.join(workingDir, "source");
		defaultRef = input.ref ?? "HEAD";
	} else {
		const result = await fetchDocsRepo(input, workingDir);
		sourceRoot = result.sourceRoot;
		defaultRef = result.defaultRef;
	}

	const docsRoot = input.path ?? docsRootArg;
	const manifest = await walkAndGroup(sourceRoot, docsRoot, siteBase);

	const manifestPath = path.join(workingDir, "manifest.json");
	await writeFile(manifestPath, JSON.stringify({ ref: defaultRef, ...manifest }, null, 2));
	console.log(
		`walkAndGroup: ${manifest.groups.length} groups, ${manifest.groups.reduce(
			(n, g) => n + g.files.length,
			0,
		)} files. Manifest: ${manifestPath}`,
	);
}

const isMain = (() => {
	try {
		return import.meta.url === `file://${process.argv[1]}`;
	} catch {
		return false;
	}
})();

if (isMain) {
	main(process.argv.slice(2)).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
