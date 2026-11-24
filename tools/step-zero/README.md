# Step zero: tokens per character, per UTF-8 byte and per word

A tool that counts how many tokens a tokenizer makes of a sample text, per character, per UTF-8 byte and, for languages that separate words with spaces, per word. It writes counts only. No sample text goes into any output.

**Licence.** The samples are FLORES-200 devtest text, CC BY-SA 4.0 (dataset card metadata). Use here is counting only. The ShareAlike question for any published artefact is open.

## Files

- `measure.py`: the script. `python measure.py --help` lists the flags.
- `test_measure.py`: tests. Standard library only. Run `python -m unittest` in this folder.
- `requirements.txt`: the tokenizer library, needed only for `--fetch`.
- `word-separated-languages.txt`: one `language unit` pair per line, for the languages whose words are separated by spaces. The unit is `word` or `syllable`. Tokens per word is measured only for these.
- `samples/`: two original sample sentences per file, for the offline mode. They are not FLORES text.

## The entrant list (`--entrants`, required)

The script does not carry a list of tokenizers. The person who runs it supplies one, as a text file with one `repository revision` pair per line. Blank lines and lines starting with `#` are skipped. Each repository is a Hugging Face model id. Each revision is a commit hash or its first 12 characters; the run checks that the revision the Hub returns starts with the one given.

```
# comment
owner/model-name a1b2c3d4e5f6
```

A run without `--entrants` exits with status 2 before any work starts.

## Language list (`--languages`)

Comma-separated language codes (FLORES-200 style, for example `eng_Latn,tha_Thai`). With `--fetch` it is required. With `--offline` it defaults to every `*.devtest` file in `samples/`.

## Modes (exactly one)

- `--fetch`: downloads the `tokenizer.json` file of each entrant at its revision and loads it with the `tokenizers` library. The devtest files must already be in `--flores-dir`, one sentence per line, named `<language>.devtest`.
- `--offline` (alias `--dry-run`): no network, no library. It uses a stand-in tokenizer, and every row names it. Its numbers test the reading, counting and output paths only. They say nothing about any real tokenizer.

## Outputs (in `--out-dir`, default `out/`)

- `measurements.csv`: one row per entrant and language. Its `word_unit` column says whether `tokens_per_word` counts words or syllables (Vietnamese counts syllables); it reads `not measured` where tokens per word is not measured.
- `sha256.csv`: the file name and sha256 of each sample file and each tokenizer file read.
- `errors.csv`: one row per failure, with its stage (`sample`, `tokenizer`, `measure`). The run exits 1 when this file has a row.

Each entrant and language pair becomes either a measurement row or an error row. The run checks that the two together cover every pair, and stops with an error if they do not.

## Running it

```
python measure.py --fetch --entrants <entrant file> --flores-dir <devtest folder> --languages <codes> --out-dir <output folder>
python measure.py --offline --entrants <entrant file>
```

Install the tokenizer library first with `pip install -r requirements.txt`, and confirm the pinned version before a real run.

## Not yet confirmed

- The devtest file names and layout in the dataset were not checked by this tool. The script expects `<language>.devtest`, one sentence per line.
- The tool does not download the devtest files. The operator places them in `--flores-dir`.
- The revision endpoint `https://huggingface.co/api/models/<repo>/revision/<revision>` and the `tokenizer.json` path are assumed. Confirm both on the first run.
- `word-separated-languages.txt` was written by hand, without a source. Check it before any tokens-per-word figure is reported. Vietnamese spaces separate syllables, so its "words" are syllables.
- Languages not on the word list read `not measured` for tokens per word.
