//! The server. This first version listens on 127.0.0.1 only: reach it on
//! the same machine, or through an SSH tunnel. Device pairing and the
//! pinned certificate (decision 158) come before it listens on a network.

mod approvals;
mod http;
mod tools;

use a30m_core::{Block, Message, Run};
use a30m_store::{Home, Workspace};
use approvals::Approvals;
use std::collections::{BTreeMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tools::WorkspaceTools;

pub struct App {
    pub home: Home,
    pub token: String,
    /// The model a workspace uses when it has not chosen one.
    pub default_model: String,
    pub approvals: Approvals,
    /// Workspaces whose agent is working now.
    pub running: Mutex<HashSet<String>>,
    /// Each workspace's MCP servers, started on first use.
    pub mcp: Mutex<BTreeMap<String, Arc<Mutex<tools::McpHost>>>>,
    /// The last error per workspace, shown until the next message.
    pub errors: Mutex<BTreeMap<String, String>>,
}

const USAGE: &str = "usage: a30m-server --home <folder> [--port 7330] [--model provider/model]

  --home   where a30m keeps its workspaces. Use a folder of its own;
           never Airth v0's home (~/.airth).
  --port   port on 127.0.0.1 (default 7330)
  --model  the default model (anthropic/claude-sonnet-5-5); a workspace
           can choose its own. `echo` tries the interface without a key.

Providers and their keys, read from the environment:
  anthropic  ANTHROPIC_API_KEY     anthropic/claude-sonnet-5-5
  openai     OPENAI_API_KEY        openai/gpt-6.1-sol
  xai        XAI_API_KEY           xai/grok-4.7
  gemini     GEMINI_API_KEY        gemini/gemini-pro-latest
  ollama     (none, local)         ollama/llama3.3";

fn main() {
    let mut home: Option<PathBuf> = None;
    let mut port: u16 = 7330;
    let mut model_name =
        std::env::var("A30M_MODEL").unwrap_or_else(|_| "anthropic/claude-sonnet-5-5".into());
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--home" => home = args.next().map(PathBuf::from),
            "--port" => port = args.next().and_then(|p| p.parse().ok()).unwrap_or(0),
            "--model" => model_name = args.next().unwrap_or_default(),
            "--version" => {
                println!("a30m-server {}", env!("CARGO_PKG_VERSION"));
                return;
            }
            _ => {
                eprintln!("{USAGE}");
                std::process::exit(2);
            }
        }
    }
    let Some(home) = home else {
        eprintln!("{USAGE}");
        std::process::exit(2);
    };
    if port == 0 || model_name.is_empty() {
        eprintln!("{USAGE}");
        std::process::exit(2);
    }
    if let Some(user_home) = std::env::var_os("HOME") {
        let v0 = PathBuf::from(user_home).join(".airth");
        let same_folder = match (home.canonicalize(), v0.canonicalize()) {
            (Ok(a), Ok(b)) => a == b,
            _ => false,
        };
        if same_folder || home == v0 {
            eprintln!(
                "a30m-server: refusing Airth v0's home ({}). Give a folder of its own.",
                v0.display()
            );
            std::process::exit(2);
        }
    }
    let home = match Home::open(&home) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("a30m-server: {e}");
            std::process::exit(1);
        }
    };
    // A model without its key is not fatal: the owner sees why in the
    // workspace, and can pick another.
    if let Err(e) = a30m_models::connect(&model_name) {
        eprintln!("a30m-server: default model {model_name}: {e}");
    }
    let token = match http::random_token() {
        Ok(t) => t,
        Err(e) => {
            eprintln!("a30m-server: {e}");
            std::process::exit(1);
        }
    };
    let app = Arc::new(App {
        home,
        token,
        default_model: model_name,
        approvals: Approvals::default(),
        running: Mutex::new(HashSet::new()),
        mcp: Mutex::new(BTreeMap::new()),
        errors: Mutex::new(BTreeMap::new()),
    });
    if let Err(e) = http::serve(app, port) {
        eprintln!("a30m-server: {e}");
        std::process::exit(1);
    }
}

const SYSTEM: &str = "You are a30m, the owner's assistant, working in the workspace \"{name}\".

You work with tools: the workspace's folder (list_files, read_file, write_file), its skills (read_skill) and the services the owner connected. Use them to do the work rather than describing what you would do.

Some actions commit: they send, publish, pay, delete, or reach outside the workspace. When you call one, it waits for the owner's approval on their own; just call it. Never ask for approval in text instead. If the owner refuses, do not try the same action again: ask what to change.

Be brief. Answer in the language the owner writes in.";

