//! The workspace's files, for the owner to browse in the interface. Read
//! only, and only inside the workspace's folder, as for its agents.

use a30m_gate::contained;
use a30m_store::Workspace;
use serde_json::{Value, json};

const MAX_TEXT: u64 = 512 * 1024;

pub fn list(ws: &Workspace, rel: &str) -> Result<Value, String> {
    let dir = contained(&ws.files_dir(), rel)?;
    let mut entries: Vec<Value> = std::fs::read_dir(&dir)
        .map_err(|e| format!("{rel}: {e}"))?
        .flatten()
        .filter_map(|e| {
            let meta = e.metadata().ok()?;
            Some(json!({
                "name": e.file_name().to_string_lossy(),
                "dir": meta.is_dir(),
                "size": meta.len(),
                "modified": meta.modified().ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs()),
            }))
        })
        .collect();
    entries.sort_by_key(|e| {
        (
            !e["dir"].as_bool().unwrap_or(false),
            e["name"].as_str().unwrap_or("").to_lowercase(),
        )
    });
    Ok(json!({"path": rel, "entries": entries}))
}

pub fn read(ws: &Workspace, rel: &str) -> Result<Value, String> {
    let path = contained(&ws.files_dir(), rel)?;
    let meta = std::fs::metadata(&path).map_err(|e| format!("{rel}: {e}"))?;
    if meta.is_dir() {
        return Err(format!("{rel} is a folder"));
    }
    if meta.len() > MAX_TEXT {
        return Err(format!("{rel} is larger than {} KB", MAX_TEXT / 1024));
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("{rel}: {e}"))?;
    let text = String::from_utf8(bytes).map_err(|_| format!("{rel} is not text"))?;
    Ok(json!({"path": rel, "text": text}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_owner_browses_inside_the_workspace_only() {
        let dir = std::env::temp_dir().join(format!("a30m-files-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let home = a30m_store::Home::open(&dir).unwrap();
        let ws = home.create("a").unwrap();
        std::fs::create_dir_all(ws.files_dir().join("trips")).unwrap();
        std::fs::write(ws.files_dir().join("trips/plan.md"), "# Plan").unwrap();
        std::fs::write(ws.files_dir().join("a.txt"), "a").unwrap();
        let top = list(&ws, "").unwrap();
        assert_eq!(top["entries"][0]["name"], "trips", "folders first");
        assert_eq!(read(&ws, "trips/plan.md").unwrap()["text"], "# Plan");
        assert!(read(&ws, "../workspace.json").is_err());
        assert!(read(&ws, "/etc/passwd").is_err());
        assert!(list(&ws, "..").is_err());
        assert!(read(&ws, "trips").is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
