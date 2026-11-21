# Airth v0's decisions in a30m

Each of v0's 154 decisions, and whether it holds. **A draft for the founder to settle** (decision 159).

Kept: 88 · Superseded: 36 · Revisit: 30.

- **Kept:** the rule carries over, adapted to workspaces where it said business or realm.
- **Superseded:** replaced by a decision from 155 on, or already by a later v0 decision.
- **Revisit:** decided again when the phase that needs it starts.

The full texts are in [v0's decisions](https://github.com/tomonchain/airth/blob/v0-final/docs/decisions.md). v0 has no decision 35, and two numbered 15 (15a and 15b).

| No. | v0 decision | Status | Why |
| --- | --- | --- | --- |
| 154 | A mailbox is connected from a dialog, and saved only once both its logins work | Kept | A mailbox connected from a dialog; paused with milestone 7. |
| 153 | An agent earns the right to act alone, and its approval step steps aside | Kept | An agent earns the right to act alone (within 56). |
| 152 | One mailbox per business, the interlocutor's, who passes each mail to the right agent | Kept | One mailbox per business, the interlocutor's; paused with milestone 7. |
| 151 | A routine's AI blocks are checked against what the founder decided, before a prompt or model change is kept | Revisit | Replaying a recipe's checks before a change, for crystallised recipes (163). |
| 150 | A founder back on a run's page watches it again | Kept | Back on a run's page, the owner watches it again. |
| 149 | A business's own skills, in the Agent Skills format, offered once the founder approves them | Kept | Each workspace's skills, in the Agent Skills format (164). |
| 148 | Each message of a run keeps the time it was added; the model never sees it | Kept | Each message keeps its time; the model never sees it. |
| 147 | One thread per project; the Home keeps what belongs to none | Kept | One thread per project. |
| 146 | An agent links a workspace file, and the founder opens it in the app | Kept | An agent links a workspace file. |
| 145 | An update is ready sooner: a faster build, tests only when the Rust changed, a look every 5 minutes | Superseded | The Mac client installs and updates the server; the update path is decided at phase 2 (155). |
| 144 | An agent's words are rendered as Markdown, by one component, as untrusted content | Kept | Agent text rendered as untrusted Markdown. |
| 143 | The interface's deterministic logic is tested with Vitest | Kept | Vitest for the interface's logic. |
| 142 | An agent may name the model its tasks use | Kept | An agent may name the model its tasks use. |
| 141 | A landing page for Airth, in site/, published by GitHub Pages | Revisit | The landing page waits for the brand (161). |
| 140 | An agent's page, its levels in the app, and its package to take to another business | Revisit | An agent's package is an Agent Plugin (164); its page and levels are redesigned. |
| 139 | A monthly budget per business and per agent, which stops the work once reached | Kept | Monthly budgets per workspace and per agent. |
| 138 | A connector's sign-in comes back to the address the founder used | Revisit | OAuth sign-ins must come back to a server reached by IP (158). |
| 137 | The day's plan: each weekday, the interlocutor gives the team its tasks toward the goal | Kept | The day's plan. |
| 136 | The interlocutor may ask the founder to hire an agent | Kept | The interlocutor may ask the owner to hire. |
| 135 | X as a read-only connector | Kept | X as a read-only connector. |
| 134 | A report is not a message in the conversation | Kept | A report is not a message. |
| 133 | The Overview: where things stand, the week folded | Kept | The Overview. |
| 132 | A conversation with an agent is the thread alone | Kept | A conversation with an agent is the thread alone. |
| 131 | Needs you: what to decide first, what broke folded and last | Kept | Needs you: what to decide first. |
| 130 | The rail in groups; no line around a block; a conversation in time order | Revisit | With 128. |
| 129 | A project is kept: its name, its description, its milestones, its tasks | Kept | Projects: name, description, milestones, tasks. |
| 128 | Three pages and More: Chat, Needs you, Projects | Revisit | The pages are redesigned for the desktop client and the phone. |
| 127 | The founder answers in words, and teaches the agents lessons | Kept | The owner answers in words and teaches lessons. |
| 126 | A new business's record comes from its official register | Kept | A business's record from its official register. |
| 125 | A stopped task goes on with a remedy | Kept | A stopped task goes on with a remedy. |
| 124 | The language the agents write to the founder in | Kept | The language agents write to the owner in. |
| 123 | Bank statements imported from Revolut | Revisit | With 54, after phase 4. |
| 122 | Connectors' logos fetched by Airth, not by the founder's devices | Kept | Connector logos fetched by the server. |
| 121 | The interlocutor's morning brief, in figures Airth keeps | Kept | The morning brief. |
| 120 | One interlocutor for the founder, who passes orders on to the team | Kept | The one assistant the owner talks to (163). |
| 119 | An agent may speak up with an idea, once a day at most for the team | Kept | An agent may speak up with one idea a day. |
| 118 | Each device asks for access, and gets a key of its own | Revisit | Per-device keys stay; the Telegram code gives way to QR pairing (158). |
| 117 | Airth on the phone's home screen, with its own notifications | Superseded | The mobile app and the push relay (158). |
| 116 | The founder's words on a routine's drafts reach its next drafts | Kept | The owner's words on drafts reach the next drafts. |
| 115 | The founder asks for a draft again, saying what should change | Kept | Redo a draft with what should change. |
| 114 | Each business folder follows its remote | Kept | Each workspace's folder follows its remote. |
| 113 | The founder names each Airth | Kept | The owner names each server. |
| 112 | Airth.app opens this Mac's Airth or a server's | Superseded | The client always opens a server (155, 157). |
| 111 | The founder is told when a model provider's money runs low | Kept | The owner is told when a provider's money runs low. |
| 110 | Airth stays fast and its disk bounded as the businesses' history grows | Kept | Parsing once, indexes, bounded disk. |
| 109 | The founder talks to the agents on Telegram, as to a colleague | Superseded | Talking to agents moves to the mobile app at phase 3 (155, 159). |
| 108 | The service keeps running on its own: its loops survive a panic, and one business's error stops only that business | Kept | Loops survive a panic; one workspace's error stops only that workspace. |
| 107 | The rail shows what each model provider costs, and how long its money lasts | Kept | Provider costs and how long their money lasts. |
| 106 | Airth moves to the founder's VPS now, without waiting for milestone 6's proof | Superseded | The server is the default (155). |
| 105 | The Workshop: the founder asks for a change to Airth, a run makes it as a pull request | Superseded | Airth works on Airth as a workspace of its own (162). |
| 104 | Google Drive: the client once for every business, then one click and a folder from a list | Kept | Google Drive, per workspace. |
| 103 | Airth calls an MCP tool the founder approved, once | Kept | An approved MCP tool is called once. |
| 102 | An incident closes itself when its action works again | Kept | An incident closes itself when its action works again. |
| 101 | The first launch sets up a business in four questions, beside the business it builds | Revisit | Onboarding moves into the Mac client, at phase 2. |
| 100 | The founder's Airth follows main, and a pull request is tried on a copy | Superseded | The Mac client installs and updates the server; how releases are cut is decided at phase 2 (155). |
| 99 | An AI block remembers the stories it kept, for a few days | Revisit | With crystallised recipes (163). |
| 98 | A new key unpairs every phone, and is made on the Mac only | Revisit | The owner key and the recovery key, inside 158. |
| 97 | Airth fits a phone, and a paired phone keeps the key | Superseded | Device keys from QR pairing (158). |
| 96 | Reads and reversible writes start at their ceiling; what commits starts at 1 | Kept | Reads and reversible writes start at their ceiling; commits at 1. |
| 95 | Scans are read on the Mac, by macOS's own text recognition, in a sandbox | Superseded | The server is Linux, not a Mac; OCR is re-decided. |
| 94 | An agent can have a first name, besides its title | Kept | An agent may have a first name. |
| 93 | A run's change to the business config is checked before the founder reviews it, and goes back to the run when it does not hold | Kept | A run's config change is checked before review. |
| 92 | A stable week, and the four in a row the beta needs | Superseded | Phase 1's gate replaces it (159). |
| 91 | The routine editor draws and links blocks on a canvas, with React Flow | Revisit | A canvas only for crystallised recipes, if at all (163). |
| 90 | A business's vitals: one read-only `get_vitals` on its own MCP server, read hourly by Airth for the HQ | Kept | A business's vitals through `get_vitals`. |
| 89 | A remote MCP server can be connected with a token instead of a sign-in | Kept | Remote MCP with a token. |
| 88 | A routine launches a mission and waits for its report | Superseded | Agents launch and follow their own work (163). |
| 87 | An agent answers cubic's review of its pull request | Revisit | Depends on which review bot the new repository uses. |
| 86 | Word documents and PDFs are read as text, with flate2 | Revisit | A dependency choice, re-decided when documents are read again. |
| 85 | Google Drive, read only, one folder | Superseded | Already replaced by 104. |
| 84 | A service whose reads change nothing is read without asking | Kept | A service that only reads is read without asking. |
| 83 | The memory keeps what the founder decided, not what was discussed | Kept | Memory keeps decisions, not discussion. |
| 82 | A routine's model calls are told what the founder's tasks are told | Kept | Routine model calls hear what tasks hear. |
| 81 | A task or a routine tries again on its own before it waits for the founder | Kept | A task retries on its own before waiting for the owner. |
| 80 | A run in its own worktree writes without asking | Kept | A run in its own worktree writes without asking. |
| 79 | Nine departments, the founder adds others in Settings | Superseded | No departments to declare (163). |
| 78 | A model's answer is streamed to the chat as it is written | Kept | Answers streamed as they are written. |
| 77 | A repository is picked from the ones the business's GitHub token reaches | Kept | Repositories picked from those the workspace's GitHub token reaches. |
| 76 | The Documents editor is CodeMirror 6, in web/ | Revisit | A dependency choice, re-decided when Documents is rebuilt. |
| 75 | A task written in an agent's chat is watched by the founder | Kept | A task written in an agent's chat is watched. |
| 74 | The Marketplace: Anthropic's skills, the official connectors and the MCP Registry, and Airth's library of teams | Superseded | Catalogs are URLs: MCP registries, plugin marketplaces, git (164). |
| 73 | The interface is a React app built with shadcn, and its first screen shows the agents at work | Kept | React and shadcn, reused in the Tauri clients (157). |
| 72 | One interface, the new one, built from three page layouts; the classic one leaves once its features have moved | Revisit | The interface now lives in the Tauri clients (157). |
| 71 | The classic interface stays the base, with the new interface's rail and header | Superseded | Already replaced by 72 and 73. |
| 70 | Agent mail: one OVH mailbox per role, read as untrusted data, sent at level 1 with a blind copy to archive@ | Superseded | Already replaced by 152; mail is paused with milestone 7 (159). |
| 69 | The routine editor v1: parameters edited in place by the founder, checked before they are written; no graph library yet | Superseded | Already replaced by the canvas editor (91). |
| 68 | Finance entered by hand, until a bank is connected | Kept | Finance entered by hand until a bank is connected. |
| 67 | The Linux sandbox: bubblewrap, built from the same rules as the macOS profile; Landlock later | Kept | The server is Linux: bubblewrap from day one. |
| 66 | The legal calendar: deadlines computed from the legal identity, by rules written as data with their source | Kept | The legal calendar, for company workspaces. |
| 65 | Agent characters: drawn by code from a seed saved when the agent is hired | Kept | Agent characters drawn from a seed. |
| 64 | The command bar: an order is a task run by one agent, routed by the fast model when not named | Revisit | The one assistant takes the command bar's place (163). |
| 63 | Replies: the founder sends a post's link on Telegram; Airth drafts the reply into Typefully, never onto X | Kept | The pilot's replies; the Telegram entry point moves to the app's share sheet. |
| 62 | The founder can retry a failed action from its incident, once it is clear nothing was done | Kept | Retry from an incident once nothing was done. |
| 61 | What a run drops reaches the founder: a note on its remaining items, and the weekly count | Kept | What a run drops reaches the owner. |
| 60 | An AI block can judge its whole list in one call, and can use the realm's fast model | Revisit | Judging a list in one call, for crystallised recipes (163). |
| 59 | A report is an item of Needs you, one per run and block, sent to Telegram | Kept | Reports stay Needs you items; the Telegram part ends at phase 3. |
| 58 | The quality check is an AI block whose answer can flag the item; no seventh block | Revisit | A quality check on drafts, as a step of a crystallised recipe (163). |
| 57 | The interface stays vanilla JavaScript and CSS, served by Airth; the new one grows next to the old | Superseded | Already replaced by 73. |
| 56 | An action that commits always needs the founder's explicit approval, whoever started the run | Kept | Unchanged. Whether an in-app biometric approval counts is a separate decision. |
| 55 | A failed action is retried only when a retry cannot do it twice | Kept | A failed action is retried only when it cannot run twice. |
| 54 | One bank in the beta, read-only: Revolut Business | Revisit | A bank for company workspaces, after phase 4. |
| 53 | The HQ shows one section per business: health, vitals, finance, latest activity | Kept | The HQ shows one section per workspace, every one (155). |
| 52 | One Telegram bot for the founder, held by Airth, never by a business | Superseded | The mobile app replaces it at phase 3 (159); Telegram stays until then. |
| 51 | A routine's commands run offline; its network goes through declared actions | Revisit | Network rules for agents in a loop, decided with the gate (163). |
| 50 | In the owner's home, commands read only the realm and the developer tools | Kept | Commands read only the workspace and the developer tools. |
| 49 | Routines are JSON graphs of the six blocks; connectors declare their actions in the Airth home | Revisit | The six-block graph may return as the form of a crystallised recipe (163). |
| 48 | Commands write only where the run may; they never read the owner's keys | Kept | Commands write only where the run may; never the owner's keys. |
| 47 | The business database: one access layer, evidence append-only, tables added with their milestone | Kept | One access layer; evidence append-only. |
| 46 | A run in place cannot plant git hooks or change the git config | Kept | No git hooks or git config changes from a run (scenario S-05). |
| 45 | Autonomy per agent and action, under a ceiling set by the action's risk class | Kept | Autonomy per agent and action, under the risk class's ceiling. |
| 44 | A run never writes the business config; it proposes a change | Kept | A run proposes config changes, never writes them. |
| 43 | The business config: profile and legal identity, goal, lines, departments, agents | Superseded | No business config to write; a workspace may carry a legal identity (155, 163). |
| 42 | The surface is frozen on the beta's scope | Superseded | The phases set the scope (159). |
| 41 | Agents ask each other for work, within the limits of the one asked | Kept | Agents ask each other for work within the limits of the one asked. |
| 40 | Airth no longer develops its own skills | Revisit | To read again with 162: Airth now works on Airth. |
| 39 | The Mac app tools and the `apps` capability are removed | Superseded | Personal life is back in scope as a workspace (155); which personal tools return is decided at phase 4. |
| 38 | The phone's pairing code is drawn with qrcode | Revisit | QR pairing returns (158); the crate is chosen at phase 2. |
| 37 | The app is rebuilt around six sections, and reaches the phone through Tailscale | Superseded | Sections by 128 and 130; Tailscale replaced by IP, 443 and a pinned certificate (158). |
| 36 | A business is run by bots, each with a job; the owner steers | Kept | Agents do the work; the owner steers. Without declared roles (163). |
| 34 | A pipeline's schedule is in its file, not in an objective | Superseded | Recurring work is a scheduled task created by talking (163). |
| 33 | Feeds are read with quick-xml | Revisit | A dependency choice, re-decided when the Read block is rebuilt. |
| 32 | Airth runs businesses; each realm is one business | Superseded | A workspace is whatever the owner creates: a company, a project, personal life (155). |
| 31 | Business state lives in SQLite, one database per realm | Kept | One SQLite database per workspace, in the server's home (155). |
| 30 | Business pipelines are a generic engine; each business declares its own | Superseded | Already replaced by the six-block graphs (49). |
| 29 | Airth runs on the owner's Mac until a stable beta, then on a Linux VPS | Superseded | The server is the default from day one (155). |
| 28 | The approval queue reaches the owner's phone through a Telegram bot | Superseded | The mobile app replaces the Telegram bot at phase 3 (155, 159). |
| 27 | The owner's time is a recorded quantity | Kept | The owner's time stays a recorded quantity. |
| 26 | Business operations are pipelines of tested steps; the model only judges | Superseded | Agents work in a loop with tools; fixed recipes only where work has proved itself (163). |
| 25 | The surface is frozen until the pilot business proves itself | Superseded | The surface is now set by the phases (159). |
| 24 | Benchmarks drive real runs through the hub, in throwaway realms, and verify outcomes themselves | Superseded | Replaced by the security scenarios (67), now specs in docs/security (159). |
| 23 | Requests are shaped for the provider's prompt cache | Kept | Requests shaped for the prompt cache. |
| 22 | The app serves each request on its own thread; settings changes stay serialized | Revisit | Threading model re-decided with decision 1, at phase 1. |
| 21 | The owner picks the model per request; each provider only gets its own key | Kept | The owner picks the model; each provider gets only its key. |
| 20 | Connectors are remote MCP servers, connected with OAuth like in Claude or ChatGPT | Kept | Remote MCP connectors with OAuth. |
| 19 | Connectors are integration presets, checked when connected | Revisit | Connectors are MCP servers only (164); what a preset adds is decided when connectors are built. |
| 18 | MCP servers and catalog skills extend a realm, under the realm's own rules | Kept | MCP servers and skills extend a workspace, under its rules. |
| 17 | Several model connections routed by the ask, and one North Star per realm | Revisit | Model routing stays; the North Star becomes each workspace's goal. |
| 16 | A native Mac app, and Mac apps as fixed, approved actions | Superseded | The Mac app becomes the Tauri client (157). |
| 15b | A second provider speaks the OpenAI-compatible Chat Completions format | Kept | OpenAI-compatible providers stay supported. |
| 15a | Airth updates itself from its source repository, only after its tests pass | Superseded | The Mac client installs and updates the server (155). |
| 14 | Skills are tested programs the owner installs, not changes to Airth itself | Superseded | Skills are Agent Skills, imported and exported as they are (149, 164). |
| 13 | The app server is the background runtime | Kept | The background runtime is now the remote server (155). |
| 12 | Notifications and summaries go to an inbox | Superseded | The inbox became Needs you (59, 131). |
| 11 | Objectives run with approvals and budgets given in advance | Superseded | Objectives gave way to routines, autonomy levels and budgets (45, 139). |
| 10 | Integrations bind credentials to a base URL | Kept | Credentials bound to a base URL. |
| 9 | Approvals can be granted for the rest of a run | Revisit | Check against 56 before it returns: no blanket approval of commits. |
| 8 | Runs keep a plan, and resume from it | Kept | Runs keep a plan and resume from it. |
| 7 | Credentials live with their realm, and models only see placeholders | Kept | Credentials per workspace; models see placeholders only. |
| 6 | Memory is per realm, owner-editable, and written by a gated tool | Kept | Memory per workspace instead of per realm. |
| 5 | Changes are made in worktrees and adopted only after checks pass | Kept | Agent changes land in worktrees, adopted after checks (162). |
| 4 | Commands run in an OS sandbox derived from the same access rules | Kept | Commands run in the OS sandbox, from the same rules. |
| 3 | Realms and the owner live in a home outside every workspace | Kept | The server's home stays outside every workspace, out of agents' reach. |
| 2 | One hub, many clients | Kept | The server is the hub; the Mac client and the phone are its clients (155). |
| 1 | Blocking Rust, raw HTTP, few dependencies | Revisit | Blocking I/O fit one machine; re-decide for a server many devices reach, at phase 1. |
