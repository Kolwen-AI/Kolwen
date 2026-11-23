"""Tests for measure.py (step zero). Standard library only: run with `python -m unittest` in this folder.

Counting only. No FLORES text is written here; the samples are written in these tests or are the two original files in samples/.
"""
import io
import subprocess
import sys
import tempfile
import types
from pathlib import Path
from unittest import TestCase, main, mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import measure  # noqa: E402

# Non-Latin test strings are built from code points, so this source holds only ASCII.
# The reply-language gate reads non-Latin characters in a .py file as a hard-coded reply.
THAI_SAWASDEE = "".join(chr(c) for c in (0x0E2A, 0x0E27, 0x0E31, 0x0E2A, 0x0E14, 0x0E35))
THAI_SAWASDEE_KRAB = THAI_SAWASDEE + "".join(chr(c) for c in (0x0E04, 0x0E23, 0x0E31, 0x0E1A))
JAPANESE_KONNICHIWA = "".join(chr(c) for c in (0x3053, 0x3093, 0x306B, 0x3061, 0x306F))




class _FakeTokenizer:
    """Counts one token per code point; the tests only need a fixed, known count."""

    def encode(self, text):
        return [0] * len(text)


class CountingTests(TestCase):
    def test_thai_code_points_and_utf8_bytes(self):
        # Thai letters are 3 bytes each in UTF-8: 6 code points, 18 bytes.
        self.assertEqual(measure.text_sizes(THAI_SAWASDEE), (6, 18))

    def test_japanese_code_points_and_utf8_bytes(self):
        # Hiragana are 3 bytes each: 5 code points, 15 bytes.
        self.assertEqual(measure.text_sizes(JAPANESE_KONNICHIWA), (5, 15))

    def test_combining_mark_counts_as_its_own_code_point(self):
        # "e" then U+0301 combining acute: 2 code points, 1 + 2 bytes.
        self.assertEqual(measure.text_sizes("e" + chr(0x0301)), (2, 3))

    def test_emoji_is_one_code_point_four_bytes(self):
        self.assertEqual(measure.text_sizes(chr(0x1F600)), (1, 4))


class WordCountTests(TestCase):
    def test_space_separated_language_counts_words(self):
        self.assertEqual(measure.words_for("eng_Latn", ["one two three", "four"]), 4)

    def test_unlisted_language_is_not_measured_not_zero(self):
        self.assertIsNone(measure.words_for("tha_Thai", [THAI_SAWASDEE_KRAB]))

    def test_cell_renders_none_as_not_measured(self):
        self.assertEqual(measure.cell(None), "not measured")
        self.assertEqual(measure.cell(0), "0")


class RowTests(TestCase):
    def test_thai_row_has_not_measured_words_and_real_ratios(self):
        row = measure.measurement_row(
            entrant="x/y", revision_pinned="abc", revision_returned="abc",
            tokenizer_source="STAND-IN", language="tha_Thai",
            lines=[THAI_SAWASDEE], tokenize=list,
        )
        self.assertEqual(row["tokens_per_word"], "not measured")
        self.assertEqual(row["characters"], 6)
        self.assertEqual(row["utf8_bytes"], 18)
        self.assertEqual(row["tokens"], 6)


