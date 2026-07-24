#!/usr/bin/env python3
"""category_tools.py - validate and audit the content-to-skill book library.

Checks the local library (the corpus /content-to-skill builds and /counsel reads)
against the invariants /counsel depends on. Stdlib only; no third-party deps.

Library resolution mirrors scripts/resolve-library.ts:
  CLAUDE_LIBRARY_DIR  ->  else ~/.claude/library

Commands:
  validate      Hard-fail (exit 2) on structural errors: missing `category`,
                book.json <-> index.json category drift, and books/index drift.
                Reports casing/near-duplicate categories and guaranteed-file gaps
                as WARN (they do not fail the corpus, but they are surfaced).
  guaranteed    The gate. Exit 1 if ANY book is missing
                references/core-framework.md or references/rules-of-thumb.md.
                /counsel's Stage 2 reads these when present; this is the CI hook
                that turns "when present" into "always present" once a corpus is
                clean. Run it green before relying on unconditional reads.
  audit         List each category and its book count (advisory overview).
  selftest      Feed known-bad records and assert each defect is caught.

Usage:
  python3 category_tools.py validate [--slug SLUG]
  python3 category_tools.py guaranteed [--slug SLUG]   # SLUG = one book (Step 5 hook)
  python3 category_tools.py audit
  python3 category_tools.py selftest
"""
import sys, json, glob, os
from collections import defaultdict

LIB = os.environ.get("CLAUDE_LIBRARY_DIR") or os.path.expanduser("~/.claude/library")
INDEX = os.path.join(LIB, "index.json")
BOOKS_GLOB = os.path.join(LIB, "books", "*", "book.json")
GUARANTEED = ("references/core-framework.md", "references/rules-of-thumb.md")


def _norm(s):
    return (s or "").lower().replace(" ", "").replace("&", "and").replace("-", "")


def load_books():
    out = {}
    for p in glob.glob(BOOKS_GLOB):
        with open(p) as f:
            rec = json.load(f)
        # Key by JSON `name`, falling back to the directory slug, so a malformed
        # book.json missing `name` still reaches check_record as a reported error
        # instead of crashing the whole gate with a KeyError.
        out[rec.get("name") or os.path.basename(os.path.dirname(p))] = rec
    return out


def check_record(rec, valid):
    """Hard errors for one book/index record. Pure, so selftest can drive it.

    `valid` is the set of category strings actually present in the corpus; it is
    used only for casing/near-duplicate detection (there is no external registry
    of legal categories in this single-`category` model)."""
    errors, warnings = [], []
    name = rec.get("name", "<unknown>")
    cat = rec.get("category")
    if cat is None or cat == "":
        errors.append(f"{name}: missing `category`")
        return errors, warnings
    # near-duplicate: a distinct category string that normalizes to the same key
    near = [v for v in valid if v != cat and _norm(v) == _norm(cat)]
    if near:
        warnings.append(f"{name}: category '{cat}' collides by casing/kebab with '{near[0]}'")
    return errors, warnings


def guaranteed_gaps(book_dir):
    """Return the guaranteed files missing from one book directory."""
    return [f for f in GUARANTEED if not os.path.exists(os.path.join(book_dir, f))]


