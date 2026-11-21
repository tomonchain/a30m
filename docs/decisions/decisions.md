# Decisions

## 166. Our own model connectors first; the vendors' agents as optional subscription engines

**Proposed** (founder, 20 November 2026: "I want it to connect to my Claude subscription, add all my subscriptions and switch between them"; "more economical to use the subscription"; "unify everything"; then "or we redo the connectors for the main LLMs, GPT, Claude, Grok, Gemini").

- **The base is ours, in Rust, in a30m's own agent loop:** a connector for Claude (the Messages API), and one for the OpenAI-compatible API, which covers GPT, Grok, Gemini, Ollama and other compatible services. A native Gemini connector follows if its compatible mode proves unreliable with tools.
- **A model is named `provider/model`** (`anthropic/claude-sonnet-5-5`, `openai/…`, `xai/…`, `gemini/…`, `ollama/…`), chosen per workspace and later per agent. The server holds one key per provider, from its environment; keys never reach a workspace, a conversation or a tool.
- **The gate is native:** every connector's tool calls go through a30m's own loop and gate.
- **Subscription engines come on top, as options:** **Codex** (signed in with the owner's ChatGPT plan) and **Claude Code** (signed in with the owner's Claude plan; programmatic use draws on the plan's Agent SDK credit). The owner signs in to each on the server through the vendor's own flow; a30m never collects, stores or relays a plan's credentials. Each engine's approvals are routed to a30m's gate. When an engine is connected a30m uses it first, and falls back to the connectors when its credit runs out.
- **Routing by task:** small or local models to sort and summarise, large ones to write; spend tracked per workspace and per provider.
- **Never:** rotating several accounts of one vendor to get around its limits, or making programmatic use look interactive.
- **No OpenCode and no separate developer mode:** the connectors and the two engines cover what they would bring; coding is an agent's skill (decision 163).

*Why:* our own connectors keep the gate native, need no other runtime on the server, and work with any key. The subscription engines add the economy the owner pays for already, through each vendor's supported path.

*Cost:* connectors are paid per token. Each provider's compatible mode has gaps (Gemini 3's thought signatures, Grok's server-side tools only in its Responses API). Two engine adapters to keep up with vendors' changes; every engine names its source and the date its terms were checked. Offering Claude sign-in inside a commercial a30m needs Anthropic's agreement first. Replaces the single provider of decision 165.

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

## 163. Agent first: a team per workspace, a lead who dispatches, routines, and the gate at the action

**Proposed** (founder, 20 November 2026: "I want something as fluid as OpenBot, Grok Bot, Hark Pro…; what we had before was too rigid"; then "in a workspace I see my team of agents I hired, I can make groups, I talk to a lead who dispatches to the right agents, or directly to the right one"; and "routines: proposed by the agent when I ask the same thing often, or created in an interface").

- **A workspace is a team.** The owner hires agents into it: imported from a catalog (decision 164) or created by talking. Each has a role, skills, its accounts, its engine (decision 166) and the autonomy it has earned.
- **Groups** are teams within the team ("Content", "Accounting", "Travel").
- **One lead per workspace,** the one the owner talks to by default. It dispatches work to the most relevant agents. The owner can also talk directly to any agent or group. The lead is v0's interlocutor (decision 120) back; it may suggest hiring (136), speak up once a day with an idea (119), and plan the day (137).
- **The same conversation everywhere.** The Mac client and the phone do the same thing: talk, wait for an answer or an execution, get notified when work is done, when a question comes up, or when an approval is needed.
- **Everything is an agent's skill, nothing is a separate mode:** writing, coding (on a branch, with a pull request), browsing a site, filling a form, booking.
- **Agents work in a loop with tools,** in the background, with memory. Nothing to design first.
- **Routines are first class.** Recurring work given to an agent or a group: a trigger (a schedule, an event such as a mail, a date approaching in the calendar, a new deadline, or by hand), an instruction in plain words, who does it, what it may use, how it reports. A routine is born three ways: by talking; **proposed by an agent** that notices the owner asks the same thing often, created only if the owner accepts; or **in the interface**, a Routines page per workspace to create, edit, pause and run.
- **Control moves to the action.** Every tool call goes through the gate: read, reversible or commits. Reads and reversible actions run; what commits waits for the owner (decision 56). A bundle of actions can be approved at once when its card lists every action and the total ("Book it all"). Trust is earned per kind of action (decision 153).
- **Crystallise what works.** A routine that has run well for weeks can be frozen, on the owner's word, into a fixed recipe: faster, cheaper, predictable. Fluid first; rigid only where it has proved itself.
- **It improves itself, visibly:** from the owner's corrections (116), by proposing routines, skills, hires and recipes, and through the a30m workspace's pull requests on its own code (162). It never changes the gate on its own.

*Why:* v0 put safety in the shape of the work (six-block graphs, a mandatory approval block, AI blocks without tools, a business config to write). Every new job needed a workflow designed first. Putting the control at the action keeps decision 56 and lets everything else flow; the team, the lead and routines give the owner the structure that helps without the structure that blocks.

*Cost:* an agent loop spends more tokens and time than a fixed recipe, and its results vary more: v0's pick went from 9 minutes to 37 seconds through structure. Crystallising answers that for what repeats. The gate becomes the one safeguard, so its classing of each tool must be right: an MCP tool with no declared class is treated as committing. Changes 26, 43, 49, 58, 60 and 79; brings back 36, 119, 120, 136 and 137.

## 162. a30m works on a30m, in a workspace of its own, and is the first pilot

**Accepted** (founder, 20 November 2026: "I'd like Airth to work on Airth fairly quickly"; then the founder's company as a pilot, "but above all a30m").

- **a30m is the first pilot.** Its own workspace is the first one created, in phase 1, before the founder's company's.
- **It starts read-only:** watching competitors, sorting GitHub issues, keeping the roadmap's inbox, a weekly summary of merged pull requests.
- **Then level 1:** drafts of the changelog and docs, then pull requests on tests and documentation.
- **Never:** a change to security code, merging its own pull requests, or widening its own rights. These limits are enforced by the repository (`.github/CODEOWNERS`, the auto-merge workflow's `security` label, branch protection), not by a prompt.

*Why:* a30m is generic, its repository is public, and it holds no customer data: the safest real work to prove the product on, and a direct way to speed up its own building. The founder's company follows as the second pilot, once its chain of routines runs in a30m.

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

- **Owner:** the founder, personally, as named in `NOTICE`. Not one of their companies: those are users of a30m, not its owner.
- **A company of its own** takes the code over by assignment at phase 5 (first paid subscription) or at a fundraising, whichever comes first. Where it is incorporated is an accountant's question.
- **License:** GNU AGPL-3.0 (`AGPL-3.0-only`). Anyone who runs a modified a30m for users over a network must offer those users the source of their version (section 13), which protects the hosted offer.
- **CLA:** contributors keep their copyright and grant the right to relicense. Organisations that ban the AGPL can buy a commercial license (dual licensing). The CLA is reviewed by a lawyer before the first outside contribution.
- **Chosen once, before the first outside contributor, and never changed quietly.**

*Why:* a fundraising or a sale needs a company that holds only a30m. Taking code out of an operating company later would be an assignment between companies, with a valuation and tax consequences. The AGPL keeps real open source, which v0's FSL was not, while protecting a hosted offer.

*Cost:* a selling founder carries the liability until the company exists, so nothing is sold before it. Some companies will not touch the AGPL; the commercial license is for them. Airth v0 was published under FSL-1.1-ALv2 by a company of the founder's: what a30m takes from it (decisions, the design system, the scenarios' specs) is taken with that company's consent, which its director gives.

## 159. We start again in a new repository; milestone 7 is paused

**Accepted** (founder, 20 November 2026: "we have to start again almost from zero with this new architecture").

- **New repository** `tomonchain/a30m`. The old one is tagged `v0-final` and archived. Nothing is deleted, no history is rewritten.
- **We start again on the code, not on what was learned.** v0's decisions are reviewed one by one in `legacy.md`; the security scenarios become `docs/security/scenarios.md`; the design system is copied. No code is copied.
- **Milestone 7 (agent mail) is paused.**
- **Seven phases**, each delivered with its interface, each closed by a gate:

| Phase | Delivers | Gate |
| --- | --- | --- |
| 0. Foundations | Repository, license, CLA, CI, secret scanning, decisions carried over. No product code. | The founder approves the repository. |
| 1. The team and the lead | The agent runtime on a VPS, the owner account, device keys; hired agents, groups, the lead, conversations, routines (decision 163); a30m's own workspace first (162), then the founder's company's. | a30m's workspace runs a week without incident. |
| 2. Mac client and engines | Install over SSH, pairing by QR code; Codex and Claude Code engines (166). | A fresh install in under 10 minutes. |
| 3. The phone | Talking to agents, notifications, approval cards, push relay. | Telegram turned off. |
| 4. Personal life | Calendar and mail, read-only first: birthdays, deadlines, reminders. | No leak between workspaces in the tests. |
| 5. Partner host | A server created from the client, a subscription, the brand. | The first outside user. |
| 6. Acting in the world | A browser agents drive, bookings, payments under a decision of their own. | The first booking approved and made. |

- Anything outside this list goes to the roadmap's inbox. Waiting there already: a30m for companies (SSO, delegated rights, Bedrock), opt-in telemetry (signals, not content).

*Why:* the client and server split, device pairing, workspaces and an agent-first runtime (decision 163) change the base. Building them on v0's single-machine code would cost more than starting clean with what v0 taught us.

*Cost:* weeks before a30m does what v0 does today. The pilot company keeps running on v0 until its chain runs in a30m.

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

**Accepted** (founder, 21 November 2026, "yes, that's fine"; proposed 20 November, when the founder suggested Electron for the Mac app).

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

*Why:* a market the founder knows from the inside, where the founder's own company is the proof. Companies would put a30m against vendors that already sell agent governance.

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