pub fn system_prompt(ws: &Workspace) -> String {
    let mut s = SYSTEM.replace("{name}", &ws.info.name);
    let agents = ws.agents_md();
    if !agents.trim().is_empty() {
        s.push_str("\n\n# This workspace's instructions (AGENTS.md)\n\n");
        s.push_str(agents.trim());
    }
    let skills = ws.skills();
    if !skills.is_empty() {
        s.push_str("\n\n# Skills\n\nRead a skill with read_skill before you use it.\n");
        for skill in skills {
            s.push_str(&format!("\n- {}: {}", skill.name, skill.description));
        }
    }
    s
}

/// The workspace's model, or the server's default.
pub fn model_of<'a>(app: &'a App, ws: &'a Workspace) -> &'a str {
    ws.info.model.as_deref().unwrap_or(&app.default_model)
}

/// Adds the owner's message and runs the agent in the background.
pub fn start_turn(app: &Arc<App>, slug: &str, text: &str) -> Result<(), String> {
    let ws = app.home.workspace(slug)?;
    // Checked before the message is kept, so a missing key is said at once
    // and the conversation is not left waiting for an answer.
    a30m_models::connect(model_of(app, &ws))?;
    {
        let mut running = app.running.lock().map_err(|_| "busy")?;
        if !running.insert(slug.to_string()) {
            return Err("the agent is still working in this workspace".into());
        }
    }
    let mut messages = ws.conversation();
    messages.push(next_message(&messages, text));
    if let Err(e) = ws.save_conversation(&messages) {
        app.running.lock().map(|mut r| r.remove(slug)).ok();
        return Err(e);
    }
    if let Ok(mut errors) = app.errors.lock() {
        errors.remove(slug);
    }
    let app = Arc::clone(app);
    let slug = slug.to_string();
    std::thread::spawn(move || {
        let outcome = turn(&app, &ws, &mut messages);
        if let Err(e) = outcome
            && let Ok(mut errors) = app.errors.lock()
        {
            errors.insert(slug.clone(), e);
        }
        if let Ok(mut running) = app.running.lock() {
            running.remove(&slug);
        }
    });
    Ok(())
}

/// The owner's message. When the last turn stopped between a tool call
/// and its result (a restart while an action waited for the owner), the
/// calls are closed first, or the provider would refuse the conversation.
fn next_message(messages: &[Message], text: &str) -> Message {
    let mut content = Vec::new();
    if let Some(last) = messages.last()
        && last.role == a30m_core::Role::Assistant
    {
        for block in &last.content {
            if let Block::ToolUse { id, .. } = block {
                content.push(Block::ToolResult {
                    tool_use_id: id.clone(),
                    content: "Interrupted: the server stopped before this ran. It did not run."
                        .into(),
                    is_error: true,
                });
            }
        }
    }
    content.push(Block::Text {
        text: text.to_string(),
    });
    Message {
        role: a30m_core::Role::User,
        content,
    }
}

fn turn(app: &Arc<App>, ws: &Workspace, messages: &mut Vec<Message>) -> Result<(), String> {
    let host = tools::mcp_host(app, ws)?;
    let tools = WorkspaceTools::new(ws, host);
    let approver = approvals::Asker {
        approvals: &app.approvals,
        workspace: ws.info.slug.clone(),
    };
    let model = a30m_models::connect(model_of(app, ws))?;
    let system = system_prompt(ws);
    let run = Run {
        model: model.as_ref(),
        tools: &tools,
        approver: &approver,
        system: &system,
        max_steps: 40,
    };
    let result = a30m_core::run(&run, messages, &mut |m| {
        let _ = ws.save_conversation(m);
    });
    // A conversation must end on the assistant's word, or the next turn's
    // request is refused for a dangling tool call.
    if result.is_err()
        && messages
            .last()
            .is_some_and(|m| m.role == a30m_core::Role::User)
    {
        messages.push(Message {
            role: a30m_core::Role::Assistant,
            content: vec![Block::Text {
                text: "(stopped)".into(),
            }],
        });
        let _ = ws.save_conversation(messages);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn a_call_left_open_by_a_restart_is_closed_before_the_next_message() {
        let messages = vec![
            Message::user_text("publish it"),
            Message {
                role: a30m_core::Role::Assistant,
                content: vec![Block::ToolUse {
                    id: "t1".into(),
                    name: "mcp__x__post".into(),
                    input: json!({}),
                    extra: None,
                }],
            },
        ];
        let next = next_message(&messages, "still there?");
        assert!(
            matches!(&next.content[0], Block::ToolResult { tool_use_id, is_error: true, .. } if tool_use_id == "t1")
        );
        assert!(matches!(&next.content[1], Block::Text { text } if text == "still there?"));
        let plain = next_message(&[Message::user_text("a")], "b");
        assert_eq!(plain.content.len(), 1);
    }
}
