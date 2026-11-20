//! Model connectors (decision 166): Claude through the Anthropic Messages
//! API, and every OpenAI-compatible API (GPT, Grok, Gemini, Ollama).
//!
//! A model is named `provider/model`. Keys come from the server's
//! environment and go only to their provider; they never reach a
//! conversation or a tool.

use a30m_core::{Block, Model, ModelReply, ModelRequest, Role};
use serde_json::{Value, json};
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Style {
    Anthropic,
    OpenAi,
}

#[derive(Debug, Clone, Copy)]
pub struct Provider {
    pub name: &'static str,
    pub style: Style,
    pub base: &'static str,
    /// The environment variable holding the key; none for a local server.
    pub key_var: Option<&'static str>,
}

pub const PROVIDERS: &[Provider] = &[
    Provider {
        name: "anthropic",
        style: Style::Anthropic,
        base: "https://api.anthropic.com/v1",
        key_var: Some("ANTHROPIC_API_KEY"),
    },
    Provider {
        name: "openai",
        style: Style::OpenAi,
        base: "https://api.openai.com/v1",
        key_var: Some("OPENAI_API_KEY"),
    },
    Provider {
        name: "xai",
        style: Style::OpenAi,
        base: "https://api.x.ai/v1",
        key_var: Some("XAI_API_KEY"),
    },
    Provider {
        name: "gemini",
        style: Style::OpenAi,
        base: "https://generativelanguage.googleapis.com/v1beta/openai",
        key_var: Some("GEMINI_API_KEY"),
    },
    Provider {
        name: "ollama",
        style: Style::OpenAi,
        base: "http://127.0.0.1:11434/v1",
        key_var: None,
    },
];

/// Splits `provider/model`. A name with no provider is Anthropic's.
pub fn parse_spec(spec: &str) -> Result<(Provider, String), String> {
    let spec = spec.trim();
    let (provider, model) = spec.split_once('/').unwrap_or(("anthropic", spec));
    let allowed = !model.is_empty()
        && model.len() <= 128
        && model
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_.:/@".contains(c));
    if !allowed {
        return Err(format!("model name not allowed: {spec}"));
    }
    let found = PROVIDERS
        .iter()
        .find(|p| p.name == provider)
        .ok_or_else(|| {
            let known: Vec<&str> = PROVIDERS.iter().map(|p| p.name).collect();
            format!(
                "unknown provider {provider}: use one of {}",
                known.join(", ")
            )
        })?;
    Ok((*found, model.to_string()))
}

fn key_of(provider: &Provider) -> Option<String> {
    let var = provider.key_var?;
    std::env::var(var)
        .ok()
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty())
}

/// The providers a30m can call: those whose key is set, and the local ones.
pub fn available() -> Vec<&'static str> {
    PROVIDERS
        .iter()
        .filter(|p| p.key_var.is_none() || key_of(p).is_some())
        .map(|p| p.name)
        .collect()
}

/// The model a spec names, ready to answer; or why not.
pub fn connect(spec: &str) -> Result<Box<dyn Model>, String> {
    if spec.trim() == "echo" {
        return Ok(Box::new(Echo));
    }
    let (provider, model) = parse_spec(spec)?;
    let key = match provider.key_var {
        Some(var) => key_of(&provider).ok_or_else(|| {
            format!(
                "no key for {}: set {var} where the server runs",
                provider.name
            )
        })?,
        None => String::new(),
    };
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .http_status_as_error(false)
        .timeout_global(Some(Duration::from_secs(600)))
        .build()
        .into();
    let base = provider.base.to_string();
    Ok(match provider.style {
        Style::Anthropic => Box::new(Anthropic {
            key,
            model,
            base,
            agent,
        }),
        Style::OpenAi => Box::new(OpenAiCompatible {
            key,
            model,
            base,
            agent,
        }),
    })
}

