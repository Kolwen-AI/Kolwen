# Retention and deletion

> Part of Kolwen's control-family set. **Written from day one so that a future audit COLLECTS
> EVIDENCE rather than builds it** (owner ruling AR-10, 2026-09-06; what `AR-n` means is in
> [the index](README.md)). Everything under "Today" is a present-tense fact with its backing
> named; everything under "Planned" is not yet true.
> **No certification is held or claimed** — see `ISO-MAP.md`.

## Today

**The site keeps no visitor data of its own, because it collects none there.** It sets no cookie and
its one server-side store is the status record, which holds no visitor data (`PRIVACY.md`, "What this site is"), and it keeps nothing in the visitor's browser: a language preference is no longer
stored (each page only deletes the key an earlier version used). What Cloudflare handles when it serves a request, what Workers Logs and Workers Issues keep for the Worker (`PRIVACY.md`, "Worker logs"), and what
the contact mailbox retains, are described in `PRIVACY.md` and cannot be measured from this
repository. Measured, with the commands, in `PRIVACY.md`.

## Planned

- Conversation content: retained for **[N days]** and then deleted or anonymised. N is set before
  launch, stated in `PRIVACY.md` and `TERMS.md`, recorded, and enforced by a deletion mechanism; no
  statute supplies the number, and PDPA requires that a period be stated, recorded and actually
  enforced. No conversation content is retained today, because no conversational service exists.
- A deletion mechanism that runs, rather than a policy that says one exists.
- A deletion-request channel with an answer time, which `PRIVACY.md` currently marks as open.
