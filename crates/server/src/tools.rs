//! The tools an agent gets in a workspace: its folder, its skills, and the
//! MCP servers the workspace's agent declares. Each tool has a class the
//! gate reads (decision 163).

use crate::App;
use a30m_core::{ToolSpec, Tools};
use a30m_gate::{Class, class_of_mcp_tool, contained};
use a30m_store::Workspace;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

const MAX_READ: u64 = 256 * 1024;
/// The most a tool's result may put in the conversation, in bytes. Every
/// turn sends the whole conversation, so one huge result would make each
/// later turn costly and soon overflow the model's context.
const MAX_RESULT: usize = 100_000;

fn bounded(text: String) -> String {
    if text.len() <= MAX_RESULT {
        return text;
    }
    let mut cut = MAX_RESULT;
    while !text.is_char_boundary(cut) {
        cut -= 1;
    }
    format!(
        "{}\n[cut: {} more bytes not shown; ask for a narrower result]",
        &text[..cut],
        text.len() - cut
    )
}

#[derive(Default)]
pub struct McpHost {
    pub servers: BTreeMap<String, a30m_mcp::Server>,
    /// Servers that would not start, and why.
    pub errors: Vec<String>,
}

/// The workspace's MCP servers, started on first use and kept running.
pub fn mcp_host(app: &Arc<App>, ws: &Workspace) -> Result<Arc<Mutex<McpHost>>, String> {
    let mut hosts = app.mcp.lock().map_err(|_| "busy")?;
    if let Some(host) = hosts.get(&ws.info.slug) {
        return Ok(Arc::clone(host));
    }
    let mut host = McpHost::default();
    for (name, config) in ws.mcp_servers()? {
        match a30m_mcp::Server::start(&config.command, &config.args, &config.env, &ws.files_dir()) {
            Ok(server) => {
                host.servers.insert(name, server);
            }
            Err(e) => host.errors.push(format!("{name}: {e}")),
        }
    }
    let host = Arc::new(Mutex::new(host));
    hosts.insert(ws.info.slug.clone(), Arc::clone(&host));
    Ok(host)
}

/// Stops a workspace's MCP servers, so the next turn starts them again
/// from its current `mcp.json`.
pub fn forget_mcp(app: &App, slug: &str) {
    if let Ok(mut hosts) = app.mcp.lock() {
        hosts.remove(slug);
    }
}

/// A name the Messages API accepts: letters, digits, `_` and `-`, 64 at most.
fn tool_name(server: &str, tool: &str) -> String {
    let raw = format!("mcp__{server}__{tool}");
    raw.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .take(64)
        .collect()
}

struct McpTool {
    server: String,
    tool: String,
    read_only: Option<bool>,
    description: String,
    schema: Value,
}

pub struct WorkspaceTools<'a> {
    ws: &'a Workspace,
    host: Arc<Mutex<McpHost>>,
    mcp: BTreeMap<String, McpTool>,
}

impl<'a> WorkspaceTools<'a> {
    pub fn new(ws: &'a Workspace, host: Arc<Mutex<McpHost>>) -> WorkspaceTools<'a> {
        let mut mcp = BTreeMap::new();
        if let Ok(h) = host.lock() {
            for (server_name, server) in &h.servers {
                for t in &server.tools {
                    mcp.insert(
                        tool_name(server_name, &t.name),
                        McpTool {
                            server: server_name.clone(),
                            tool: t.name.clone(),
                            read_only: t.read_only,
                            description: t.description.clone(),
                            schema: t.input_schema.clone(),
                        },
                    );
                }
            }
        }
        WorkspaceTools { ws, host, mcp }
    }

    fn arg<'v>(input: &'v Value, key: &str) -> Result<&'v str, String> {
        input
            .get(key)
            .and_then(Value::as_str)
            .ok_or(format!("missing `{key}`"))
    }

    fn list_files(&self, input: &Value) -> Result<String, String> {
        let rel = input.get("path").and_then(Value::as_str).unwrap_or("");
        let dir = contained(&self.ws.files_dir(), rel)?;
        let mut names: Vec<String> = std::fs::read_dir(&dir)
            .map_err(|e| format!("{rel}: {e}"))?
            .flatten()
            .map(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                match e.file_type() {
                    Ok(t) if t.is_dir() => format!("{name}/"),
                    _ => name,
                }
            })
            .collect();
        names.sort();
        if names.is_empty() {
            return Ok("(empty)".into());
        }
        Ok(names.join("\n"))
    }

    fn read_file(&self, input: &Value) -> Result<String, String> {
        let rel = Self::arg(input, "path")?;
        let path = contained(&self.ws.files_dir(), rel)?;
        let meta = std::fs::metadata(&path).map_err(|e| format!("{rel}: {e}"))?;
        if meta.len() > MAX_READ {
            return Err(format!("{rel} is larger than {} KB", MAX_READ / 1024));
        }
        let bytes = std::fs::read(&path).map_err(|e| format!("{rel}: {e}"))?;
        String::from_utf8(bytes).map_err(|_| format!("{rel} is not text"))
    }

    fn write_file(&self, input: &Value) -> Result<String, String> {
        let rel = Self::arg(input, "path")?;
        let content = Self::arg(input, "content")?;
        let path = contained(&self.ws.files_dir(), rel)?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        // Checked again once the folders exist, in case one was a link.
        contained(&self.ws.files_dir(), rel)?;
        std::fs::write(&path, content).map_err(|e| format!("{rel}: {e}"))?;
        Ok(format!("wrote {rel} ({} bytes)", content.len()))
    }
}