def cmd_validate(slug=None):
    if not os.path.exists(INDEX):
        print(f"ERROR: no index.json at {INDEX} (set CLAUDE_LIBRARY_DIR or run /content-to-skill)")
        return 2
    books = load_books()
    index = {b.get("name"): b for b in json.load(open(INDEX)).get("books", [])}
    valid = {b.get("category") for b in books.values() if b.get("category")}

    if slug is not None:
        if slug not in books:
            print(f"ERROR {slug}: no book.json with name == '{slug}' under books/")
            return 2
        targets = {slug: books[slug]}
    else:
        targets = books

    errors, warnings = [], []
    for name, rec in targets.items():
        e, w = check_record(rec, valid)
        errors += e
        warnings += w
        # book.json <-> index.json category drift ("updated one, forgot the other")
        if name not in index:
            warnings.append(f"{name}: in books/ but not in index.json (regenerate manifest)")
        elif index[name].get("category") != rec.get("category"):
            errors.append(f"{name}: category differs between book.json and index.json "
                          f"('{rec.get('category')}' vs '{index[name].get('category')}')")
        # guaranteed-file coverage (WARN here; `guaranteed` command is the hard gate)
        book_dir = os.path.join(LIB, "books", name)
        for f in guaranteed_gaps(book_dir):
            warnings.append(f"{name}: missing guaranteed file {f} (/counsel Stage 2 falls back)")

    if slug is None:
        for iname in index:  # reverse drift: index entry with no book directory
            if iname not in books:
                warnings.append(f"{iname}: in index.json but no books/ directory (stale manifest)")

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    if errors:
        print(f"\nvalidate: FAIL ({len(errors)} error(s), {len(warnings)} warning(s))")
        return 2
    print(f"validate: PASS ({len(targets)} book(s), {len(warnings)} warning(s))")
    return 0


def cmd_guaranteed(slug=None):
    """The gate: exit non-zero if any book lacks a guaranteed file.

    With --slug, check just that one book (the Step 5 self-verify hook the
    conversion methodology calls at generation time)."""
    if slug is not None:
        d = os.path.join(LIB, "books", slug)
        if not os.path.isdir(d):
            print(f"ERROR {slug}: no books/{slug} directory under {LIB}")
            return 2
        dirs = [d]
    else:
        dirs = sorted(glob.glob(os.path.join(LIB, "books", "*")))
        dirs = [d for d in dirs if os.path.isdir(d)]
    missing = []
    for d in dirs:
        for f in guaranteed_gaps(d):
            missing.append(f"{os.path.basename(d)}/{f}")
    have = len(dirs) - len({m.split('/')[0] for m in missing})
    print(f"guaranteed-file coverage: {have}/{len(dirs)} books complete "
          f"({len(missing)} missing file(s))")
    for m in missing:
        print(f"  MISSING {m}")
    if missing:
        print(f"\nguaranteed: FAIL ({len(missing)} missing) — /counsel Stage 2 must "
              f"stay conditional until this is green")
        return 1
    print("\nguaranteed: PASS — every book has core-framework.md and rules-of-thumb.md")
    return 0


def cmd_audit():
    books = load_books()
    counts = defaultdict(int)
    for b in books.values():
        counts[b.get("category") or "<none>"] += 1
    print("=== categories in the corpus ===")
    for c, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"  {n:4d}  {c}")
    print(f"\n{len(books)} books across {len(counts)} categories")
    return 0


def cmd_selftest():
    valid = {"Writing", "Change & Adoption"}
    cases = [
        ({"name": "ok", "category": "Writing"}, 0),
        ({"name": "missing-cat"}, 1),
        ({"name": "empty-cat", "category": ""}, 1),
    ]
    ok = True
    for rec, want_err in cases:
        errs, _ = check_record(rec, valid)
        got = 1 if errs else 0
        status = "ok" if got == want_err else "FAIL"
        if got != want_err:
            ok = False
        print(f"  [{status}] {rec.get('name'):14s} expected_error={want_err} got={got}  {errs}")
    # near-duplicate casing warning must fire
    _, w = check_record({"name": "x", "category": "writing"}, valid)
    if any("collides" in m for m in w):
        print("  [ok] near-duplicate casing warning fires")
    else:
        ok = False
        print("  [FAIL] near-duplicate casing warning did not fire")
    print("\nselftest: PASS" if ok else "\nselftest: FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "validate"
    arg = None
    if "--slug" in sys.argv:
        i = sys.argv.index("--slug")
        if i + 1 >= len(sys.argv):
            print("ERROR: --slug requires a value")
            sys.exit(2)
        arg = sys.argv[i + 1]
    dispatch = {
        "validate": lambda: cmd_validate(arg),
        "guaranteed": lambda: cmd_guaranteed(arg),
        "audit": cmd_audit,
        "selftest": cmd_selftest,
    }
    if cmd not in dispatch:
        print(f"unknown command: {cmd}")
        sys.exit(2)
    sys.exit(dispatch[cmd]())
