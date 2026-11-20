//! Model providers. One for now: the Anthropic Messages API.
//!
//! The key is read from the server's environment and goes only to the
//! provider; it never reaches a conversation or a tool.

use a30m_core::{Block, Model, ModelReply, ModelRequest};
use serde_json::{Value, json};
use std::time::Duration;

const URL: &str = "https://api.anthropic.com/v1/messages";
const VERSION: &str = "2023-06-01";

pub struct Anthropic {
    key: String,
    model: String,
    max_tokens: u32,
    agent: ureq::Agent,
}

impl Anthropic {
    pub fn new(key: String, model: String) -> Anthropic {
        let agent = ureq::Agent::config_builder()
            .http_status_as_error(false)
            .timeout_global(Some(Duration::from_secs(600)))
            .build()
            .into();
        Anthropic {
            key,
            model,
            max_tokens: 8192,
            agent,
        }
    }
}

/// The request body, apart from the key.
pub fn body(model: &str, max_tokens: u32, request: &ModelRequest) -> Value {
    let mut body = json!({
        "model": model,
        "max_tokens": max_tokens,
        "system": request.system,
        "messages": request.messages,
    });
    if !request.tools.is_empty() {
        body["tools"] = json!(request.tools);
    }
    body
}

/// Keeps the blocks a30m understands; anything else (thinking, citations)
/// is dropped rather than sent back half understood.
pub fn parse(response: &Value) -> Result<Vec<Block>, String> {
    let content = response
        .get("content")
        .and_then(Value::as_array)
        .ok_or("the model's answer has no content")?;
    let mut out = Vec::new();
    for block in content {
        if let Ok(b) = serde_json::from_value::<Block>(block.clone()) {
            out.push(b);
        }
    }
    if out.is_empty() {
        out.push(Block::Text {
            text: String::new(),
        });
    }
    Ok(out)
}

impl Model for Anthropic {
    fn reply(&self, request: &ModelRequest) -> Result<ModelReply, String> {
        let body = body(&self.model, self.max_tokens, request);
        let mut response = self
            .agent
            .post(URL)
            .header("x-api-key", &self.key)
            .header("anthropic-version", VERSION)
            .header("content-type", "application/json")
            .send(body.to_string())
            .map_err(|e| format!("model provider unreachable: {e}"))?;
        let status = response.status().as_u16();
        let text = response
            .body_mut()
            .read_to_string()
            .map_err(|e| format!("model provider answer unreadable: {e}"))?;
        let value: Value =
            serde_json::from_str(&text).map_err(|_| format!("model provider answered {status}"))?;
        if status != 200 {
            let message = value
                .pointer("/error/message")
                .and_then(Value::as_str)
                .unwrap_or("no detail");
            return Err(format!("model provider answered {status}: {message}"));
        }
        Ok(ModelReply {
            content: parse(&value)?,
        })
    }
}

/// A model that needs no key: it repeats what it is told. For trying the
/// interface without spending anything.
pub struct Echo;

impl Model for Echo {
    fn reply(&self, request: &ModelRequest) -> Result<ModelReply, String> {
        let last = request
            .messages
            .iter()
            .rev()
            .find_map(|m| {
                m.content.iter().find_map(|b| match b {
                    Block::Text { text } => Some(text.clone()),
                    _ => None,
                })
            })
            .unwrap_or_default();
        Ok(ModelReply {
            content: vec![Block::Text {
                text: format!("(echo model, no key set) You said: {last}"),
            }],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use a30m_core::{Message, ToolSpec};

    #[test]
    fn the_request_carries_tools_only_when_there_are_some() {
        let messages = vec![Message::user_text("hi")];
        let none = body(
            "m",
            10,
            &ModelRequest {
                system: "s",
                messages: &messages,
                tools: &[],
            },
        );
        assert!(none.get("tools").is_none());
        let tools = vec![ToolSpec {
            name: "read_file".into(),
            description: "d".into(),
            input_schema: json!({"type": "object"}),
        }];
        let some = body(
            "m",
            10,
            &ModelRequest {
                system: "s",
                messages: &messages,
                tools: &tools,
            },
        );
        assert_eq!(some["tools"][0]["name"], "read_file");
        assert_eq!(some["messages"][0]["content"][0]["type"], "text");
    }

    #[test]
    fn unknown_blocks_are_dropped() {
        let answer = json!({"content": [
            {"type": "thinking", "thinking": "..."},
            {"type": "text", "text": "hello"},
            {"type": "tool_use", "id": "t1", "name": "read_file", "input": {"path": "a"}}
        ]});
        let blocks = parse(&answer).unwrap();
        assert_eq!(blocks.len(), 2);
        assert!(matches!(&blocks[1], Block::ToolUse { name, .. } if name == "read_file"));
    }
}