impl Tools for WorkspaceTools<'_> {
    fn specs(&self) -> Vec<ToolSpec> {
        let mut specs = vec![
            ToolSpec {
                name: "list_files".into(),
                description: "List a folder of the workspace. `path` is relative to the workspace's folder; empty for its top.".into(),
                input_schema: json!({"type": "object", "properties": {"path": {"type": "string"}}}),
            },
            ToolSpec {
                name: "read_file".into(),
                description: "Read a text file of the workspace, by its path relative to the workspace's folder.".into(),
                input_schema: json!({"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}),
            },
            ToolSpec {
                name: "write_file".into(),
                description: "Create or replace a text file in the workspace's folder.".into(),
                input_schema: json!({"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}),
            },
            ToolSpec {
                name: "read_skill".into(),
                description: "Read one of the workspace's skills, by its name, before using it.".into(),
                input_schema: json!({"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}),
            },
        ];
        for (name, t) in &self.mcp {
            specs.push(ToolSpec {
                name: name.clone(),
                description: t.description.clone(),
                input_schema: t.schema.clone(),
            });
        }
        specs
    }

    fn class(&self, name: &str) -> Class {
        match name {
            "list_files" | "read_file" | "read_skill" => Class::Read,
            "write_file" => Class::Reversible,
            _ => {
                let owner = self
                    .ws
                    .info
                    .tool_classes
                    .get(name)
                    .and_then(|c| Class::parse(c));
                let hint = self.mcp.get(name).and_then(|t| t.read_only);
                class_of_mcp_tool(hint, owner)
            }
        }
    }

    fn call(&self, name: &str, input: &Value) -> Result<String, String> {
        self.run(name, input).map(bounded).map_err(bounded)
    }
}

impl WorkspaceTools<'_> {
    fn run(&self, name: &str, input: &Value) -> Result<String, String> {
        match name {
            "list_files" => self.list_files(input),
            "read_file" => self.read_file(input),
            "write_file" => self.write_file(input),
            "read_skill" => self.ws.skill_text(Self::arg(input, "name")?),
            _ => {
                let t = self.mcp.get(name).ok_or(format!("no tool named {name}"))?;
                let mut host = self.host.lock().map_err(|_| "busy")?;
                let server = host
                    .servers
                    .get_mut(&t.server)
                    .ok_or(format!("MCP server {} is not running", t.server))?;
                server.call(&t.tool, input)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn workspace(tag: &str) -> (std::path::PathBuf, a30m_store::Workspace) {
        let dir = std::env::temp_dir().join(format!("a30m-tools-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let home = a30m_store::Home::open(&dir).unwrap();
        let ws = home.create("test").unwrap();
        (dir, ws)
    }

    #[test]
    fn long_results_are_cut_on_a_character() {
        assert_eq!(bounded("short".into()), "short");
        let long = "é".repeat(MAX_RESULT);
        let cut = bounded(long);
        assert!(cut.len() < MAX_RESULT + 100);
        assert!(cut.ends_with("ask for a narrower result]"));
    }

    #[test]
    fn built_in_tools_are_classed_and_unknown_ones_commit() {
        let (dir, mut ws) = workspace("class");
        ws.info
            .tool_classes
            .insert("mcp__x__safe".into(), "read".into());
        let tools = WorkspaceTools::new(&ws, Arc::new(Mutex::new(McpHost::default())));
        assert_eq!(tools.class("read_file"), Class::Read);
        assert_eq!(tools.class("write_file"), Class::Reversible);
        assert_eq!(tools.class("mcp__x__anything"), Class::Commits);
        assert_eq!(tools.class("mcp__x__safe"), Class::Read);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn file_tools_stay_in_the_workspace_folder() {
        let (dir, ws) = workspace("files");
        let tools = WorkspaceTools::new(&ws, Arc::new(Mutex::new(McpHost::default())));
        tools
            .call(
                "write_file",
                &json!({"path": "notes/a.md", "content": "hi"}),
            )
            .unwrap();
        assert_eq!(
            tools
                .call("read_file", &json!({"path": "notes/a.md"}))
                .unwrap(),
            "hi"
        );
        assert!(
            tools
                .call("read_file", &json!({"path": "../workspace.json"}))
                .is_err()
        );
        assert!(
            tools
                .call("read_file", &json!({"path": "../agent/AGENTS.md"}))
                .is_err()
        );
        assert!(
            tools
                .call(
                    "write_file",
                    &json!({"path": "../agent/mcp.json", "content": "{}"})
                )
                .is_err()
        );
        assert!(
            tools
                .call("read_skill", &json!({"name": "../../x"}))
                .is_err()
        );
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn mcp_tool_names_fit_the_messages_api() {
        assert_eq!(
            tool_name("github", "create_issue"),
            "mcp__github__create_issue"
        );
        assert_eq!(tool_name("a.b", "x/y z"), "mcp__a_b__x_y_z");
        assert!(tool_name("s", &"x".repeat(100)).len() <= 64);
    }
}
