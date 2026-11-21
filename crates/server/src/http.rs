//! The HTTP side: the interface and its JSON API, on 127.0.0.1 only.
//!
//! Three checks guard every API call, because a web page in the owner's
//! browser can send requests to 127.0.0.1 too:
//! - the Host header must name this server (no DNS rebinding);
//! - the token printed at start must be in `X-A30m-Token` (another site
//!   cannot read it from the page's address);
//! - a POST must be JSON, which no plain form can send.

use crate::App;
use a30m_core::Verdict;
use serde_json::{Value, json};
use std::io::Read;
use std::sync::Arc;
use tiny_http::{Header, Method, Request, Response, Server};

// The interface, built from web/ into one file (decision 157).
const UI: &str = include_str!("../../../web/dist/index.html");
const MAX_BODY: u64 = 1024 * 1024;

pub fn random_token() -> Result<String, String> {
    let mut bytes = [0u8; 24];
    std::fs::File::open("/dev/urandom")
        .and_then(|mut f| f.read_exact(&mut bytes))
        .map_err(|e| format!("no randomness: {e}"))?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

fn same(a: &str, b: &str) -> bool {
    a.len() == b.len()
        && a.bytes()
            .zip(b.bytes())
            .fold(0u8, |acc, (x, y)| acc | (x ^ y))
            == 0
}

pub fn serve(app: Arc<App>, port: u16) -> Result<(), String> {
    let address = format!("127.0.0.1:{port}");
    let server = Server::http(&address).map_err(|e| format!("cannot listen on {address}: {e}"))?;
    println!(
        "a30m-server {} on http://{address}",
        env!("CARGO_PKG_VERSION")
    );
    println!("home: {}", app.home.dir().display());
    println!("default model: {}", app.default_model);
    println!(
        "providers with a key: {}",
        a30m_models::available().join(", ")
    );
    println!();
    println!("Open: http://{address}/#t={}", app.token);
    for request in server.incoming_requests() {
        let app = Arc::clone(&app);
        std::thread::spawn(move || handle(&app, port, request));
    }
    Ok(())
}

fn header<'r>(request: &'r Request, name: &str) -> Option<&'r str> {
    request
        .headers()
        .iter()
        .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case(name))
        .map(|h| h.value.as_str())
}

fn reply(request: Request, status: u16, body: Value) {
    let header =
        Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).expect("static header");
    let _ = request.respond(
        Response::from_string(body.to_string())
            .with_status_code(status)
            .with_header(header),
    );
}

fn fail(request: Request, status: u16, message: &str) {
    reply(request, status, json!({"error": message}));
}

fn handle(app: &Arc<App>, port: u16, mut request: Request) {
    let host_ok = header(&request, "Host")
        .is_some_and(|h| h == format!("127.0.0.1:{port}") || h == format!("localhost:{port}"));
    if !host_ok {
        return fail(request, 421, "wrong host");
    }
    let url = request.url().to_string();
    let path = url.split(['?', '#']).next().unwrap_or("").to_string();
    let method = request.method().clone();

    if method == Method::Get && path == "/" {
        let mut response = Response::from_string(UI);
        for (k, v) in [
            ("Content-Type", "text/html; charset=utf-8"),
            (
                "Content-Security-Policy",
                "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src data:; connect-src 'self'; frame-ancestors 'none'",
            ),
            ("Referrer-Policy", "no-referrer"),
        ] {
            response
                .add_header(Header::from_bytes(k.as_bytes(), v.as_bytes()).expect("static header"));
        }
        let _ = request.respond(response);
        return;
    }
    if !path.starts_with("/api/") {
        return fail(request, 404, "not found");
    }
    let token_ok = header(&request, "X-A30m-Token").is_some_and(|t| same(t, &app.token));
    if !token_ok {
        return fail(
            request,
            401,
            "missing or wrong token: open the address the server printed",
        );
    }
    let mut body = Value::Null;
    if method == Method::Post {
        let json_ok =
            header(&request, "Content-Type").is_some_and(|c| c.starts_with("application/json"));
        if !json_ok {
            return fail(request, 415, "send JSON");
        }
        let mut text = String::new();
        if request
            .as_reader()
            .take(MAX_BODY)
            .read_to_string(&mut text)
            .is_err()
        {
            return fail(request, 400, "unreadable body");
        }
        body = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => return fail(request, 400, "invalid JSON"),
        };
    }
    let parts: Vec<&str> = path.trim_start_matches("/api/").split('/').collect();
    let result = route(app, &method, &parts, &body);
    match result {
        Ok(value) => reply(request, 200, value),
        Err((status, message)) => fail(request, status, &message),
    }
}

type Answer = Result<Value, (u16, String)>;

fn bad(message: impl Into<String>) -> (u16, String) {
    (400, message.into())
}

