#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

// --- Types ---

interface ExerciseInfo {
	number: number;
	role: "problem" | "solution";
	slug: string;
}

interface ExerciseSide {
	dir: string;
	path: string;
	files: string[];
	todoMarkers: number;
}

interface Exercise {
	id: string;
	number: number;
	slug: string;
	problem: ExerciseSide;
	solution: ExerciseSide;
	readme: string | null;
}

interface Module {
	number: number;
	name: string;
	dir: string;
	path: string;
	readme: string | null;
	exerciseCount: number;
	exercises: Exercise[];
}

interface Manifest {
	version: number;
	repoPath: string;
	detectorUsed: string;
	detectedAt: string;
	summary: {
		moduleCount: number;
		exerciseCount: number;
	};
	modules: Module[];
}

interface Detector {
	name: string;
	isModule(entry: string): boolean;
	parseExercise(dirName: string): ExerciseInfo | null;
}

// --- Detector registry ---

const DETECTORS: Record<string, Detector> = {
	"numbered-dotted": {
		name: "Numbered dotted (NN.role.slug)",
		isModule(entry: string): boolean {
			return /^\d{2}\./.test(entry);
		},
		parseExercise(dirName: string): ExerciseInfo | null {
			const m = dirName.match(/^(\d{2})\.(problem|solution)\.(.+)$/);
			if (!m) return null;
			return {
				number: Number.parseInt(m[1], 10),
				role: m[2] as "problem" | "solution",
				slug: m[3],
			};
		},
	},
	generic: {
		name: "Generic (problem/solution naming)",
		isModule(entry: string): boolean {
			return /^\d+[.\-_]/.test(entry);
		},
		parseExercise(dirName: string): ExerciseInfo | null {
			const m = dirName.match(/^(\d+)[.\-_](problem|solution)[.\-_](.+)$/);
			if (!m) return null;
			return {
				number: Number.parseInt(m[1], 10),
				role: m[2] as "problem" | "solution",
				slug: m[3],
			};
		},
	},
};

// --- Utility functions ---

function isDirectory(fullPath: string): boolean {
	try {
		return statSync(fullPath).isDirectory();
	} catch {
		return false;
	}
}

function listDirs(parentDir: string): string[] {
	return readdirSync(parentDir)
		.filter((entry) => isDirectory(join(parentDir, entry)))
		.sort();
}

function listFilesRecursive(dir: string, basePath?: string): string[] {
	basePath = basePath ?? dir;
	const results: string[] = [];

	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const relativePath = relative(basePath, fullPath);

		if (entry === "node_modules" || entry === ".git") continue;

		if (statSync(fullPath).isDirectory()) {
			results.push(...listFilesRecursive(fullPath, basePath));
		} else {
			results.push(relativePath);
		}
	}

	return results;
}

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function countTodoMarkers(dir: string): number {
	let count = 0;
	const files = listFilesRecursive(dir);

	for (const relPath of files) {
		const fullPath = join(dir, relPath);
		const ext = extname(relPath).toLowerCase();
		if (!CODE_EXTENSIONS.has(ext)) continue;

		try {
			const content = readFileSync(fullPath, "utf8");
			const markers = content.match(/🐨|💰|TODO|FIXME/g);
			if (markers) count += markers.length;
		} catch {
			// skip unreadable files
		}
	}

	return count;
}

function findReadme(dir: string): string | null {
	const candidates = ["README.mdx", "README.md", "readme.md", "readme.mdx"];
	for (const name of candidates) {
		const full = join(dir, name);
		if (existsSync(full)) return full;
	}
	return null;
}

// --- Core detection ---

function detectExercises(repoDir: string, detectorName: string): Module[] {
	const detector = DETECTORS[detectorName];
	if (!detector) {
		throw new Error(
			`Unknown detector: ${detectorName}. Available: ${Object.keys(DETECTORS).join(", ")}`,
		);
	}

	if (!existsSync(repoDir) || !statSync(repoDir).isDirectory()) {
		throw new Error(`Directory not found: ${repoDir}`);
	}

	const modules: Module[] = [];
	const moduleDirs = listDirs(repoDir).filter((d) => detector.isModule(d));

	for (const moduleDir of moduleDirs) {
		const modulePath = join(repoDir, moduleDir);
		const moduleReadme = findReadme(modulePath);

		const moduleMatch = moduleDir.match(/^(\d+)[.\-_](.+)$/);
		if (!moduleMatch) continue;

		const moduleNumber = Number.parseInt(moduleMatch[1], 10);
		const moduleName = moduleMatch[2];

		const exerciseDirs = listDirs(modulePath);
		const parsed: Array<ExerciseInfo & { dirName: string; fullPath: string }> = [];

		for (const exDir of exerciseDirs) {
			const info = detector.parseExercise(exDir);
			if (info) {
				parsed.push({
					...info,
					dirName: exDir,
					fullPath: join(modulePath, exDir),
				});
			}
		}

		// Group by exercise number
		const exerciseMap = new Map<
			number,
			{
				number: number;
				slug: string;
				problem?: { dir: string; path: string; files: string[]; todoMarkers: number };
				solution?: { dir: string; path: string; files: string[] };
			}
		>();

		for (const p of parsed) {
			if (!exerciseMap.has(p.number)) {
				exerciseMap.set(p.number, { number: p.number, slug: p.slug });
			}
			const entry = exerciseMap.get(p.number)!;
			if (p.role === "problem") {
				entry.problem = {
					dir: p.dirName,
					path: p.fullPath,
					files: listFilesRecursive(p.fullPath),
					todoMarkers: countTodoMarkers(p.fullPath),
				};
			} else {
				entry.solution = {
					dir: p.dirName,
					path: p.fullPath,
					files: listFilesRecursive(p.fullPath),
				};
			}
		}

		const exercises: Exercise[] = [];
		for (const [, ex] of [...exerciseMap.entries()].sort((a, b) => a[0] - b[0])) {
			if (!ex.problem || !ex.solution) continue;

			const exerciseReadme = findReadme(ex.problem.path);

			exercises.push({
				id: `${String(moduleNumber).padStart(2, "0")}.${String(ex.number).padStart(2, "0")}`,
				number: ex.number,
				slug: ex.slug,
				problem: {
					dir: ex.problem.dir,
					path: ex.problem.path,
					files: ex.problem.files,
					todoMarkers: ex.problem.todoMarkers,
				},
				solution: {
					dir: ex.solution.dir,
					path: ex.solution.path,
					files: ex.solution.files,
				},
				readme: exerciseReadme,
			});
		}

		modules.push({
			number: moduleNumber,
			name: moduleName,
			dir: moduleDir,
			path: modulePath,
			readme: moduleReadme,
			exerciseCount: exercises.length,
			exercises,
		});
	}

	return modules;
}

