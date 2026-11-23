#!/usr/bin/env python3
"""Step zero: tokens per character, per UTF-8 byte and per word, for each entrant's tokenizer.

Licence: FLORES-200 is CC BY-SA 4.0 (dataset card metadata, read 2026-11-22). Use here is counting only.
The ShareAlike question for any published artefact is open.
No sample text is written to any output. The outputs hold counts, identifiers, revisions and sha256 values.

The entrant list is not in this file. It is read from the --entrants file, which the person who runs the script
supplies (one "repository revision" pair per line; see README.md).

Modes (exactly one):
  --fetch        download the pinned tokenizer.json files named in --entrants, check each revision against its pin,
                 and load them with the pinned `tokenizers` library. The devtest files must already be in
                 --flores-dir (see README.md).
  --offline      no network, no library. Uses a stand-in tokenizer, and every row names it. Also --dry-run.

Outputs in --out-dir: measurements.csv (one row per entrant and language), sha256.csv (every sample and
tokenizer file read), errors.csv (one row per failure). Exit status is non-zero whenever errors.csv has a row.
"""
import argparse
import csv
import hashlib
import json
import sys
import types
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

DEVTEST_SUFFIX = ".devtest"
SAMPLE_LIMIT = 100
HERE = Path(__file__).resolve().parent
WORD_LIST = HERE / "word-separated-languages.txt"
SAMPLES_DIR = HERE / "samples"
OUT_DIR = HERE / "out"
HUB = "https://huggingface.co"
TIMEOUT_S = 60
STANDIN_NAME = "STAND-IN: whitespace and non-ASCII code-point splitter (offline, not a real tokenizer)"
PINNED_NAME = "tokenizer.json at the pinned revision"
MEASURE_COLUMNS = [
    "entrant", "revision_pinned", "revision_returned", "tokenizer", "language", "sentences",
    "characters", "utf8_bytes", "tokens", "tokens_per_char", "tokens_per_byte", "tokens_per_word", "word_unit",
]
ERROR_COLUMNS = ["entrant", "language", "stage", "message"]
SHA_COLUMNS = ["kind", "path", "sha256", "bytes"]
WORD_UNITS = ("word", "syllable")


def load_entrants(path):
    """Read the entrant list: one 'repository revision' pair per line. Blank lines and '#' comments are skipped."""
    pairs = []
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        fields = text.split()
        if len(fields) != 2:
            raise ValueError(f"{path}:{number}: expected 'repository revision', got {len(fields)} field(s)")
        pairs.append((fields[0], fields[1]))
    if not pairs:
        raise ValueError(f"{path}: no entrants listed")
    return pairs


def separated_languages(path=WORD_LIST):
    """Map of language code to its word unit ("word" or "syllable"), read from the list file.
    Raises FileNotFoundError when the list is missing and ValueError on a malformed line."""
    units = {}
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        fields = text.split()
        if len(fields) != 2 or fields[1] not in WORD_UNITS:
            raise ValueError(f"{path}:{number}: expected 'language word' or 'language syllable', got {text!r}")
        units[fields[0]] = fields[1]
    return units


def text_sizes(text):
    """Unicode code points and UTF-8 bytes of one string."""
    return len(text), len(text.encode("utf-8"))


def words_for(language, lines, separated=None):
    """Whitespace-separated word count, or None where the language does not separate words with spaces."""
    if separated is None:
        separated = separated_languages()
    if language not in separated:
        return None
    return sum(len(line.split()) for line in lines)


def cell(value):
    """The CSV cell: None is 'not measured', never 0."""
    return "not measured" if value is None else str(value)


def ids_of(tokenizer, text):
    encoded = tokenizer.encode(text)
    return encoded.ids if hasattr(encoded, "ids") else encoded


def measurement_row(entrant, revision_pinned, revision_returned, tokenizer_source, language, lines,
                    tokenize, separated=None):
    chars = utf8 = tokens = 0
    for line in lines:
        c, b = text_sizes(line)
        chars += c
        utf8 += b
        tokens += len(tokenize(line))
    if chars == 0:
        raise ValueError("empty sample")
    units = separated_languages() if separated is None else separated
    words = words_for(language, lines, units)
    if words == 0:
        raise ValueError("no words in a space-separated sample")
    return {
        "entrant": entrant, "revision_pinned": revision_pinned, "revision_returned": revision_returned,
        "tokenizer": tokenizer_source, "language": language, "sentences": len(lines),
        "characters": chars, "utf8_bytes": utf8, "tokens": tokens,
        "tokens_per_char": f"{tokens / chars:.6f}", "tokens_per_byte": f"{tokens / utf8:.6f}",
        "tokens_per_word": cell(None if words is None else f"{tokens / words:.6f}"),
        "word_unit": cell(units.get(language)),
    }


