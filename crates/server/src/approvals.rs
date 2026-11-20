//! What waits for the owner. An agent that calls an action that commits
//! blocks here until the owner approves or refuses it in the interface.
//!
//! Kept in memory: a restart drops what was waiting, and the agent's turn
//! with it. Persisting them comes with the mobile app.

use a30m_core::{Approver, Verdict};
use a30m_gate::Class;
use serde::Serialize;
use serde_json::Value;
use std::sync::{Condvar, Mutex};

#[derive(Debug, Clone, Serialize)]
pub struct Pending {
    pub id: u64,
    pub workspace: String,
    pub tool: String,
    pub input: Value,
    pub class: &'static str,
    pub created: u64,
}

#[derive(Default)]
pub struct Approvals {
    state: Mutex<State>,
    answered: Condvar,
}

#[derive(Default)]
struct State {
    next: u64,
    pending: Vec<Pending>,
    verdicts: Vec<(u64, Verdict)>,
}

impl Approvals {
    pub fn pending(&self, workspace: Option<&str>) -> Vec<Pending> {
        let Ok(state) = self.state.lock() else {
            return Vec::new();
        };
        state
            .pending
            .iter()
            .filter(|p| workspace.is_none_or(|w| p.workspace == w))
            .cloned()
            .collect()
    }

    /// The owner's answer. False when nothing waits under this id.
    pub fn answer(&self, id: u64, verdict: Verdict) -> bool {
        let Ok(mut state) = self.state.lock() else {
            return false;
        };
        let Some(pos) = state.pending.iter().position(|p| p.id == id) else {
            return false;
        };
        state.pending.remove(pos);
        state.verdicts.push((id, verdict));
        self.answered.notify_all();
        true
    }

    fn wait(&self, workspace: &str, tool: &str, input: &Value, class: Class) -> Verdict {
        let Ok(mut state) = self.state.lock() else {
            return Verdict::Refused("the server could not ask".into());
        };
        state.next += 1;
        let id = state.next;
        state.pending.push(Pending {
            id,
            workspace: workspace.to_string(),
            tool: tool.to_string(),
            input: input.clone(),
            class: class.as_str(),
            created: a30m_store::now(),
        });
        loop {
            if let Some(pos) = state.verdicts.iter().position(|(i, _)| *i == id) {
                return state.verdicts.remove(pos).1;
            }
            state = match self.answered.wait(state) {
                Ok(s) => s,
                Err(_) => return Verdict::Refused("the server could not ask".into()),
            };
        }
    }
}

pub struct Asker<'a> {
    pub approvals: &'a Approvals,
    pub workspace: String,
}

impl Approver for Asker<'_> {
    fn ask(&self, tool: &str, input: &Value, class: Class) -> Verdict {
        self.approvals.wait(&self.workspace, tool, input, class)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::Arc;

    #[test]
    fn the_agent_waits_until_the_owner_answers() {
        let approvals = Arc::new(Approvals::default());
        let asker = Arc::clone(&approvals);
        let agent = std::thread::spawn(move || {
            asker.wait("a30m", "publish", &json!({"text": "hi"}), Class::Commits)
        });
        let id = loop {
            if let Some(p) = approvals.pending(Some("a30m")).first() {
                break p.id;
            }
            std::thread::yield_now();
        };
        assert!(approvals.pending(Some("other")).is_empty());
        assert!(!approvals.answer(id + 99, Verdict::Approved));
        assert!(approvals.answer(id, Verdict::Refused("no".into())));
        assert_eq!(agent.join().unwrap(), Verdict::Refused("no".into()));
        assert!(approvals.pending(None).is_empty());
    }
}
