//! A client for MCP servers over stdio: start the server, list its tools,
//! call them. Remote (HTTP) servers come later.
//!
//! The server runs as a child process with the owner's rights. It is not
//! sandboxed yet: only connect servers you trust.

use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{Receiver, RecvTimeoutError, channel};
use std::time::{Duration, Instant};

const PROTOCOL: &str = "2025-06-18";
const TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, Clone)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
    /// The server's `annotations.readOnlyHint`, when it gives one.
    pub read_only: Option<bool>,
}

pub struct Server {
    child: Child,
    stdin: ChildStdin,
    lines: Receiver<String>,
    next_id: u64,
    pub tools: Vec<Tool>,
}

impl Server {
    pub fn start(
        command: &str,
        args: &[String],
        env: &BTreeMap<String, String>,
        cwd: &std::path::Path,
    ) -> Result<Server, String> {
        let mut child = Command::new(command)
            .args(args)
            .envs(env)
            .current_dir(cwd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("cannot start {command}: {e}"))?;
        let stdin = child.stdin.take().ok_or("no stdin")?;
        let stdout = child.stdout.take().ok_or("no stdout")?;
        let (tx, lines) = channel();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                let Ok(line) = line else { break };
                if tx.send(line).is_err() {
                    break;
                }
            }
        });
        let mut server = Server {
            child,
            stdin,
            lines,
            next_id: 1,
            tools: Vec::new(),
        };
        server.request(
            "initialize",
            json!({
                "protocolVersion": PROTOCOL,
                "capabilities": {},
                "clientInfo": {"name": "a30m", "version": env!("CARGO_PKG_VERSION")}
            }),
        )?;
        server.notify("notifications/initialized")?;
        server.tools = server.list_tools()?;
        Ok(server)
    }

    fn send(&mut self, message: &Value) -> Result<(), String> {
        let mut line = message.to_string();
        line.push('\n');
        self.stdin
            .write_all(line.as_bytes())
            .and_then(|_| self.stdin.flush())
            .map_err(|e| format!("MCP server stopped: {e}"))
    }

    fn notify(&mut self, method: &str) -> Result<(), String> {
        self.send(&json!({"jsonrpc": "2.0", "method": method}))
    }

    fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;
        self.send(&json!({"jsonrpc": "2.0", "id": id, "method": method, "params": params}))?;
        let deadline = Instant::now() + TIMEOUT;
        loop {
            let left = deadline.saturating_duration_since(Instant::now());
            let line = match self.lines.recv_timeout(left) {
                Ok(line) => line,
                Err(RecvTimeoutError::Timeout) => {
                    return Err(format!("MCP server did not answer {method}"));
                }
                Err(RecvTimeoutError::Disconnected) => return Err("MCP server stopped".into()),
            };
            let Ok(message) = serde_json::from_str::<Value>(&line) else {
                continue; // a log line on stdout
            };
            if message.get("id") != Some(&json!(id)) {
                continue; // a notification, or a request we do not serve
            }
            if let Some(error) = message.get("error") {
                let text = error
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or("error");
                return Err(format!("MCP {method}: {text}"));
            }
            return Ok(message.get("result").cloned().unwrap_or(Value::Null));
        }
    }

    fn list_tools(&mut self) -> Result<Vec<Tool>, String> {
        let mut tools = Vec::new();
        let mut cursor: Option<String> = None;
        loop {
            let params = match &cursor {
                Some(c) => json!({"cursor": c}),
                None => json!({}),
            };
            let result = self.request("tools/list", params)?;
            for t in result
                .get("tools")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default()
            {
                let Some(name) = t.get("name").and_then(Value::as_str) else {
                    continue;
                };
                tools.push(Tool {
                    name: name.to_string(),
                    description: t
                        .get("description")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    input_schema: t
                        .get("inputSchema")
                        .cloned()
                        .unwrap_or(json!({"type": "object"})),
                    read_only: t
                        .pointer("/annotations/readOnlyHint")
                        .and_then(Value::as_bool),
                });
            }
            cursor = result
                .get("nextCursor")
                .and_then(Value::as_str)
                .map(String::from);
            if cursor.is_none() {
                return Ok(tools);
            }
        }
    }

    /// Calls a tool; its text content comes back as one string.
    pub fn call(&mut self, tool: &str, arguments: &Value) -> Result<String, String> {
        let result = self.request("tools/call", json!({"name": tool, "arguments": arguments}))?;
        let text = result_text(&result);
        if result.get("isError").and_then(Value::as_bool) == Some(true) {
            return Err(text);
        }
        Ok(text)
    }
}

pub fn result_text(result: &Value) -> String {
    let mut parts = Vec::new();
    for item in result
        .get("content")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
    {
        match item.get("type").and_then(Value::as_str) {
            Some("text") => parts.push(
                item.get("text")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string(),
            ),
            Some(other) => parts.push(format!("[{other} content]")),
            None => {}
        }
    }
    if parts.is_empty()
        && let Some(structured) = result.get("structuredContent")
    {
        return structured.to_string();
    }
    parts.join("\n")
}

impl Drop for Server {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_content_is_joined_and_other_kinds_are_named() {
        let r = json!({"content": [
            {"type": "text", "text": "a"},
            {"type": "image", "data": "..."},
            {"type": "text", "text": "b"}
        ]});
        assert_eq!(result_text(&r), "a\n[image content]\nb");
    }

    /// A tiny MCP server written in shell, answering one request per line.
    #[cfg(unix)]
    #[test]
    fn a_stdio_server_is_started_listed_and_called() {
        let script = r#"
while IFS= read -r line; do
  id=$(printf '%s' "$line" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
  case "$line" in
    *'"initialize"'*) printf '{"jsonrpc":"2.0","id":%s,"result":{"protocolVersion":"2025-06-18","capabilities":{},"serverInfo":{"name":"t","version":"1"}}}\n' "$id" ;;
    *'"tools/list"'*) echo 'log line on stdout'; printf '{"jsonrpc":"2.0","id":%s,"result":{"tools":[{"name":"hello","description":"Say hello","inputSchema":{"type":"object"},"annotations":{"readOnlyHint":true}},{"name":"post","inputSchema":{"type":"object"}}]}}\n' "$id" ;;
    *'"tools/call"'*) printf '{"jsonrpc":"2.0","id":%s,"result":{"content":[{"type":"text","text":"hello there"}]}}\n' "$id" ;;
  esac
done
"#;
        let mut server = Server::start(
            "sh",
            &["-c".to_string(), script.to_string()],
            &BTreeMap::new(),
            &std::env::temp_dir(),
        )
        .unwrap();
        assert_eq!(server.tools.len(), 2);
        assert_eq!(server.tools[0].read_only, Some(true));
        assert_eq!(server.tools[1].read_only, None);
        assert_eq!(server.call("hello", &json!({})).unwrap(), "hello there");
    }
}