function autoDetectPattern(repoDir: string): string | null {
	const dirs = listDirs(repoDir);
	for (const dir of dirs) {
		const subdirs = listDirs(join(repoDir, dir));
		for (const sub of subdirs) {
			if (/^\d{2}\.problem\./.test(sub)) return "numbered-dotted";
		}
	}
	for (const dir of dirs) {
		const subdirs = listDirs(join(repoDir, dir));
		for (const sub of subdirs) {
			if (/^\d+[.\-_]problem[.\-_]/.test(sub)) return "generic";
		}
	}
	return null;
}

function buildManifest(repoDir: string, modules: Module[], detectorName: string): Manifest {
	const totalExercises = modules.reduce((sum, m) => sum + m.exerciseCount, 0);

	return {
		version: 1,
		repoPath: resolve(repoDir),
		detectorUsed: detectorName,
		detectedAt: new Date().toISOString(),
		summary: {
			moduleCount: modules.length,
			exerciseCount: totalExercises,
		},
		modules,
	};
}

// --- CLI ---

function printUsage(): void {
	console.log(`
Usage: npx tsx detect_exercises.ts <repo-exercises-dir> [options]

Options:
  -o, --output <dir>      Output directory (default: current directory)
  -p, --pattern <name>    Detector pattern: numbered-dotted, generic (default: auto-detect)
  -h, --help              Show this help message

Examples:
  npx tsx detect_exercises.ts ~/code/testing-fundamentals/exercises
  npx tsx detect_exercises.ts ~/code/testing-fundamentals/exercises -p numbered-dotted
  npx tsx detect_exercises.ts ~/code/testing-fundamentals/exercises -o /tmp/output
`);
}

function main(): void {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
		printUsage();
		process.exit(0);
	}

	let repoDir: string | null = null;
	let outputDir = ".";
	let pattern: string | null = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-o" || arg === "--output") {
			outputDir = args[++i];
		} else if (arg === "-p" || arg === "--pattern") {
			pattern = args[++i];
		} else if (!arg.startsWith("-")) {
			repoDir = arg;
		}
	}

	if (!repoDir) {
		console.error("Error: No repository exercises directory specified");
		printUsage();
		process.exit(1);
	}

	repoDir = resolve(repoDir);

	if (!existsSync(repoDir) || !statSync(repoDir).isDirectory()) {
		console.error(`Error: Directory not found: ${repoDir}`);
		process.exit(1);
	}

	if (!pattern) {
		pattern = autoDetectPattern(repoDir);
		if (!pattern) {
			console.error("Error: Could not auto-detect exercise pattern. Use -p to specify.");
			process.exit(1);
		}
		console.log(`Auto-detected pattern: ${pattern} (${DETECTORS[pattern].name})`);
	} else if (!DETECTORS[pattern]) {
		console.error(
			`Error: Unknown pattern '${pattern}'. Available: ${Object.keys(DETECTORS).join(", ")}`,
		);
		process.exit(1);
	}

	console.log(`Scanning: ${repoDir}`);
	const modules = detectExercises(repoDir, pattern);

	if (modules.length === 0) {
		console.error("Error: No modules with exercise pairs found.");
		process.exit(1);
	}

	const manifest = buildManifest(repoDir, modules, pattern);

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	const manifestPath = join(outputDir, "exercises_manifest.json");
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

	console.log(
		`\nDetected ${manifest.summary.moduleCount} modules, ${manifest.summary.exerciseCount} exercises:\n`,
	);

	for (const mod of modules) {
		console.log(`  ${mod.dir}/ (${mod.exerciseCount} exercises)`);
		for (const ex of mod.exercises) {
			const todoTag = ex.problem.todoMarkers > 0 ? ` [${ex.problem.todoMarkers} markers]` : "";
			console.log(`    ${ex.id} ${ex.slug}${todoTag}`);
		}
	}

	console.log(`\nManifest saved to: ${manifestPath}`);
}

main();