fn post(
    agent: &ureq::Agent,
    url: &str,
    headers: &[(&str, &str)],
    body: &Value,
) -> Result<Value, String> {
    let mut request = agent.post(url).header("content-type", "application/json");
    for (k, v) in headers {
        request = request.header(*k, *v);
    }
    let mut response = request
        .send(body.to_string())
        .map_err(|e| format!("model provider unreachable: {e}"))?;
    let status = response.status().as_u16();
    let text = response
        .body_mut()
        .read_to_string()
        .map_err(|e| format!("model provider answer unreadable: {e}"))?;
    let value: Value =
        serde_json::from_str(&text).map_err(|_| format!("model provider answered {status}"))?;
    if !(200..300).contains(&status) {
        // Gemini's compatible endpoint wraps its error in a list.
        let message = value
            .pointer("/error/message")
            .or_else(|| value.pointer("/0/error/message"))
            .and_then(Value::as_str)
            .unwrap_or("no detail");
        return Err(format!("model provider answered {status}: {message}"));
    }
    Ok(value)
}

// ---------------------------------------------------------------- Anthropic

pub struct Anthropic {
    key: String,
    model: String,
    base: String,
    agent: ureq::Agent,
}

/// The Messages API request. Other providers' extras are removed: the API
/// refuses fields it does not know.
pub fn anthropic_body(model: &str, max_tokens: u32, request: &ModelRequest) -> Value {
    let mut messages = json!(request.messages);
    for m in messages.as_array_mut().into_iter().flatten() {
        for b in m
            .get_mut("content")
            .and_then(Value::as_array_mut)
            .into_iter()
            .flatten()
        {
            if let Some(o) = b.as_object_mut() {
                o.remove("extra");
            }
        }
    }
    let mut body = json!({
        "model": model,
        "max_tokens": max_tokens,
        "system": request.system,
        "messages": messages,
    });
    if !request.tools.is_empty() {
        body["tools"] = json!(request.tools);
    }
    body
}

/// Keeps the blocks a30m understands; anything else (thinking, citations)
/// is dropped rather than sent back half understood.
pub fn anthropic_parse(response: &Value) -> Result<Vec<Block>, String> {
    let content = response
        .get("content")
        .and_then(Value::as_array)
        .ok_or("the model's answer has no content")?;
    let mut out: Vec<Block> = content
        .iter()
        .filter_map(|b| serde_json::from_value(b.clone()).ok())
        .collect();
    if out.is_empty() {
        out.push(Block::Text {
            text: String::new(),
        });
    }
    Ok(out)
}

impl Model for Anthropic {
    fn reply(&self, request: &ModelRequest) -> Result<ModelReply, String> {
        let value = post(
            &self.agent,
            &format!("{}/messages", self.base),
            &[
                ("x-api-key", &self.key),
                ("anthropic-version", "2023-06-01"),
            ],
            &anthropic_body(&self.model, 8192, request),
        )?;
        Ok(ModelReply {
            content: anthropic_parse(&value)?,
        })
    }
}

// ---------------------------------------------------------- OpenAI-compatible

pub struct OpenAiCompatible {
    key: String,
    model: String,
    base: String,
    agent: ureq::Agent,
}

/// The Chat Completions request: the system prompt first, tool results as
/// `tool` messages, tool calls with their arguments as JSON text, and each
/// call's extras sent back as they came.
pub fn openai_body(model: &str, request: &ModelRequest) -> Value {
    let mut messages = vec![json!({"role": "system", "content": request.system})];
    for m in request.messages {
        let mut text = Vec::new();
        let mut calls = Vec::new();
        for b in &m.content {
            match b {
                Block::Text { text: t } if !t.is_empty() => text.push(t.clone()),
                Block::Text { .. } => {}
                Block::ToolResult {
                    tool_use_id,
                    content,
                    is_error,
                } => {
                    let content = if *is_error {
                        format!("Error: {content}")
                    } else {
                        content.clone()
                    };
                    messages.push(
                        json!({"role": "tool", "tool_call_id": tool_use_id, "content": content}),
                    );
                }
                Block::ToolUse {
                    id,
                    name,
                    input,
                    extra,
                } => {
                    let mut call = json!({
                        "id": id,
                        "type": "function",
                        "function": {"name": name, "arguments": input.to_string()},
                    });
                    if let (Some(Value::Object(more)), Some(o)) = (extra, call.as_object_mut()) {
                        for (k, v) in more {
                            o.entry(k.clone()).or_insert_with(|| v.clone());
                        }
                    }
                    calls.push(call);
                }
            }
        }
        match m.role {
            Role::User => {
                if !text.is_empty() {
                    messages.push(json!({"role": "user", "content": text.join("\n\n")}));
                }
            }
            Role::Assistant => {
                let mut message = json!({"role": "assistant", "content": null});
                if !text.is_empty() {
                    message["content"] = json!(text.join("\n\n"));
                }
                if !calls.is_empty() {
                    message["tool_calls"] = json!(calls);
                }
                messages.push(message);
            }
        }
    }
    let mut body = json!({"model": model, "messages": messages});
    if !request.tools.is_empty() {
        let tools: Vec<Value> = request
            .tools
            .iter()
            .map(|t| {
                json!({"type": "function", "function": {
                    "name": t.name, "description": t.description, "parameters": t.input_schema
                }})
            })
            .collect();
        body["tools"] = json!(tools);
    }
    body
}

