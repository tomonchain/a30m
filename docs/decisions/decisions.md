# Decisions

## 165. The first slice: local only, plain files, three dependencies

**Proposed** (20 November 2026, for the founder to try the first version that evening).

- **127.0.0.1 only**, with a token printed at start and checked on every API call, the Host header checked, and JSON-only writes. Reached from elsewhere through an SSH tunnel. Device pairing and the pinned certificate (158) come before it listens on a network.
- **Plain JSON files** in the server's home, one folder per workspace: its conversation, its agent (`agent/`: AGENTS.md, skills, mcp.json) and the agents' folder (`files/`). Agents' file tools reach `files/` only, so an agent cannot rewrite its instructions or add an MCP server. A database comes with the decision that needs it.
- **Dependencies:** `serde` and `serde_json` (JSON everywhere), `tiny_http` (a blocking HTTP server, as v0, enough on loopback), `ureq` (a blocking HTTPS client for the model provider). Blocking threads, as decision 1; the server's face on a public port is decided with 158.
- **One provider, Anthropic,** with the key from the server's environment. An `echo` model tries the interface without a key.
- **MCP over stdio only, not sandboxed yet.** The servers run with the owner's rights: connect only servers you trust. Bubblewrap around them comes with the scenarios (159).
- **What waits for the owner is kept in memory:** a restart drops it, and the agent's turn with it.

*Why:* the founder wanted to try a first version the same evening. Each choice is the smallest that holds the rules that matter (the gate, the folder boundary, the token), and each is named so it is replaced deliberately.

*Cost:* no phone, no pairing, no sandbox, no persistence of approvals, no scheduled tasks yet. The slice is larger than the 400-line rule (about 2,000 lines of code and tests), because it is the first whole path.

## 164. Agents, skills and connectors in open formats, imported from catalogs

**Proposed** (founder, 20 November 2026: "I want to import agents from the known libraries, no proprietary agent format; connectors the same; a catalog can be imported").