class RunTests(TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.flores = self.root / "devtest"
        self.flores.mkdir()
        self.out = self.root / "out"

    def tearDown(self):
        self.tmp.cleanup()

    def _write(self, code, lines):
        (self.flores / (code + measure.DEVTEST_SUFFIX)).write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _tok_ok(self, entrant):
        return _FakeTokenizer(), "abc123", "shaabc", None

    def test_missing_sample_file_is_a_named_error_and_nonzero_exit(self):
        self._write("eng_Latn", ["hello world"])
        result = measure.run(
            entrants=[("x/y", "abc")], languages=["eng_Latn", "tha_Thai"],
            flores_dir=self.flores, tok_for=self._tok_ok, out_dir=self.out, limit=100,
        )
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(len(result.errors), 1)
        self.assertEqual(result.errors[0]["stage"], "sample")
        self.assertEqual(result.errors[0]["language"], "tha_Thai")
        self.assertNotEqual(result.exit_code, 0)

    def test_row_count_is_entrants_times_languages_or_loud(self):
        for code in ("eng_Latn", "vie_Latn", "tha_Thai"):
            self._write(code, ["a b"])
        entrants = [("x/y", "abc"), ("p/q", "def")]
        result = measure.run(
            entrants=entrants, languages=["eng_Latn", "vie_Latn", "tha_Thai", "jpn_Jpan"],
            flores_dir=self.flores, tok_for=self._tok_ok, out_dir=self.out, limit=100,
        )
        self.assertEqual(len(result.rows) + len(result.errors), len(entrants) * 4)
        self.assertEqual(len(result.errors), 2)  # jpn_Jpan missing for both entrants

    def test_revision_mismatch_is_a_named_error_for_every_language(self):
        self._write("eng_Latn", ["a b"])

        def bad_rev(entrant):
            return None, "zzz999", None, "revision mismatch: pinned abc, returned zzz999"

        result = measure.run(
            entrants=[("x/y", "abc")], languages=["eng_Latn"],
            flores_dir=self.flores, tok_for=bad_rev, out_dir=self.out, limit=100,
        )
        self.assertEqual(result.rows, [])
        self.assertEqual(result.errors[0]["stage"], "tokenizer")
        self.assertIn("revision mismatch", result.errors[0]["message"])
        self.assertNotEqual(result.exit_code, 0)

    def test_output_files_hold_no_sample_text(self):
        self._write("eng_Latn", ["secret sentence here"])
        result = measure.run(
            entrants=[("x/y", "abc")], languages=["eng_Latn"],
            flores_dir=self.flores, tok_for=self._tok_ok, out_dir=self.out, limit=100,
        )
        measure.write_outputs(result, self.out)
        for name in ("measurements.csv", "sha256.csv", "errors.csv"):
            self.assertNotIn("secret sentence", (self.out / name).read_text(encoding="utf-8"))


class CliTests(TestCase):
    def _run(self, *args):
        return subprocess.run([sys.executable, str(HERE / "measure.py"), *args],
                              capture_output=True, text=True, encoding="utf-8")

    def test_help_exits_zero_and_names_both_modes(self):
        r = self._run("--help")
        self.assertEqual(r.returncode, 0)
        self.assertIn("--offline", r.stdout)
        self.assertIn("--fetch", r.stdout)

    def test_unknown_flag_is_an_error(self):
        r = self._run("--bogus")
        self.assertEqual(r.returncode, 2)

    def test_a_mode_is_required(self):
        r = self._run()
        self.assertEqual(r.returncode, 2)


class FetchModeTests(TestCase):
    def test_fetch_without_languages_refuses_before_any_network_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            flores = Path(tmp) / "devtest"
            flores.mkdir()
            (flores / ("eng_Latn" + measure.DEVTEST_SUFFIX)).write_text("a b\n", encoding="utf-8")
            with mock.patch("urllib.request.urlopen", side_effect=AssertionError("network touched")) as net:
                entrants = Path(tmp) / "entrants.txt"
                entrants.write_text("example-org/standin-a aa11bb22cc33\n", encoding="utf-8")
                code = measure.main(["--fetch", "--entrants", str(entrants), "--flores-dir", str(flores), "--out-dir", str(Path(tmp) / "out")])
            self.assertEqual(code, 2)
            net.assert_not_called()


class CompletenessTests(TestCase):
    def test_run_calls_the_completeness_check(self):
        with tempfile.TemporaryDirectory() as tmp:
            flores = Path(tmp) / "devtest"
            flores.mkdir()
            (flores / ("eng_Latn" + measure.DEVTEST_SUFFIX)).write_text("a b\n", encoding="utf-8")
            with mock.patch.object(measure, "check_complete") as check:
                measure.run(entrants=[("x/y", "abc")], languages=["eng_Latn"], flores_dir=flores,
                            tok_for=lambda e: (_FakeTokenizer(), "abc", None, None),
                            out_dir=Path(tmp) / "out", limit=100, separated={})
            check.assert_called_once()

    def test_check_complete_fails_loud_on_a_short_result(self):
        short = measure.Result(rows=[{}], errors=[])
        with self.assertRaises(RuntimeError):
            measure.check_complete(short, [("x/y", "abc"), ("p/q", "def")], ["eng_Latn", "tha_Thai"])


class EntrantTests(TestCase):
    """The real entrant list is the operator's, read from a file; the repository holds none. These tests use a stand-in list they write themselves."""

    def test_offline_refuses_without_entrants(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(measure.main(["--offline", "--out-dir", str(Path(tmp) / "out")]), 2)

    def test_fetch_refuses_without_entrants_before_any_network_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            flores = Path(tmp) / "devtest"
            flores.mkdir()
            (flores / ("eng_Latn" + measure.DEVTEST_SUFFIX)).write_text("a b\n", encoding="utf-8")
            with mock.patch("urllib.request.urlopen", side_effect=AssertionError("network touched")) as net:
                code = measure.main(["--fetch", "--flores-dir", str(flores), "--languages", "eng_Latn",
                                     "--out-dir", str(Path(tmp) / "out")])
            self.assertEqual(code, 2)
            net.assert_not_called()

    def test_load_entrants_reads_id_and_revision_and_skips_comments(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / "entrants.txt"
            f.write_text("# comment\nexample-org/standin-a aa11bb22cc33\n\nexample-org/standin-b bb22cc33dd44\n",
                         encoding="utf-8")
            self.assertEqual(measure.load_entrants(f), [("example-org/standin-a", "aa11bb22cc33"),
                                                        ("example-org/standin-b", "bb22cc33dd44")])

    def test_load_entrants_refuses_a_malformed_line(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / "entrants.txt"
            f.write_text("only-one-field\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                measure.load_entrants(f)

    def test_offline_runs_on_a_test_made_entrant_list(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / "entrants.txt"
            f.write_text("example-org/standin-a aa11bb22cc33\n", encoding="utf-8")
            out = Path(tmp) / "out"
            code = measure.main(["--offline", "--entrants", str(f), "--languages", "eng_Latn", "--out-dir", str(out)])
            self.assertEqual(code, 0)
            self.assertEqual(len((out / "measurements.csv").read_text(encoding="utf-8").splitlines()), 2)



class _RecordingTokenizer:
    def __init__(self, path):
        self.calls = [("from_file", path)]

    def no_truncation(self):
        self.calls.append("no_truncation")

    def no_padding(self):
        self.calls.append("no_padding")


class _FakeTokenizerClass:
    @staticmethod
    def from_file(path):
        return _RecordingTokenizer(path)


class LoadTokenizerTests(TestCase):
    def test_real_tokenizer_path_turns_off_truncation_and_padding(self):
        fake = types.ModuleType("tokenizers")
        fake.Tokenizer = _FakeTokenizerClass
        with mock.patch.dict(sys.modules, {"tokenizers": fake}):
            tok = measure.load_tokenizer("x.json")
        self.assertEqual(tok.calls, [("from_file", "x.json"), "no_truncation", "no_padding"])


class TokenizerFailureTests(TestCase):
    def test_a_tokenizer_exception_stops_one_pair_not_the_run(self):
        class FlakyTokenizer:
            def encode(self, text):
                if "boom" in text:
                    raise RuntimeError("unknown token")
                return types.SimpleNamespace(ids=text.split())

        with tempfile.TemporaryDirectory() as tmp:
            flores = Path(tmp) / "devtest"
            flores.mkdir()
            (flores / "eng_Latn.devtest").write_text("fine words\nboom here\n", encoding="utf-8")
            (flores / "tha_Thai.devtest").write_text("fine words\n", encoding="utf-8")
            out = Path(tmp) / "out"
            result = measure.run(
                entrants=[("x/y", "abc")], languages=["eng_Latn", "tha_Thai"], flores_dir=flores,
                tok_for=lambda e: (FlakyTokenizer(), "abc", None, None), out_dir=out, limit=100,
                separated={"eng_Latn": "word"},
            )
            measure.write_outputs(result, out)
            csv_rows = (out / "measurements.csv").read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(len(result.errors), 1)
        self.assertEqual(result.errors[0]["stage"], "measure")
        self.assertEqual(result.errors[0]["language"], "eng_Latn")
        self.assertIn("RuntimeError", result.errors[0]["message"])
        self.assertNotIn("boom", result.errors[0]["message"])
        self.assertNotEqual(result.exit_code, 0)
        self.assertEqual(len(csv_rows), 2)  # header and the Thai row


class WordUnitTests(TestCase):
    def test_vietnamese_row_is_labelled_syllable(self):
        row = measure.measurement_row("x/y", "abc", "abc", "STAND-IN", "vie_Latn", ["one two"],
                                      lambda s: s.split(), {"vie_Latn": "syllable"})
        self.assertEqual(row["word_unit"], "syllable")
        self.assertEqual(row["tokens_per_word"], "1.000000")

    def test_unlisted_language_word_unit_is_not_measured(self):
        row = measure.measurement_row("x/y", "abc", "abc", "STAND-IN", "tha_Thai", ["one two"],
                                      lambda s: s.split(), {"eng_Latn": "word"})
        self.assertEqual(row["word_unit"], "not measured")
        self.assertEqual(row["tokens_per_word"], "not measured")

    def test_shipped_list_labels_vietnamese_syllable(self):
        self.assertEqual(measure.separated_languages()["vie_Latn"], "syllable")

    def test_word_list_refuses_a_unit_it_does_not_know(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / "words.txt"
            f.write_text("eng_Latn letter\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                measure.separated_languages(f)


class WordListMainTests(TestCase):
    def test_malformed_word_list_exits_one_with_a_plain_message(self):
        real = measure.separated_languages
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "words.txt"
            bad.write_text("eng_Latn letter\n", encoding="utf-8")
            entrants = Path(tmp) / "entrants.txt"
            entrants.write_text("example-org/standin-a aa11bb22cc33\n", encoding="utf-8")
            with mock.patch.object(measure, "separated_languages", side_effect=lambda *a, **k: real(bad)):
                with mock.patch("sys.stderr", new_callable=io.StringIO) as err:
                    code = measure.main(["--offline", "--entrants", str(entrants), "--languages", "eng_Latn",
                                         "--out-dir", str(Path(tmp) / "out")])
        self.assertEqual(code, 1)
        self.assertIn("error: word list:", err.getvalue())
        self.assertIn("expected 'language word'", err.getvalue())


if __name__ == "__main__":
    main()