fn text_of<'v>(body: &'v Value, key: &str) -> Result<&'v str, (u16, String)> {
    body.get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| bad(format!("missing `{key}`")))
}

fn route(app: &Arc<App>, method: &Method, parts: &[&str], body: &Value) -> Answer {
    match (method, parts) {
        (Method::Get, ["info"]) => Ok(json!({
            "version": env!("CARGO_PKG_VERSION"),
            "default_model": app.default_model,
            "providers": a30m_models::PROVIDERS.iter().map(|p| json!({
                "name": p.name,
                "key": p.key_var,
                "ready": a30m_models::available().contains(&p.name),
            })).collect::<Vec<_>>(),
        })),
        (Method::Get, ["workspaces"]) => {
            let running = app.running.lock().map(|r| r.clone()).unwrap_or_default();
            let list: Vec<Value> = app
                .home
                .workspaces()
                .into_iter()
                .map(|w| {
                    let image = app
                        .home
                        .workspace(&w.slug)
                        .ok()
                        .and_then(|ws| ws.image_version());
                    json!({
                        "slug": w.slug,
                        "name": w.name,
                        "image": image,
                        "running": running.contains(&w.slug),
                        "waiting": app.approvals.pending(Some(&w.slug)).len(),
                    })
                })
                .collect();
            Ok(json!({"workspaces": list}))
        }
        (Method::Post, ["workspaces"]) => {
            let ws = app.home.create(text_of(body, "name")?).map_err(bad)?;
            Ok(json!({"slug": ws.info.slug}))
        }
        (Method::Get, ["workspaces", slug]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let running = app
                .running
                .lock()
                .map(|r| r.contains(*slug))
                .unwrap_or(false);
            let error = app.errors.lock().ok().and_then(|e| e.get(*slug).cloned());
            let (servers, mcp_errors) =
                match app.mcp.lock().ok().and_then(|m| m.get(*slug).cloned()) {
                    Some(host) => match host.lock() {
                        Ok(h) => (
                            h.servers
                                .iter()
                                .map(|(n, s)| json!({"name": n, "tools": s.tools.len()}))
                                .collect::<Vec<_>>(),
                            h.errors.clone(),
                        ),
                        Err(_) => (Vec::new(), Vec::new()),
                    },
                    None => (Vec::new(), Vec::new()),
                };
            let declared: Vec<String> = ws
                .mcp_servers()
                .map(|m| m.keys().cloned().collect())
                .unwrap_or_default();
            Ok(json!({
                "workspace": ws.info,
                "model": crate::model_of(app, &ws),
                "model_ready": crate::connect_for(app, &ws).is_ok(),
                "messages": ws.conversation(),
                "running": running,
                "error": error,
                "waiting": app.approvals.pending(Some(slug)),
                "skills": ws.skills(),
                "mcp": {"declared": declared, "running": servers, "errors": mcp_errors},
            }))
        }
        (Method::Post, ["workspaces", slug, "messages"]) => {
            let text = text_of(body, "text")?.trim();
            if text.is_empty() {
                return Err(bad("empty message"));
            }
            crate::start_turn(app, slug, text).map_err(|e| (409, e))?;
            Ok(json!({"ok": true}))
        }
        (Method::Post, ["workspaces", slug, "import"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            if app
                .running
                .lock()
                .map(|r| r.contains(*slug))
                .unwrap_or(true)
            {
                return Err((409, "wait until the agent has finished".into()));
            }
            let path = std::path::PathBuf::from(text_of(body, "path")?.trim());
            let done = ws.import(&path).map_err(bad)?;
            crate::tools::forget_mcp(app, slug);
            Ok(json!({"imported": done}))
        }
        (Method::Post, ["workspaces", slug, "classes"]) => {
            let mut ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let tool = text_of(body, "tool")?;
            let class = text_of(body, "class")?;
            if class == "default" {
                ws.info.tool_classes.remove(tool);
            } else if a30m_gate::Class::parse(class).is_some() {
                ws.info
                    .tool_classes
                    .insert(tool.to_string(), class.to_string());
            } else {
                return Err(bad("class is read, reversible, commits or default"));
            }
            ws.save_info().map_err(|e| (500, e))?;
            Ok(json!({"ok": true}))
        }
        (Method::Post, ["workspaces", slug, "model"]) => {
            let mut ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let model = text_of(body, "model")?.trim();
            if model.is_empty() || model == "default" {
                ws.info.model = None;
            } else {
                if model != "echo" {
                    a30m_models::parse_spec(model).map_err(bad)?;
                }
                ws.info.model = Some(model.to_string());
            }
            ws.save_info().map_err(|e| (500, e))?;
            Ok(json!({"model": crate::model_of(app, &ws)}))
        }
        (Method::Post, ["workspaces", slug, "conversation", "new"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            // Holding the running mark keeps a turn from starting meanwhile.
            {
                let mut running = app.running.lock().map_err(|_| (500, "busy".to_string()))?;
                if !running.insert(slug.to_string()) {
                    return Err((409, "wait until the agent has finished".into()));
                }
            }
            let done = ws.new_conversation();
            if let Ok(mut running) = app.running.lock() {
                running.remove(*slug);
            }
            done.map_err(|e| (500, e))?;
            if let Ok(mut errors) = app.errors.lock() {
                errors.remove(*slug);
            }
            Ok(json!({"ok": true}))
        }
        (Method::Post, ["workspaces", slug, "files"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let rel = body.get("path").and_then(Value::as_str).unwrap_or("");
            crate::files::list(&ws, rel).map_err(bad)
        }
        (Method::Post, ["workspaces", slug, "file"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            crate::files::read(&ws, text_of(body, "path")?).map_err(bad)
        }
        (Method::Get, ["workspaces", slug, "instructions"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            Ok(json!({"text": ws.agents_md()}))
        }
        (Method::Post, ["workspaces", slug, "instructions"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let text = text_of(body, "text")?;
            if text.len() > 64 * 1024 {
                return Err(bad("instructions are limited to 64 KB"));
            }
            ws.set_agents_md(text).map_err(|e| (500, e))?;
            Ok(json!({"ok": true}))
        }
        (Method::Post, ["workspaces", slug, "stop"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            if let Ok(mut stops) = app.stops.lock() {
                stops.insert(ws.info.slug.clone());
            }
            let refused = app
                .approvals
                .refuse_all(&ws.info.slug, "The owner stopped the agent.");
            Ok(json!({"refused": refused}))
        }
        (Method::Get, ["workspaces", slug, "providers"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            Ok(
                json!({"providers": crate::keys::providers(&ws), "model": crate::model_of(app, &ws)}),
            )
        }
        (Method::Post, ["workspaces", slug, "providers", name]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let key = body.get("key").and_then(Value::as_str).unwrap_or("").trim();
            crate::keys::set(&ws, name, key).map_err(bad)
        }
        (Method::Post, ["workspaces", slug, "providers", name, "models"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            crate::keys::models(&ws, name).map_err(bad)
        }
        (Method::Post, ["workspaces", slug, "settings"]) => {
            let mut ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            if let Some(name) = body.get("name").and_then(Value::as_str) {
                let name = name.trim();
                if name.is_empty() || name.chars().count() > 60 {
                    return Err(bad("a name has 1 to 60 characters"));
                }
                ws.info.name = name.to_string();
            }
            if let Some(text) = body.get("description").and_then(Value::as_str) {
                if text.chars().count() > 2000 {
                    return Err(bad("a description has at most 2,000 characters"));
                }
                ws.info.description = text.trim().to_string();
            }
            ws.save_info().map_err(|e| (500, e))?;
            Ok(json!({"workspace": ws.info}))
        }
        (Method::Get, ["workspaces", slug, "image"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let (bytes, mime) = ws.image().ok_or((404, "no picture".to_string()))?;
            Ok(json!({"mime": mime, "data": crate::b64::encode(&bytes)}))
        }
        (Method::Post, ["workspaces", slug, "image"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            let bytes = crate::b64::decode(text_of(body, "data")?).map_err(bad)?;
            ws.save_image(&bytes).map_err(bad)?;
            Ok(json!({"image": ws.image_version()}))
        }
        (Method::Post, ["workspaces", slug, "image", "remove"]) => {
            let ws = app.home.workspace(slug).map_err(|e| (404, e))?;
            ws.remove_image().map_err(|e| (500, e))?;
            Ok(json!({"image": null}))
        }
        (Method::Get, ["approvals"]) => Ok(json!({"waiting": app.approvals.pending(None)})),
        (Method::Post, ["approvals", id]) => {
            let id: u64 = id.parse().map_err(|_| bad("bad id"))?;
            let approve = body
                .get("approve")
                .and_then(Value::as_bool)
                .ok_or_else(|| bad("missing `approve`"))?;
            let verdict = if approve {
                Verdict::Approved
            } else {
                Verdict::Refused(
                    body.get("reason")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                )
            };
            if !app.approvals.answer(id, verdict) {
                return Err((404, "nothing waits under this id".into()));
            }
            Ok(json!({"ok": true}))
        }
        _ => Err((404, "not found".into())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_compare_in_full() {
        assert!(same("abc", "abc"));
        assert!(!same("abc", "abd"));
        assert!(!same("abc", "ab"));
        let t = random_token().unwrap();
        assert_eq!(t.len(), 48);
        assert_ne!(t, random_token().unwrap());
    }
}
