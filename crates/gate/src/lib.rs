//! The gate: the one place that decides whether a tool call runs now or
//! waits for the owner (decision 163), and whether a path stays inside the
//! folder an agent may touch.
//!
//! A security boundary. It holds no I/O beyond reading the file system to
//! resolve paths, so every rule here is tested directly.

use std::path::{Component, Path, PathBuf};

/// What a tool call does to the world.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Class {
    /// Reads, changes nothing.
    Read,
    /// Changes something the owner can undo, inside the workspace.
    Reversible,
    /// Sends, publishes, pays, deletes, or anything not classed.
    Commits,
}

impl Class {
    pub fn as_str(self) -> &'static str {
        match self {
            Class::Read => "read",
            Class::Reversible => "reversible",
            Class::Commits => "commits",
        }
    }

    pub fn parse(s: &str) -> Option<Class> {
        match s {
            "read" => Some(Class::Read),
            "reversible" => Some(Class::Reversible),
            "commits" => Some(Class::Commits),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    Run,
    AskOwner,
}

/// Decision 56: what commits always waits for the owner's explicit answer.
pub fn decide(class: Class) -> Decision {
    match class {
        Class::Read | Class::Reversible => Decision::Run,
        Class::Commits => Decision::AskOwner,
    }
}

/// The class of an MCP tool. The owner's override wins; otherwise a tool
/// counts as a read only when its server says so (`readOnlyHint`), and
/// anything else is treated as committing.
pub fn class_of_mcp_tool(read_only_hint: Option<bool>, owner_override: Option<Class>) -> Class {
    if let Some(class) = owner_override {
        return class;
    }
    match read_only_hint {
        Some(true) => Class::Read,
        _ => Class::Commits,
    }
}

/// Resolves `relative` inside `root`, or refuses. Refused: an absolute
/// path, any `..`, and anything that resolves outside `root` through a
/// symbolic link, the file itself or one of its parents.
pub fn contained(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = Path::new(relative);
    if relative.is_empty() {
        return Ok(root.to_path_buf());
    }
    for part in rel.components() {
        match part {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err(format!("path not allowed: {relative}")),
        }
    }
    let root = root
        .canonicalize()
        .map_err(|e| format!("workspace folder unavailable: {e}"))?;
    let joined = root.join(rel);
    // The deepest part that exists decides where the path really goes.
    let mut existing = joined.as_path();
    while !existing.exists() {
        existing = match existing.parent() {
            Some(parent) => parent,
            None => return Err(format!("path not allowed: {relative}")),
        };
    }
    let real = existing
        .canonicalize()
        .map_err(|e| format!("path not allowed: {relative}: {e}"))?;
    if !real.starts_with(&root) {
        return Err(format!("path leaves the workspace: {relative}"));
    }
    if joined.is_symlink() {
        return Err(format!("path is a symbolic link: {relative}"));
    }
    Ok(joined)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_commits_waits_for_the_owner() {
        assert_eq!(decide(Class::Read), Decision::Run);
        assert_eq!(decide(Class::Reversible), Decision::Run);
        assert_eq!(decide(Class::Commits), Decision::AskOwner);
    }

    #[test]
    fn an_unclassed_mcp_tool_commits() {
        assert_eq!(class_of_mcp_tool(None, None), Class::Commits);
        assert_eq!(class_of_mcp_tool(Some(false), None), Class::Commits);
        assert_eq!(class_of_mcp_tool(Some(true), None), Class::Read);
        assert_eq!(
            class_of_mcp_tool(Some(true), Some(Class::Commits)),
            Class::Commits
        );
        assert_eq!(
            class_of_mcp_tool(None, Some(Class::Reversible)),
            Class::Reversible
        );
    }

    fn temp() -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "a30m-gate-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(dir.join("root/sub")).unwrap();
        std::fs::write(dir.join("secret.txt"), "secret").unwrap();
        dir
    }

    #[test]
    fn paths_stay_inside_the_root() {
        let dir = temp();
        let root = dir.join("root");
        assert!(contained(&root, "sub/new.md").is_ok());
        assert!(contained(&root, "new/deeper/file.md").is_ok());
        assert!(contained(&root, "./a.md").is_ok());
        assert!(contained(&root, "../secret.txt").is_err());
        assert!(contained(&root, "sub/../../secret.txt").is_err());
        assert!(contained(&root, dir.join("secret.txt").to_str().unwrap()).is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn a_symbolic_link_cannot_lead_out() {
        let dir = temp();
        let root = dir.join("root");
        std::os::unix::fs::symlink(dir.join("secret.txt"), root.join("link")).unwrap();
        std::os::unix::fs::symlink(&dir, root.join("up")).unwrap();
        assert!(contained(&root, "link").is_err());
        assert!(contained(&root, "up/secret.txt").is_err());
        assert!(contained(&root, "up/new.txt").is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
