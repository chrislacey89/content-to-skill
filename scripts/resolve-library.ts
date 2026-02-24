import os from "node:os";
import path from "node:path";

export function resolveLibraryDir(): string {
	if (process.env.CLAUDE_LIBRARY_DIR) return process.env.CLAUDE_LIBRARY_DIR;
	return path.join(os.homedir(), ".claude", "library");
}

export function resolveBooksDir(): string {
	return path.join(resolveLibraryDir(), "books");
}
