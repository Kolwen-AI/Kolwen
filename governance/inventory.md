# Assets, vendors and sub-processors

> Part of Kolwen's control-family set. **Written from day one so that a future audit COLLECTS
> EVIDENCE rather than builds it** (owner ruling AR-10, 2026-09-06; what `AR-n` means is in
> [the index](README.md)). Everything under "Today" is a present-tense fact with its backing
> named; everything under "Planned" is not yet true.
> **No certification is held or claimed** — see `ISO-MAP.md`.

## Today

**Assets:** one public GitHub repository · one Cloudflare Worker serving static pages at
kolwen.com, with one script that checks those pages every 15 minutes and answers `/status.json` from a status record (its KV namespace is created and bound; previews bind a separate one) · reserved package names on PyPI and npm · the brand assets, all generated from one
script · a filed Thai trade-mark application (the number is held privately).

**Inbound-mail TLS policy for kolwen.com (pressed 2026-11-21):** MTA-STS (RFC 8461) is in `testing` mode, its policy served at `mta-sts.kolwen.com` by the `kolwen` Worker (`worker/mta-sts.mjs`), `max_age` 86400; TLS-RPT (RFC 8460) reports go to `tls-reports@kolwen.com`. Tests A to C of the room's records note (dated 2026-11-20, kept in the room) passed on 2026-11-21. **One test, each MX's certificate on port 25, is not yet run.** `enforce` is not before 2026-12-05 and only on clean reports from at least two large senders; that decision is the owner's, and it takes a new policy id and `max_age`.

**No customer data of any kind exists.** No accounts, no database, no conversation store.

**Vendors and sub-processors:** the public table lives in `docs/TRUST.md` §4 — Cloudflare and
GitHub, each with a certificate URL a reader can open, and no DPA in place with either.

## Planned

An AI model provider, once chosen, becomes the third row and the first one that would touch
customer content.