def read_sample(path, limit=SAMPLE_LIMIT):
    lines = [line for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]
    return lines[:limit]


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


class StandIn:
    """Offline stand-in. Each whitespace word is split into runs of ASCII, and each non-ASCII code point is one token.
    It is NOT a real tokenizer. Every row that uses it says so."""

    def encode(self, text):
        ids = []
        for word in text.split():
            run = ""
            for ch in word:
                if ord(ch) < 128:
                    run += ch
                else:
                    if run:
                        ids.append(run)
                        run = ""
                    ids.append(ch)
            if run:
                ids.append(run)
        return types.SimpleNamespace(ids=ids)

    def no_truncation(self):
        return None

    def no_padding(self):
        return None


@dataclass
class Result:
    rows: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    shas: list = field(default_factory=list)

    @property
    def exit_code(self):
        return 1 if self.errors else 0


def check_complete(result, entrants, languages):
    """Fail loud when measurement rows plus error rows do not cover every entrant and language."""
    expected = len(entrants) * len(languages)
    if len(result.rows) + len(result.errors) != expected:
        raise RuntimeError(f"row count {len(result.rows) + len(result.errors)} != entrants x languages {expected}")


def run(entrants, languages, flores_dir, tok_for, out_dir, limit=SAMPLE_LIMIT, separated=None):
    """Measure every (entrant, language). Each pair becomes a measurement row or an error row, never neither."""
    result = Result()

    def fail(entrant_repo, language, stage, message):
        result.errors.append({"entrant": entrant_repo, "language": language, "stage": stage, "message": message})

    samples = {}
    for language in languages:
        path = Path(flores_dir) / (language + DEVTEST_SUFFIX)
        if not path.is_file():
            samples[language] = (None, "missing sample file")
            continue
        try:
            samples[language] = (read_sample(path, limit), None)
            result.shas.append({"kind": "sample", "path": path.name, "sha256": sha256_file(path),
                                "bytes": path.stat().st_size})
        except (OSError, UnicodeDecodeError) as exc:
            samples[language] = (None, f"sample did not read: {type(exc).__name__}")

    for repo, pinned in entrants:
        tokenizer, returned, tok_sha, tok_error = tok_for((repo, pinned))
        if tok_sha:
            result.shas.append({"kind": "tokenizer", "path": repo, "sha256": tok_sha, "bytes": ""})
        for language in languages:
            lines, sample_error = samples[language]
            if sample_error:
                fail(repo, language, "sample", sample_error)
                continue
            if tok_error:
                fail(repo, language, "tokenizer", tok_error)
                continue
            source = STANDIN_NAME if isinstance(tokenizer, StandIn) else PINNED_NAME
            try:
                row = measurement_row(repo, pinned, returned, source, language, lines,
                                      lambda s, t=tokenizer: ids_of(t, s), separated)
            except ValueError as exc:
                fail(repo, language, "measure", str(exc))
                continue
            except Exception as exc:  # a tokenizer's own failure stops this pair only, never the run
                fail(repo, language, "measure", f"tokenizer raised {type(exc).__name__}")
                continue
            result.rows.append(row)

    check_complete(result, entrants, languages)
    return result