- **No a30m agent format.** An agent is an [Agent Plugins 1.0](https://aaif.io/blog/from-skills-and-tools-to-portable-agent-plugins) package: a `plugin.json`, its [Agent Skills](https://agentskills.io/home) (`SKILL.md` folders) and its MCP servers (`mcp.json`). Its standing instructions are an `AGENTS.md`. What a30m adds (which workspace, its autonomy levels, its budget) lives in the workspace, never in the package, so the same package goes back out unchanged.
- **Import from the formats people already use.** Agent Plugins and Agent Skills as they are; Claude Code's agents and plugins, and the common agent frameworks, through an importer each that turns them into the above and says what it could not carry. Export goes the same way.
- **Connectors are MCP servers, and nothing else.** No a30m connector API.
- **A catalog is a URL.** For connectors, any registry speaking the [MCP Registry](https://modelcontextprotocol.io/registry/about) API (`server.json`, v0.1): the official one, or a company's own. For agents and skills, a git repository or a plugin marketplace. The owner adds catalogs; nothing in a catalog is installed without the owner's word.
- **Imported means untrusted.** An imported agent gets no autonomy it has not earned in this workspace: every tool it calls goes through the gate (decision 163), and what commits waits for the owner.

*Why:* the owner should not be locked into a30m, and should be able to use what the ecosystem already makes. There is no common agent format across frameworks yet; Agent Plugins, Agent Skills, AGENTS.md and MCP are the open pieces most clients read.

*Cost:* one importer per foreign format, each partial: what a framework expresses in code (a custom graph, a callback) does not import. Agent Plugins 1.0 leaves agents, hooks and commands out of its portable core, so those parts stay per-client. Changes 14, 74 and 149.

## 163. Agent first: the agent is free, the gate decides at the action

**Proposed** (founder, 20 November 2026: "I want something as fluid as OpenBot, Grok Bot, Hark Pro…; what we had before was too rigid").

- **One assistant the owner talks to,** in the app. It knows the workspaces; the owner names one, or it infers one and confirms. It hands work to agents inside a workspace, which only see that workspace.
- **Agents work in a loop with tools** (MCP connectors, the web, files), with memory, in the background. They report when done or when blocked. Nothing to design first: no graph, no department, no role to declare.
- **Proactive:** it watches what the owner connects (mail, X, calendar) and proposes cards.
- **Recurring work is created by talking:** "every morning, propose three posts" becomes a scheduled task: an instruction, a schedule, the tools it may use.
- **Control moves to the action.** Every tool call goes through the gate: it is classed read, reversible or commits. Reads and reversible actions run; what commits waits for the owner (decision 56), on the phone. Trust is earned per kind of action (decision 153).
- **Crystallise what works.** A scheduled task that has run well for weeks can be frozen, on the owner's word, into a fixed recipe: faster, cheaper and predictable. Fluid first; rigid only where it has proved itself.

*Why:* v0 put safety in the shape of the work (six-block graphs, a mandatory approval block, AI blocks without tools, roles and departments). Every new job needed a workflow designed first. Putting the control at the action keeps decision 56 and lets everything else flow.

*Cost:* an agent loop spends more tokens and time than a fixed recipe, and its results vary more: v0's pick went from 9 minutes to 37 seconds through structure. Crystallising answers that for what repeats. The gate becomes the one safeguard, so its classing of each tool must be right: an MCP tool with no declared class is treated as committing. Changes 26, 36, 43, 49, 58, 60 and 79.

## 162. a30m works on a30m, in a workspace of its own, and is the first pilot

**Accepted** (founder, 20 November 2026: "I'd like Airth to work on Airth fairly quickly"; then "Hedgen as a pilot, yes, but above all a30m").

- **a30m is the first pilot.** Its own workspace is the first one created, in phase 1, before Hedgen's.
- **It starts read-only:** watching competitors, sorting GitHub issues, keeping the roadmap's inbox, a weekly summary of merged pull requests.
- **Then level 1:** drafts of the changelog and docs, then pull requests on tests and documentation.
- **Never:** a change to security code, merging its own pull requests, or widening its own rights. These limits are enforced by the repository (`.github/CODEOWNERS`, the auto-merge workflow's `security` label, branch protection), not by a prompt.

*Why:* a30m is generic, its repository is public, and it holds no customer data: the safest real work to prove the product on, and a direct way to speed up its own building. Hedgen follows as the second pilot, once its content chain runs in a30m.

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
- **License:** GNU AGPL-3.0 (`AGPL-3.0-only`). Anyone who runs a modified a30m for users over a network must offer those users the source of their version (section 13), which protects the hosted offer.
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
| 1. Server alone | The agent runtime in Rust on a VPS, the owner account, device keys, a30m's own workspace (decision 162), then Hedgen's. | a30m's workspace runs its tasks a week without incident. |
| 2. Mac client | Install over SSH, pairing by QR code, the HQ. | A fresh install in under 10 minutes. |
| 3. Mobile app | HQ, Needs you, approvals, push relay. | Telegram turned off. |
| 4. Personal workspace | The founder's mail and calendar, read-only. | No leak between workspaces in the tests. |
| 5. Partner host | A server created from the client, a subscription, the brand. | The first outside user. |

- Anything outside this list goes to the roadmap's inbox. Waiting there already: a30m for companies (SSO, delegated rights, Bedrock), opt-in telemetry (signals, not content).

*Why:* the client and server split, device pairing, workspaces and an agent-first runtime (decision 163) change the base. Building them on v0's single-machine code would cost more than starting clean with what v0 taught us.

*Cost:* weeks before a30m does what v0 does today. Hedgen keeps running on v0 until its chain runs in a30m.

## 158. The phone and the client reach the server by IP on port 443, with a pinned certificate and device keys

**Proposed** (20 November 2026; the founder's idea of "the server's IP and Airth's port", with the safeguards below).

- **Port 443.** Many networks block other ports.
- **A self-signed certificate, pinned.** The pairing QR code carries its fingerprint, so no domain name is needed and a man in the middle is refused.
- **Device keys only.** The server answers nothing to a device that is not paired, with one exception: the registration request that carries a valid one-time pairing token. Anything else from an unpaired device is refused. A device's key is made in its secure hardware (the Secure Enclave on iOS, the Android Keystore) and never leaves it.
- **Pairing:** the Mac client shows a QR code (server address, certificate fingerprint, a one-time token valid 2 minutes). The phone makes its key pair and registers; the Mac shows the device and asks the owner to confirm. A new device is added only from a device already paired.
- **Recovery:** the client shows a recovery key at install, to keep offline. It alone can take the server back.
- **Push:** phone notifications go through Apple's push service (iOS) or Firebase Cloud Messaging (Android), with the publisher's credentials, so a self-hosted server cannot send them alone. A small relay run by the publisher passes a signal ("something waits for you"), never content. Phase 3 ships iOS; Android follows the same path.

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

**Accepted** (founder, 20 November 2026: "a more generalist software, a bit like Hark Pro"; "it must clearly separate pro and personal, for mailboxes, accounts, …"; then "or we simply let the owner create workspaces, with no mention of pro or personal").

- **One server the owner holds** (theirs, or one a partner host creates for them) runs everything and keeps all the data.
- **A Mac client** installs and updates the server, and pairs devices by QR code. **A mobile app** steers and approves.
- **Workspaces.** The owner creates as many as they want: a company, a side project, their personal life, a family. a30m does not label them pro or personal; a workspace is a workspace. A company's workspace can carry a legal identity, as an option.
- A mailbox, an account, an agent, a memory or a document belongs to one workspace. Nothing crosses between workspaces by default; moving something across is an action that commits, so it needs the owner's explicit approval (decision 56), and it is logged.
- The HQ and Needs you show every workspace.
- One database per workspace, in the server's home, out of the agents' reach (decision 31's rule, per workspace).
- **Out of scope for now:** a cloud computer that browses for the user, voice, hardware.

*Why:* Hark Pro (October 2026) runs a personal agent on its own cloud. The owner's server, data and keys are what sets a30m apart.

*Cost:* personal data raises the stakes: the separation between workspaces is a security boundary. Changes 32, 39, 53, 64, 106 and 109.
