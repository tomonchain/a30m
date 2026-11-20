# Contributing

a30m is in its first phase and not yet open to outside contributions. This file says how work is done, for the founder, for agents, and for contributors later.

## Before you start

- Sign the [CLA](CLA.md). A bot asks on your first pull request.
- Read [`docs/decisions/`](docs/decisions/). A structural choice (a new module, a new dependency, new stored state, a change to a boundary) needs a decision entry first.

## How changes land

- `main` moves only through pull requests. Nobody pushes to `main`.
- One change per branch: one feature or one fix. No drive-by refactoring or reformatting.
- Small diffs: under 400 changed lines of non-test code. If a change needs more, propose a split first.
- A pull request merges itself once the `ci` check is green, **except** when it carries the `security` or `decision` label. Those wait for the founder.
- Never rewrite the history of a shared branch.

## Checks

Every change passes, locally, before you open a pull request:

```bash
cargo fmt --check
cargo clippy --all-targets --locked -- -D warnings
cargo test --locked
```

Never disable a lint, skip a test or mark one `#[ignore]` to make a change pass.

## Secrets

The repository is public. Before any push, check that no key, token, `.env` file, `.pem` file or real credential is in the commits. CI runs gitleaks over the whole history, but it is a last net, not the first.

Never run a development build against a real home: point it at a copy.

## Security code

Device pairing, authentication, the sandbox, approvals, secret handling and the database access layer are security boundaries. A change to them needs the founder's explicit request, carries the `security` label, and comes with a test proving the boundary still holds.

## Writing

Code, comments, docs and commit messages in English. Plain words, short sentences. Comments say why, not what.
