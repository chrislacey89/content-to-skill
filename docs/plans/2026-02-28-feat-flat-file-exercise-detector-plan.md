---
title: "Add flat-file exercise detector for repos with file-based exercises"
type: feat
status: active
date: 2026-02-28
---

# Add Flat-File Exercise Detector

## Overview

The current repo pipeline only supports repos where exercises are **subdirectories** (e.g., `01.problem.intro/` containing files). Some workshop repos use a different structure where exercises are **flat files** within module directories (e.g., `01-name.problem.ts`, `01-name.solution.ts`).

Add a new `flat-file` detector pattern to `detect_exercises.ts` that handles this structure, and update the downstream pipeline to work with file-based exercises instead of directory-based ones.

## Problem Statement

A flat-file workshop structure looks like:

```
src/
  01-inference-basics/
    00-intro.explainer.ts
    01-get-function-return-type.problem.ts
    01-get-function-return-type.solution.ts
    01.5-gabriel-typeof-keyword.explainer.ts
    02-get-function-parameters.problem.ts
    02-get-function-parameters.solution.ts
  02-unions-and-indexing/
    05-terminology.problem.ts
    05-terminology.solution.ts
    ...
```

Key differences from existing detectors:
- Exercises are **files**, not **directories**
- File naming: `NN-slug.problem.ts` / `NN-slug.solution.ts`
- Decimal numbering supported: `01.5`, `20.1`
- Multiple solutions: `.solution.1.ts`, `.solution.2.ts`
- Explainer files: `.explainer.ts` (teaching content, no problem/solution pair)
- Global exercise numbering across modules (not per-module)
- No subdirectory per exercise — no file lists or TODO marker counts within exercise dirs

## Proposed Solution

### 1. Add `flat-file` detector to `detect_exercises.ts`

**New detector**: `flat-file` pattern that scans files within module directories instead of subdirectories.

```typescript
// scripts/detect_exercises.ts

"flat-file": {
    name: "Flat file (NN-slug.role.ts)",
    isModule(entry: string): boolean {
        return /^\d+[\.\-]/.test(entry);
    },
    // New: parse exercise from filename instead of dirname
    parseExercise(fileName: string): ExerciseInfo | null {
        // Match: 01-slug.problem.ts, 01.5-slug.solution.ts,
        //        20.1-slug.solution.1.ts
        const m = fileName.match(
            /^(\d+(?:\.\d+)?)-(.+)\.(problem|solution(?:\.\d+)?)\.(\w+)$/
        );
        if (!m) return null;
        return {
            number: Number.parseFloat(m[1]),
            role: m[3].startsWith("solution") ? "solution" : "problem",
            slug: m[2],
        };
    },
},
```

### 2. Adapt core detection for flat-file mode

The current `detectExercises()` function assumes exercises are **subdirectories** with files inside them. For flat-file mode, exercises are **files** within the module directory.

Key changes needed in `detectExercises()`:

- When detector is `flat-file`, scan **files** in each module dir (not subdirs)
- Group files by exercise number into problem/solution pairs
- The `ExerciseSide` type needs adapting — instead of `dir`, `path`, `files[]`, and `todoMarkers`, a flat-file exercise has individual file paths
- Handle `.explainer.ts` files — capture them as metadata (optional, useful for extraction)
- Handle multiple solutions (`.solution.1.ts`, `.solution.2.ts`) — pick primary or collect all

**Manifest output differences for flat-file:**

```json
{
  "exercises": [{
    "id": "01.01",
    "number": 1,
    "slug": "get-function-return-type",
    "problem": {
      "dir": null,
      "path": "/abs/path/to/01-inference-basics",
      "files": ["01-get-function-return-type.problem.ts"],
      "todoMarkers": 0
    },
    "solution": {
      "dir": null,
      "path": "/abs/path/to/01-inference-basics",
      "files": [
        "01-get-function-return-type.solution.ts"
      ]
    },
    "explainer": null,
    "readme": null
  }]
}
```

The manifest shape stays the same — `problem.files` and `solution.files` contain filenames, `problem.path` and `solution.path` point to the module directory. This keeps downstream pipeline steps (2R-6R) compatible without changes.

### 3. Add auto-detection for flat-file pattern

Update `autoDetectPattern()` to check for flat-file repos:

```typescript
// After checking numbered-dotted and before generic
for (const dir of dirs) {
    const files = listFiles(join(repoDir, dir));
    for (const file of files) {
        if (/^\d+(?:\.\d+)?-.+\.problem\.\w+$/.test(file)) return "flat-file";
    }
}
```

### 4. Update command references

- `commands/content-to-skill.md`: Add `flat-file` to `--pattern` options
- CLI help text in `detect_exercises.ts`: Add `flat-file` to pattern list

## Acceptance Criteria

- [ ] New `flat-file` detector in `scripts/detect_exercises.ts`
- [ ] Auto-detection recognizes flat-file repos
- [ ] Manifest output is compatible with existing pipeline steps 2R-6R
- [ ] Running against a flat-file workshop repo produces a valid manifest
- [ ] Multiple solution files (`.solution.1.ts`) are captured
- [ ] Decimal-numbered exercises (`01.5`, `20.1`) are handled
- [ ] `commands/content-to-skill.md` argument hint updated
- [ ] `npm run check` passes

## Context

### Existing patterns in codebase

- `scripts/detect_exercises.ts` — pluggable detector registry (`DETECTORS` record)
- Two existing detectors: `numbered-dotted` and `generic` — both assume subdirectory-based exercises
- `ExerciseSide` type: `{ dir, path, files[], todoMarkers }`
- Manifest consumed by Steps 2R-6R which read `exercise.problem.path` + `exercise.problem.files`

### Files to modify

| File | Change |
|------|--------|
| `scripts/detect_exercises.ts` | Add `flat-file` detector, adapt `detectExercises()`, update auto-detect, update help text |
| `commands/content-to-skill.md` | Add `flat-file` to `--pattern` argument hint and options table |

### MVP

The minimal implementation focuses on:
1. Adding the detector pattern
2. Making `detectExercises()` branch on flat-file vs directory-based
3. Producing a compatible manifest

No changes needed to Steps 2R-6R — the subagent prompts already use `exercise.problem.path` + `exercise.problem.files` to read files, which works whether the path is a subdirectory or the parent module directory.
