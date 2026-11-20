//! The engine: a conversation, an agent loop with tools, and the gate
//! between the agent and what commits (decision 163).
//!
//! Nothing here touches the network or the disk. The model, the tools and
//! the owner's approvals come in through traits, so the loop is tested
//! with a scripted model.

use a30m_gate::{Class, Decision, decide};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
}

/// A block of a message, in the shape the Anthropic Messages API uses.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Block {
    Text {
        text: String,
    },
    ToolUse {
        id: String,
        name: String,
        input: Value,
    },
    ToolResult {
        tool_use_id: String,
        content: String,
        #[serde(default, skip_serializing_if = "std::ops::Not::not")]
        is_error: bool,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: Vec<Block>,
}

impl Message {
    pub fn user_text(text: &str) -> Message {
        Message {
            role: Role::User,
            content: vec![Block::Text {
                text: text.to_string(),
            }],
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ToolSpec {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

pub struct ModelRequest<'a> {
    pub system: &'a str,
    pub messages: &'a [Message],
    pub tools: &'a [ToolSpec],
}

pub struct ModelReply {
    pub content: Vec<Block>,
}

pub trait Model: Send + Sync {
    fn reply(&self, request: &ModelRequest) -> Result<ModelReply, String>;
}

pub trait Tools {
    fn specs(&self) -> Vec<ToolSpec>;
    fn class(&self, name: &str) -> Class;
    fn call(&self, name: &str, input: &Value) -> Result<String, String>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Verdict {
    Approved,
    Refused(String),
}

/// Asks the owner, and blocks until they answer.
pub trait Approver {
    fn ask(&self, tool: &str, input: &Value, class: Class) -> Verdict;
}

pub struct Run<'a> {
    pub model: &'a dyn Model,
    pub tools: &'a dyn Tools,
    pub approver: &'a dyn Approver,
    pub system: &'a str,
    /// The most model calls one turn may make.
    pub max_steps: usize,
}

/// Runs the agent until it answers without calling a tool. `changed` is
/// called after each step, so the conversation can be saved and shown.
pub fn run(
    r: &Run,
    messages: &mut Vec<Message>,
    changed: &mut dyn FnMut(&[Message]),
) -> Result<(), String> {
    let specs = r.tools.specs();
    for _ in 0..r.max_steps {
        let reply = r.model.reply(&ModelRequest {
            system: r.system,
            messages,
            tools: &specs,
        })?;
        let calls: Vec<(String, String, Value)> = reply
            .content
            .iter()
            .filter_map(|b| match b {
                Block::ToolUse { id, name, input } => {
                    Some((id.clone(), name.clone(), input.clone()))
                }
                _ => None,
            })
            .collect();
        messages.push(Message {
            role: Role::Assistant,
            content: reply.content,
        });
        changed(messages);
        if calls.is_empty() {
            return Ok(());
        }
        let mut results = Vec::new();
        for (id, name, input) in calls {
            let (content, is_error) = match gated_call(r, &name, &input) {
                Ok(out) => (out, false),
                Err(err) => (err, true),
            };
            results.push(Block::ToolResult {
                tool_use_id: id,
                content,
                is_error,
            });
        }
        messages.push(Message {
            role: Role::User,
            content: results,
        });
        changed(messages);
    }
    Err(format!("stopped after {} steps", r.max_steps))
}

/// Every tool call goes through here: the gate decides, the owner answers
/// what commits, and only then does the tool run.
fn gated_call(r: &Run, name: &str, input: &Value) -> Result<String, String> {
    let class = r.tools.class(name);
    if decide(class) == Decision::AskOwner
        && let Verdict::Refused(reason) = r.approver.ask(name, input, class)
    {
        let why = if reason.trim().is_empty() {
            "no reason given".to_string()
        } else {
            reason
        };
        return Err(format!(
            "The owner refused this action ({why}). Do not try it again; ask what to change."
        ));
    }
    r.tools.call(name, input)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::cell::RefCell;
    use std::sync::Mutex;

    /// A model that plays back replies, one per call.
    struct Script(Mutex<Vec<Vec<Block>>>);

    impl Model for Script {
        fn reply(&self, _: &ModelRequest) -> Result<ModelReply, String> {
            let mut replies = self.0.lock().unwrap();
            if replies.is_empty() {
                return Err("script ended".into());
            }
            Ok(ModelReply {
                content: replies.remove(0),
            })
        }
    }

    #[derive(Default)]
    struct Recorder(RefCell<Vec<String>>);

    impl Tools for Recorder {
        fn specs(&self) -> Vec<ToolSpec> {
            Vec::new()
        }
        fn class(&self, name: &str) -> Class {
            match name {
                "read" => Class::Read,
                "write" => Class::Reversible,
                _ => Class::Commits,
            }
        }
        fn call(&self, name: &str, _: &Value) -> Result<String, String> {
            self.0.borrow_mut().push(name.to_string());
            Ok(format!("{name} done"))
        }
    }

    struct Owner(Verdict, RefCell<usize>);

    impl Approver for Owner {
        fn ask(&self, _: &str, _: &Value, _: Class) -> Verdict {
            *self.1.borrow_mut() += 1;
            self.0.clone()
        }
    }

    fn call(id: &str, name: &str) -> Block {
        Block::ToolUse {
            id: id.into(),
            name: name.into(),
            input: json!({}),
        }
    }

    fn text(t: &str) -> Block {
        Block::Text { text: t.into() }
    }

    fn go(owner: Verdict) -> (Vec<Message>, Vec<String>, usize) {
        let model = Script(Mutex::new(vec![
            vec![call("1", "read"), call("2", "write"), call("3", "publish")],
            vec![text("Done.")],
        ]));
        let tools = Recorder::default();
        let owner = Owner(owner, RefCell::new(0));
        let mut messages = vec![Message::user_text("go")];
        run(
            &Run {
                model: &model,
                tools: &tools,
                approver: &owner,
                system: "",
                max_steps: 5,
            },
            &mut messages,
            &mut |_| {},
        )
        .unwrap();
        let asked = *owner.1.borrow();
        (messages, tools.0.into_inner(), asked)
    }

    #[test]
    fn reads_and_reversible_writes_run_without_asking() {
        let (_, called, asked) = go(Verdict::Approved);
        assert_eq!(called, vec!["read", "write", "publish"]);
        assert_eq!(asked, 1, "only the action that commits asks");
    }

    #[test]
    fn a_refused_action_never_runs_and_the_agent_hears_why() {
        let (messages, called, _) = go(Verdict::Refused("wrong tone".into()));
        assert_eq!(called, vec!["read", "write"]);
        let results = &messages[2].content;
        match &results[2] {
            Block::ToolResult {
                content, is_error, ..
            } => {
                assert!(*is_error);
                assert!(content.contains("wrong tone"));
            }
            other => panic!("unexpected {other:?}"),
        }
        assert_eq!(messages.len(), 4);
    }

    #[test]
    fn a_loop_that_never_ends_is_stopped() {
        let model = Script(Mutex::new(vec![vec![call("1", "read")]; 10]));
        let tools = Recorder::default();
        let owner = Owner(Verdict::Approved, RefCell::new(0));
        let mut messages = vec![Message::user_text("go")];
        let out = run(
            &Run {
                model: &model,
                tools: &tools,
                approver: &owner,
                system: "",
                max_steps: 3,
            },
            &mut messages,
            &mut |_| {},
        );
        assert!(out.is_err());
        assert_eq!(tools.0.borrow().len(), 3);
    }

    #[test]
    fn blocks_serialise_as_the_messages_api_expects() {
        let b = Block::ToolResult {
            tool_use_id: "x".into(),
            content: "ok".into(),
            is_error: false,
        };
        assert_eq!(
            serde_json::to_value(&b).unwrap(),
            json!({"type": "tool_result", "tool_use_id": "x", "content": "ok"})
        );
    }
}
