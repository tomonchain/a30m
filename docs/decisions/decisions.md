# Decisions

## 162. Airth works on Airth, inside a space of its own

**Accepted** (founder, 20 November 2026: "I'd like Airth to work on Airth fairly quickly").

- **Airth is a pro space like any business,** added once phase 1's gate passes, beside Hedgen.
- **It starts read-only:** watching competitors, sorting GitHub issues, keeping the roadmap's inbox, a weekly summary of merged pull requests.
- **Then level 1:** drafts of the changelog and docs, then pull requests on tests and documentation.
- **Never:** a change to security code, merging its own pull requests, or widening its own rights. These limits are enforced by the repository (`.github/CODEOWNERS`, the auto-merge workflow's `security` label, branch protection), not by a prompt.

*Why:* Airth is generic, its repository is public, and it holds no customer data: the safest real business to prove the product on, and a direct way to speed up its own building.

*Cost:* an agent proposing changes to the code that governs agents. The limits above must hold before the first routine runs. Changes 105 (the Workshop).

## 161. a30m is the code name; the brand waits for phase 5

**Accepted** (founder, 20 November 2026, creating `tomonchain/a30m`).

- The repository and the code are named **a30m**. Users never see the name.
- The commercial name is chosen before phase 5 (first outside user), with trademark checks (EUIPO, USPTO, INPI, classes 9 and 42), the domain, GitHub, X and App Store names.
- `tomonchain/airth` keeps its name, gets the tag `v0-final`, and is archived.

*Why:* about 250 names were checked on 20 November 2026; every short evocative word is taken in every useful domain. A name is not needed to build, and phase 0 should not wait on it.

*Cost:* a rename before launch: the binary, the crates, the documentation.

## 160. The code is the founder's own until phase 5; AGPL-3.0 with a CLA

**Proposed** (20 November 2026). The license and the CLA are each in a pull request labelled `decision`.

- **Owner:** Thomas Bazire, personally. Not Hedgen Ltd: Hedgen is a user of Airth, not its owner.
- **A company of its own** takes the code over by assignment at phase 5 (first paid subscription) or at a fundraising, whichever comes first. Where it is incorporated is an accountant's question.
- **License:** GNU AGPL-3.0 (`AGPL-3.0-only`). Anyone hosting a30m as a service must publish their changes, which protects the hosted offer.
- **CLA:** contributors keep their copyright and grant the right to relicense. Organisations that ban the AGPL can buy a commercial license (dual licensing). The CLA is reviewed by a lawyer before the first outside contribution.
- **Chosen once, before the first outside contributor, and never changed quietly.**

*Why:* a fundraising or a sale needs a company that holds only a30m. Taking code out of Hedgen later would be an assignment between companies, with a valuation and tax consequences. The AGPL keeps real open source, which v0's FSL was not, while protecting a hosted offer.

*Cost:* a selling founder carries the liability until the company exists, so nothing is sold before it. Some companies will not touch the AGPL; the commercial license is for them. Airth v0 was published under FSL-1.1-ALv2 with Hedgen Ltd as copyright holder: what a30m takes from it (decisions, the design system, the scenarios' specs) is taken with Hedgen's consent, which its director gives.

## 159. We start again in a new repository; milestone 7 is paused

**Accepted** (founder, 20 November 2026: "we have to start again almost from zero with this new architecture").

- **New repository** `tomonchain/a30m`. The old one is tagged `v0-final` and archived. Nothing is deleted, no history is rewritten.
- **We start again on the code, not on what was learned.** v0's decisions are reviewed one by one in `legacy.md`; the security scenarios become `docs/security/scenarios.md`; the design system is copied. No code is copied.
- **Milestone 7 (agent mail) is paused.**
- **Six phases**, each delivered with its interface, each closed by a gate:

| Phase | Delivers | Gate |
| --- | --- | --- |
| 0. Foundations | Repository, license, CLA, CI, secret scanning, decisions carried over. No product code. | The founder approves the repository. |
| 1. Server alone | The engine in Rust on a VPS, the owner account, device keys, Hedgen's content chain. | Hedgen runs a week without incident. |
| 2. Mac client | Install over SSH, pairing by QR code, the HQ. | A fresh install in under 10 minutes. |
| 3. Mobile app | HQ, Needs you, approvals, push relay. | Telegram turned off. |
| 4. Personal space | The founder's mail and calendar, read-only. | No leak between spaces in the tests. |
| 5. Partner host | A server created from the client, a subscription, the brand. | The first outside user. |

- Anything outside this list goes to the roadmap's inbox. Waiting there already: a30m for companies (SSO, delegated rights, Bedrock), opt-in telemetry (signals, not content).

*Why:* the client and server split, device pairing and spaces change the base. Building them on v0's single-machine code would cost more than starting clean with what v0 taught us.

*Cost:* weeks before a30m does what v0 does today. Hedgen keeps running on v0 until phase 1's gate passes.

## 158. The phone and the client reach the server by IP on port 443, with a pinned certificate and device keys

**Proposed** (20 November 2026; the founder's idea of "the server's IP and Airth's port", with the safeguards below).

- **Port 443.** Many networks block other ports.
- **A self-signed certificate, pinned.** The pairing QR code carries its fingerprint, so no domain name is needed and a man in the middle is refused.
- **Device keys only.** The server answers nothing to a device that is not paired. A device's key is made in its secure enclave and never leaves it.
- **Pairing:** the Mac client shows a QR code (server address, certificate fingerprint, a one-time token valid 2 minutes). The phone makes its key pair and registers; the Mac shows the device and asks the owner to confirm. A new device is added only from a device already paired.
- **Recovery:** the client shows a recovery key at install, to keep offline. It alone can take the server back.
- **Push:** iOS notifications go through Apple with the publisher's key, so a self-hosted server cannot send them alone. A small relay run by the publisher passes a signal ("something waits for you"), never content.

*Why:* the founder wants no domain to configure and no third-party network to install (v0 used Tailscale, decision 37). Pinning gives TLS's protection without a certificate authority.

*Cost:* a server whose IP changes needs its devices re-pointed. The push relay is infrastructure to run. All of this is security code: it is written only on the founder's explicit request, in pull requests labelled `security`. Changes 37, 97, 98, 117 and 118.

## 157. A Rust server; the Mac client and the mobile app in Tauri 2

**Proposed** (20 November 2026; the founder suggested Electron for the Mac app).

- **Server:** Rust, as v0.
- **Mac client and mobile app:** Tauri 2. The interface is web (React and shadcn, decision 73); the app's core is Rust.
- **Electron is set aside:** it would ship a Node runtime and need the pairing, SSH and key handling rewritten or bridged, where Tauri shares those crates with the server.
- **Tauri on mobile is tried on a prototype** before phase 3 commits to it. Tauri 2 supports iOS and Android, with plugins for notifications, barcode reading and biometrics.

*Why:* one language for every piece of security code (`crates/proto` serves the server, the client and the phone), and the web interface v0 already built.

*Cost:* Tauri's mobile support is younger than its desktop one. If the prototype fails, the phone app is native and `crates/proto` is called through bindings. Changes 16 and 72.

## 156. For small-business founders: their companies and their personal life

**Accepted** (founder, 20 November 2026: "we focus now on the CEOs of small businesses"; companies are "too complex and not mature enough, but keep it in mind").

- **Who:** the founder or CEO of a small company, for their businesses and their personal life.
- **One server, one owner, several devices.** No other users in V1 (founder: "maybe not great to have several user accounts").
- **The data model still holds an organisation and roles from V1:** one organisation, one member. Cheap now, painful to add later.
- **a30m for companies** (SSO, provisioning, agents acting with the employee's own OAuth token, Bedrock in the customer's AWS account, an admin console) waits in the inbox.

*Why:* a market the founder knows from the inside, where Hedgen is the proof. Companies would put a30m against vendors that already sell agent governance.

*Cost:* a narrower first market. The organisation field is carried everywhere with a single value for a long time.

## 155. a30m: a generalist assistant on the owner's server, for work and personal life

**Accepted** (founder, 20 November 2026: "a more generalist software, a bit like Hark Pro"; "it must clearly separate pro and personal, for mailboxes, accounts, …").

- **One server the owner holds** (theirs, or one a partner host creates for them) runs everything and keeps all the data.
- **A Mac client** installs and updates the server, and pairs devices by QR code. **A mobile app** steers and approves.
- **Spaces:** a pro space per business (what v0 called a business), and a personal space. A mailbox, an account, an agent, a memory or a document belongs to one space. Nothing crosses between spaces by default; moving something across is an action that commits, so it needs the owner's explicit approval (decision 56), and it is logged.
- The HQ and Needs you show every space, with a pro / personal filter.
- One database per space, in the server's home, out of the agents' reach (decision 31's rule, per space).
- **Out of scope for now:** a cloud computer that browses for the user, voice, hardware.

*Why:* Hark Pro (October 2026) runs a personal agent on its own cloud. The owner's server, data and keys are what sets a30m apart.

*Cost:* personal data raises the stakes: the separation between spaces is a security boundary. Changes 32, 39, 53, 64, 106 and 109.
