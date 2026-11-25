# Security Policy

<!-- Diverges from the flock published-code template deliberately: this is a superset written for
     a repository with a real reporting channel and a live site, where the template is a minimal
     skeleton. What the template lacks and this does not: the scope statement, what a reporter can
     expect, and an explicit list of what is NOT claimed. -->

## Reporting a Vulnerability

Report a security issue in this repository through GitHub's private vulnerability reporting —
**[Security → Report a vulnerability](https://github.com/Kolwen-AI/Kolwen/security/advisories/new)**
— **never a public issue**. Private reporting is enabled on this repository; the link above
opens the form directly. Every report stays private until disclosure, whatever its severity: there is no public track for a low-severity report, because severity is often unclear when a report arrives, and a one-person project cannot take back a public mistake.

A public GitHub issue remains the right channel for an ordinary, non-security bug. If you are
unsure which you have, use private reporting—it is easy to move a report into the open later,
and impossible to take one back.

**If you do not have a GitHub account**, `security@kolwen.com` reaches the maintainer. It is
listed here as a fallback rather than the primary channel: private reporting keeps the exchange
in one place and is preferred wherever possible. The same address is published for automated
readers at `/.well-known/security.txt`, per RFC 9116.

**One-person project, no second pair of hands.** Your report will be read, but if the maintainer
is unavailable there is no backup route—that is a real limitation, not an oversight, and it is
stated so nobody plans around a responsiveness this project cannot guarantee.

Published security advisories for this repository are listed on its [Security Advisories tab](https://github.com/Kolwen-AI/Kolwen/security/advisories).

## Scope

This repository is the public face of Kolwen. What ships from it:

**In scope**
- `web/`—the static pages, `worker/index.mjs` (the one script the Worker runs) and `wrangler.jsonc` which configures them. The deployment is served
  at `kolwen.com`, and CI verifies the served bytes against this repo there. The Worker's own
  `workers.dev` address is turned off by `workers_dev: false` in `wrangler.jsonc`; it answered 404 when read on 2026-10-04.
- `py/`—the `kolwen` package published to PyPI, and `.github/workflows/publish-pypi.yml`,
  which publishes it via OIDC Trusted Publishing.
- `brand/`—`make-brand.mjs` and the committed image assets it generates. Several are served
  directly (`web/favicon.svg`, `web/apple-touch-icon.png`), and a hand-edited asset is a real
  attack: CI regenerates and byte-compares them for exactly that reason.
- `scripts/`—the zero-dependency Node tooling this repo runs.
- `.github/`—the workflows, and also `dependabot.yml` and `codeql/codeql-config.yml`, where a
  weakened path filter or config is as much a finding as a change to a workflow itself.

**Out of scope**
- **The model.** Kolwen is in development. No model, weights, or inference service has been
  released and no release date is set, so there is nothing here that runs a model. If and when
  one is released, this scope will be updated.
- Vulnerabilities in third-party services this repo depends on—Cloudflare, GitHub, PyPI and
  npm. Report those to the vendor.
- The npm package `kolwen`, which is published from outside this repository. It is ours, so
  **report it here anyway** through the same private link above—this bullet exists to say the
  code is not in this tree, not to leave you without a destination.
- Findings that require a compromised maintainer account or physical access to the maintainer's
  machine, which are outside what any policy here can address.

## What a reporter can expect

This is a one-person-maintained, pre-release project, and the honest posture is stated rather
than dressed up:

- We acknowledge a report within 5 days, send an assessment within 10 days, and disclose publicly once the fix ships, or at 90 days at most. During an absence announced on the maintainer's GitHub profile, the 5 days count from the first day back.
- It will be **triaged against the scope above**, and you will be told which side it fell on.
- A confirmed issue is **disclosed once a fix ships, or at 90 days at most**, through a GitHub Security Advisory on
  this repository. If a release fixes a known vulnerability, the release notes name it.
- Credit is given to the reporter by default. Say so if you would rather not be named.

## How an advisory is written

An advisory opens with who is affected, who is not, and what to do. The description comes after that. curl's advisories carry the same three parts, under "Affected versions", "Not affected versions" and "Recommendations" ([curl.se/docs/CVE-2023-38545.html](https://curl.se/docs/CVE-2023-38545.html), read 2026-11-15), though curl places them after its description.

Kolwen's site is hosted, and no version of it is installed by a user. So "affected" names the time window in UTC and every Worker version that served traffic in it, by the version ID Cloudflare gives each version (a deployment can serve two versions during a gradual deployment). A published package, such as the `kolwen` name-reservation packages on PyPI and npm, names its version range.

The description is one sentence in the CVE Program's template ([Key Details Phrasing](https://www.cve.org/Resources/General/Key-Details-Phrasing.pdf), read 2026-11-15): "[VULNTYPE] in [COMPONENT] in [VENDOR] [PRODUCT] [VERSION] allows [ATTACKER] to [IMPACT] via [VECTOR]." Where a detail is not known, the template's defaults apply: "attackers", "unspecified impact", "via unspecified vectors". The product name is always given.

One advisory covers one flaw that can be fixed on its own.

An advisory states facts only, with no promotional wording. The reporter is credited in GitHub's advisory credit, as the section above says, and not in the description.

An advisory starts as a draft repository security advisory, visible only to the maintainer and the people added to it, which is where the impact is discussed privately. It is published when the issue is disclosed, once the fix ships or at 90 days at most, as the section above says. GitHub's documentation ([About repository security advisories](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/about-repository-security-advisories), read 2026-11-15) describes the two steps as "Create a draft security advisory, and use the draft to privately discuss the impact of the vulnerability on your project" and "Publish the security advisory to alert your community of the vulnerability once a patch is released". Kolwen also publishes at 90 days when no patch has shipped, as the section above says.

## What this repository already does

Stated because a reporter is entitled to know the baseline, and because every line here is
checkable rather than asserted:

- **Every GitHub Action is pinned to a 40-character commit SHA**, with its human version beside
  it—not a moving tag.
- **No repository secrets exist.** Publishing to PyPI uses OIDC Trusted Publishing, so there is
  no long-lived token to steal. The first upload, `kolwen` 0.0.0, predates that
  workflow and was made by hand; `kolwen` 0.0.1 was published by the workflow.
- **Workflow permissions are least-privilege**: `contents: read` at the top of every workflow,
  with write scopes narrowed to the single job that needs them.
- **No `pull_request_target`, no `workflow_run`**, and no attacker-controllable context
  interpolated into a shell command.
- **Secret scanning and push protection are enabled on this repository.** The house secret scan (`scripts/secret-gate.mjs`) also runs in CI and, in a clone that enabled `core.hooksPath`, before each commit and push; it catches a provider-shaped token, a private-key header and a high-entropy value that holds a letter and a digit and is not hex-only, assigned to a secret-like name such as `secret`, `token`, `password` or `api_key`, and it does not catch a credential in the user-info part of a URL or connection string (scheme://user:pass@host) unless the credential is provider-shaped, or an HTTP authentication header whose value is a scheme and a token unless that token is provider-shaped (the full rules and limits are in `scripts/lib/secret-scan.mjs` and `scripts/secret-gate.mjs`: their headers, the generic rule's name list and the binary-file rule, and the wide-text rule with its 8 MiB decode bound, past which a UTF-16 or UTF-32 file is refused by name, `wide-text-too-large-to-decode`, until its fingerprint is acknowledged). `git push --no-verify` bypasses the hooks.
- CodeQL, OpenSSF Scorecard and Dependabot run here. A ruleset on `main` requires the
  `all-green` and `analyze (javascript)` checks and blocks deletion and force-push—**and the
  maintainer's admin role can bypass it, and does**, because this is a one-person repository
  that pushes directly. The ruleset's real job is gating Dependabot's automatic merges.

## Independent Scanning—NVIDIA SkillSpector

Not applicable: this repository ships no skill and runs no SkillSpector scan, so this file carries no scan result.

## A note on what is NOT claimed

This project has not been independently audited and has no bug bounty. Those are absences, not
oversights—stated so nobody infers a guarantee this project has not earned.