def write_outputs(result, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, columns, rows in (
        ("measurements.csv", MEASURE_COLUMNS, result.rows),
        ("sha256.csv", SHA_COLUMNS, result.shas),
        ("errors.csv", ERROR_COLUMNS, result.errors),
    ):
        with open(out_dir / name, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            writer.writerows(rows)


def offline_tok_for(entrant):
    return StandIn(), "not fetched (offline)", None, None


def load_tokenizer(path):
    """Load a saved tokenizer with truncation and padding switched off, so the count covers the whole text."""
    from tokenizers import Tokenizer
    tokenizer = Tokenizer.from_file(str(path))
    tokenizer.no_truncation()
    tokenizer.no_padding()
    return tokenizer


def fetch_tok_for(out_dir):
    def tok_for(entrant):
        repo, pinned = entrant
        try:
            with urllib.request.urlopen(f"{HUB}/api/models/{repo}/revision/{pinned}", timeout=TIMEOUT_S) as r:
                returned = json.load(r)["sha"]
        except Exception as exc:  # any network or parse failure becomes one named error row
            return None, None, None, f"revision lookup failed: {type(exc).__name__}"
        if not returned.startswith(pinned):
            return None, returned, None, f"revision mismatch: pinned {pinned}, returned {returned}"
        dest = Path(out_dir) / "tokenizers" / repo.replace("/", "__") / "tokenizer.json"
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(f"{HUB}/{repo}/resolve/{returned}/tokenizer.json", timeout=TIMEOUT_S) as r:
                dest.write_bytes(r.read())
            tok_sha = sha256_file(dest)
        except Exception as exc:
            return None, returned, None, f"tokenizer download failed: {type(exc).__name__}"
        try:
            tokenizer = load_tokenizer(dest)
        except ImportError:
            return None, returned, tok_sha, "tokenizers library not installed"
        except Exception as exc:
            return None, returned, tok_sha, f"tokenizer did not load: {type(exc).__name__}"
        return tokenizer, returned, tok_sha, None
    return tok_for


def build_parser():
    p = argparse.ArgumentParser(description="Tokens per character, per UTF-8 byte and per word, per entrant and language. Counting only.")
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--fetch", action="store_true", help="run on the VM: download and check the pinned tokenizers")
    mode.add_argument("--offline", "--dry-run", dest="offline", action="store_true",
                      help="no network, no library: stand-in tokenizer, named in every row")
    p.add_argument("--entrants", help="required: file of 'repository revision' pairs, one per line (the list is supplied by the person who runs the script)")
    p.add_argument("--flores-dir", help="folder of <lang>.devtest files (default in --offline: samples/)")
    p.add_argument("--languages", help="comma list of language codes; required with --fetch (every FLORES-200 devtest code); "
                                       "with --offline, default: every .devtest file in samples/")
    p.add_argument("--out-dir", default=str(OUT_DIR), help="where the three output files go")
    p.add_argument("--limit", type=int, default=SAMPLE_LIMIT, help="sentences per language (default 100)")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    if not args.entrants:
        print("error: --entrants FILE is required (one 'repository revision' pair per line)", file=sys.stderr)
        return 2
    try:
        entrants = load_entrants(args.entrants)
    except (OSError, ValueError) as exc:
        print(f"error: --entrants: {exc}", file=sys.stderr)
        return 2
    flores_dir = args.flores_dir or (str(SAMPLES_DIR) if args.offline else None)
    if flores_dir is None:
        print("error: --flores-dir is required with --fetch", file=sys.stderr)
        return 2
    if not args.offline and not args.languages:
        print("error: --languages (every FLORES-200 devtest code) is required with --fetch", file=sys.stderr)
        return 2
    if args.languages:
        languages = [c.strip() for c in args.languages.split(",") if c.strip()]
    else:
        languages = sorted(p.name[: -len(DEVTEST_SUFFIX)] for p in Path(flores_dir).glob("*" + DEVTEST_SUFFIX))
    if not languages:
        print(f"error: no {DEVTEST_SUFFIX} files in {flores_dir}", file=sys.stderr)
        return 1
    try:
        separated = separated_languages()
    except FileNotFoundError:
        print(f"error: word list missing: {WORD_LIST}", file=sys.stderr)
        return 1
    tok_for = offline_tok_for if args.offline else fetch_tok_for(args.out_dir)
    result = run(entrants, languages, flores_dir, tok_for, args.out_dir, args.limit, separated)
    write_outputs(result, args.out_dir)
    for err in result.errors:
        print(f"ERROR {err['entrant']} {err['language']} {err['stage']}: {err['message']}", file=sys.stderr)
    mode = "offline (stand-in tokenizer)" if args.offline else "fetch (pinned tokenizers)"
    print(f"mode={mode} languages={len(languages)} rows={len(result.rows)} errors={len(result.errors)} out={args.out_dir}")
    return result.exit_code


if __name__ == "__main__":
    sys.exit(main())
