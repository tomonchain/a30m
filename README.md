# a30m

**Code name. In development: nothing here is ready to use.**

a30m is the next version of Airth: the headquarters of a small-business founder, for their companies and their personal life, running on a server they own. AI agents do the work; the founder decides anything that commits.

What it will be, and in what order, is written in [`docs/decisions/`](docs/decisions/). Nothing is promised before it ships.

## Layout

| Path | What |
| --- | --- |
| `crates/core` | The engine |
| `crates/server` | The server binary |
| `crates/proto` | Device pairing and device keys |
| `docs/decisions/` | Numbered decisions, continuing Airth v0's |
| `docs/security/` | The security scenarios every release must pass |
| `docs/design/` | The design system |

## License

[GNU AGPL-3.0](LICENSE). Copyright holder in [NOTICE](NOTICE). Contributions need the [CLA](CLA.md). See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Airth v0 is archived at [tomonchain/airth](https://github.com/tomonchain/airth) (tag `v0-final`).