/// Reads the first choice. Fields of a tool call a30m does not use (a
/// thought signature, say) are kept, to be sent back with it.
pub fn openai_parse(response: &Value) -> Result<Vec<Block>, String> {
    let message = response
        .pointer("/choices/0/message")
        .ok_or("the model's answer has no message")?;
    let mut out = Vec::new();
    if let Some(text) = message.get("content").and_then(Value::as_str)
        && !text.is_empty()
    {
        out.push(Block::Text {
            text: text.to_string(),
        });
    }
    let calls = message.get("tool_calls").and_then(Value::as_array);
    for (n, call) in calls.into_iter().flatten().enumerate() {
        let name = call
            .pointer("/function/name")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let arguments = call
            .pointer("/function/arguments")
            .and_then(Value::as_str)
            .unwrap_or("{}");
        // Unparsable arguments go to the tool as they are; the tool's own
        // checks refuse them and the model sees why.
        let input =
            serde_json::from_str(arguments).unwrap_or_else(|_| json!({"_unparsed": arguments}));
        let id = call
            .get("id")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
            .map_or_else(|| format!("call_{n}"), String::from);
        let mut rest = call.as_object().cloned().unwrap_or_default();
        for k in ["id", "type", "function", "index"] {
            rest.remove(k);
        }
        out.push(Block::ToolUse {
            id,
            name,
            input,
            extra: (!rest.is_empty()).then_some(Value::Object(rest)),
        });
    }
    if out.is_empty() {
        out.push(Block::Text {
            text: String::new(),
        });
    }
    Ok(out)
}

impl Model for OpenAiCompatible {
    fn reply(&self, request: &ModelRequest) -> Result<ModelReply, String> {
        let auth = format!("Bearer {}", self.key);
        let headers: &[(&str, &str)] = if self.key.is_empty() {
            &[]
        } else {
            &[("authorization", &auth)]
        };
        let value = post(
            &self.agent,
            &format!("{}/chat/completions", self.base),
            headers,
            &openai_body(&self.model, request),
        )?;
        Ok(ModelReply {
            content: openai_parse(&value)?,
        })
    }
}

