//! The keys a workspace gives a30m for its models and its web search
//! (decision 167). A key is tried before it is kept, and never sent back:
//! the interface sees only where it comes from and its last characters.

use a30m_models::PROVIDERS;
use a30m_store::Workspace;
use serde_json::{Value, json};

const SEARCH: &str = "brave";

fn hint(key: &str) -> String {
    let tail: String = key
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    format!("…{tail}")
}

/// Every provider, with where its key comes from, if any.
pub fn providers(ws: &Workspace) -> Vec<Value> {
    let mut out: Vec<Value> = PROVIDERS
        .iter()
        .map(|p| {
            let (source, shown) = match (ws.secret(p.name), a30m_models::env_key(p), p.key_var) {
                (Some(k), _, _) => (Some("workspace"), Some(hint(&k))),
                (None, Some(k), _) => (Some("server"), Some(hint(&k))),
                (None, None, None) => (Some("local"), None),
                _ => (None, None),
            };
            json!({
                "name": p.name, "label": p.label, "kind": "model", "key_url": p.key_url,
                "needs_key": p.key_var.is_some(), "source": source, "hint": shown,
            })
        })
        .collect();
    let (source, shown) = match (ws.secret(SEARCH), crate::web::search_key()) {
        (Some(k), _) => (Some("workspace"), Some(hint(&k))),
        (None, Some(k)) => (Some("server"), Some(hint(&k))),
        _ => (None, None),
    };
    out.push(json!({
        "name": SEARCH, "label": "Brave Search (web search)", "kind": "search",
        "key_url": "https://api-dashboard.search.brave.com", "needs_key": true,
        "source": source, "hint": shown,
    }));
    out
}

/// Tries a key, then keeps it; an empty key removes the workspace's own.
pub fn set(ws: &Workspace, name: &str, key: &str) -> Result<Value, String> {
    let known = name == SEARCH
        || PROVIDERS
            .iter()
            .any(|p| p.name == name && p.key_var.is_some());
    if !known {
        return Err(format!("{name} takes no key"));
    }
    if key.is_empty() {
        ws.set_secret(name, None)?;
        return Ok(json!({"removed": true}));
    }
    if key.len() > 512 || key.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err("this does not look like a key: no spaces, at most 512 characters".into());
    }
    let models = if name == SEARCH {
        crate::web::search("a30m", 1, Some(key.to_string()))
            .map_err(|e| format!("the key was not kept: {e}"))?;
        Vec::new()
    } else {
        a30m_models::list_models(name, Some(key))
            .map_err(|e| format!("the key was not kept: {e}"))?
    };
    ws.set_secret(name, Some(key))?;
    Ok(json!({"models": models, "hint": hint(key)}))
}

/// The models the workspace's key (or the server's) gives access to.
pub fn models(ws: &Workspace, name: &str) -> Result<Value, String> {
    let key = ws.secret(name);
    Ok(json!({"models": a30m_models::list_models(name, key.as_deref())?}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_key_is_never_shown_whole() {
        assert_eq!(hint("sk-abcdef1234"), "…1234");
        assert_eq!(hint("ab"), "…ab");
    }

    #[test]
    fn keys_are_checked_before_any_call() {
        let dir = std::env::temp_dir().join(format!("a30m-keys-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let home = a30m_store::Home::open(&dir).unwrap();
        let ws = home.create("a").unwrap();
        assert!(
            set(&ws, "ollama", "x").is_err(),
            "a local server takes no key"
        );
        assert!(set(&ws, "acme", "x").is_err());
        assert!(set(&ws, "openai", "sk with spaces").is_err());
        assert_eq!(ws.secret("openai"), None, "nothing kept");
        ws.set_secret("openai", Some("sk-kept-9876")).unwrap();
        let list = providers(&ws);
        let openai = list.iter().find(|p| p["name"] == "openai").unwrap();
        assert_eq!(openai["source"], "workspace");
        assert_eq!(openai["hint"], "…9876");
        assert!(!serde_json::to_string(&list).unwrap().contains("sk-kept"));
        assert!(set(&ws, "openai", "").is_ok());
        assert_eq!(ws.secret("openai"), None);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