// --------------------------------------------------------------------- Echo

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
                text: format!("(echo model) You said: {last}"),
            }],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use a30m_core::{Message, ToolSpec};

    fn tools() -> Vec<ToolSpec> {
        vec![ToolSpec {
            name: "read_file".into(),
            description: "d".into(),
            input_schema: json!({"type": "object"}),
        }]
    }

    fn conversation() -> Vec<Message> {
        vec![
            Message::user_text("hi"),
            Message {
                role: Role::Assistant,
                content: vec![
                    Block::Text {
                        text: "Reading.".into(),
                    },
                    Block::ToolUse {
                        id: "c1".into(),
                        name: "read_file".into(),
                        input: json!({"path": "a"}),
                        extra: Some(
                            json!({"extra_content": {"google": {"thought_signature": "sig"}}}),
                        ),
                    },
                ],
            },
            Message {
                role: Role::User,
                content: vec![
                    Block::ToolResult {
                        tool_use_id: "c1".into(),
                        content: "nope".into(),
                        is_error: true,
                    },
                    Block::Text {
                        text: "and now?".into(),
                    },
                ],
            },
        ]
    }

    #[test]
    fn specs_name_a_provider_and_a_model() {
        assert_eq!(parse_spec("openai/gpt-5").unwrap().1, "gpt-5");
        assert_eq!(parse_spec("claude-sonnet-5-5").unwrap().0.name, "anthropic");
        assert_eq!(parse_spec("ollama/llama3.3:70b").unwrap().0.name, "ollama");
        assert_eq!(parse_spec("openai/org/model").unwrap().1, "org/model");
        assert!(parse_spec("acme/x").is_err());
        assert!(parse_spec("openai/").is_err());
        assert!(parse_spec("openai/a b").is_err());
        assert!(parse_spec("openai/a?b=1").is_err());
    }

    #[test]
    fn the_anthropic_request_carries_no_foreign_fields() {
        let messages = conversation();
        let tools = tools();
        let request = |tools| ModelRequest {
            system: "s",
            messages: &messages,
            tools,
        };
        let body = anthropic_body("m", 10, &request(&tools));
        let call = &body["messages"][1]["content"][1];
        assert_eq!(call["type"], "tool_use");
        assert!(call.get("extra").is_none());
        assert_eq!(body["tools"][0]["name"], "read_file");
        assert!(
            anthropic_body("m", 10, &request(&[]))
                .get("tools")
                .is_none()
        );
    }

    #[test]
    fn the_openai_request_maps_calls_results_and_extras() {
        let messages = conversation();
        let tools = tools();
        let body = openai_body(
            "m",
            &ModelRequest {
                system: "s",
                messages: &messages,
                tools: &tools,
            },
        );
        let m = &body["messages"];
        assert_eq!(m[0]["role"], "system");
        assert_eq!(m[1]["content"], "hi");
        assert_eq!(m[2]["content"], "Reading.");
        let call = &m[2]["tool_calls"][0];
        assert_eq!(call["function"]["arguments"], "{\"path\":\"a\"}");
        assert_eq!(call["extra_content"]["google"]["thought_signature"], "sig");
        assert_eq!(m[3]["role"], "tool");
        assert_eq!(m[3]["tool_call_id"], "c1");
        assert_eq!(m[3]["content"], "Error: nope");
        assert_eq!(m[4]["role"], "user");
        assert_eq!(m[4]["content"], "and now?");
        assert_eq!(body["tools"][0]["function"]["name"], "read_file");
    }

    #[test]
    fn the_openai_answer_becomes_blocks() {
        let answer = json!({"choices": [{"message": {
            "content": null,
            "tool_calls": [
                {"id": "x1", "type": "function",
                 "function": {"name": "read_file", "arguments": "{\"path\":\"b\"}"},
                 "extra_content": {"google": {"thought_signature": "s2"}}},
                {"type": "function", "function": {"name": "list_files", "arguments": "not json"}}
            ]
        }}]});
        let blocks = openai_parse(&answer).unwrap();
        assert_eq!(blocks.len(), 2);
        let Block::ToolUse {
            id, input, extra, ..
        } = &blocks[0]
        else {
            panic!("not a call: {:?}", blocks[0]);
        };
        assert_eq!(id, "x1");
        assert_eq!(input["path"], "b");
        assert_eq!(
            extra.as_ref().unwrap()["extra_content"]["google"]["thought_signature"],
            "s2"
        );
        let Block::ToolUse {
            id, input, extra, ..
        } = &blocks[1]
        else {
            panic!("not a call: {:?}", blocks[1]);
        };
        assert_eq!(id, "call_1");
        assert_eq!(input["_unparsed"], "not json");
        assert!(extra.is_none());
    }

    #[test]
    fn a_text_answer_is_one_block() {
        let answer = json!({"choices": [{"message": {"role": "assistant", "content": "hello"}}]});
        assert_eq!(
            openai_parse(&answer).unwrap(),
            vec![Block::Text {
                text: "hello".into()
            }]
        );
        assert!(openai_parse(&json!({"choices": []})).is_err());
    }

    #[test]
    fn unknown_anthropic_blocks_are_dropped() {
        let answer = json!({"content": [
            {"type": "thinking", "thinking": "..."},
            {"type": "text", "text": "hello"},
            {"type": "tool_use", "id": "t1", "name": "read_file", "input": {"path": "a"}}
        ]});
        let blocks = anthropic_parse(&answer).unwrap();
        assert_eq!(blocks.len(), 2);
        assert!(matches!(&blocks[1], Block::ToolUse { name, .. } if name == "read_file"));
    }

    #[test]
    fn local_and_test_models_need_no_key() {
        assert!(connect("echo").is_ok());
        assert!(connect("ollama/llama3").is_ok());
        assert!(connect("acme/x").is_err());
        assert!(available().contains(&"ollama"));
    }
}
