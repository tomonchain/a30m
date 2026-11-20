//! Where the server keeps things: the home and its workspaces.
//!
//! ```text
//! <home>/workspaces/<slug>/
//!   workspace.json      name, the owner's tool classes      (server only)
//!   conversation.json   the conversation                     (server only)
//!   agent/              the imported agent: AGENTS.md,       (server only)
//!                       plugin.json, mcp.json, skills/
//!   files/              the agents' folder: the only place their tools read and write
//! ```
//!
//! What configures an agent (its instructions, its MCP servers and their
//! credentials) is outside `files/`, so an agent cannot rewrite its own
//! rules or add a server. Files are plain JSON for now; a database comes
//! with the decision that needs it.

use a30m_core::Message;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

const DEFAULT_AGENTS_MD: &str = "# Instructions\n\nWrite here what the agents of this workspace should know: what it is for, its tone, its red lines.\n";

pub struct Home {
    dir: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub slug: String,
    pub name: String,
    pub created: u64,
    /// The owner's class for a tool, by its full name: read, reversible
    /// or commits. Wins over what the tool's server says (decision 163).
    #[serde(default)]
    pub tool_classes: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct McpServerConfig {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Skill {
    pub name: String,
    pub description: String,
}

pub fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Writes through a temporary file, so a crash never leaves half a file.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, bytes).map_err(|e| format!("{}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("{}: {e}", path.display()))
}

fn slugify(name: &str) -> String {
    let mut slug = String::new();
    for c in name.trim().to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            slug.push(c);
        } else if !slug.ends_with('-') {
            slug.push('-');
        }
    }
    slug.trim_matches('-').chars().take(40).collect()
}

/// A skill or file name an agent may name: letters, digits, `-`, `_`.
pub fn plain_name(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && s.chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

impl Home {
    pub fn open(dir: &Path) -> Result<Home, String> {
        std::fs::create_dir_all(dir.join("workspaces"))
            .map_err(|e| format!("{}: {e}", dir.display()))?;
        Ok(Home {
            dir: dir.to_path_buf(),
        })
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    pub fn workspaces(&self) -> Vec<WorkspaceInfo> {
        let mut out = Vec::new();
        if let Ok(entries) = std::fs::read_dir(self.dir.join("workspaces")) {
            for entry in entries.flatten() {
                if let Ok(ws) = self.workspace(&entry.file_name().to_string_lossy()) {
                    out.push(ws.info);
                }
            }
        }
        out.sort_by_key(|w| w.created);
        out
    }

    pub fn create(&self, name: &str) -> Result<Workspace, String> {
        let name = name.trim();
        let slug = slugify(name);
        if slug.is_empty() {
            return Err("a workspace needs a name with letters or digits".into());
        }
        let dir = self.dir.join("workspaces").join(&slug);
        if dir.exists() {
            return Err(format!("a workspace named {slug} already exists"));
        }
        for sub in ["files", "agent/skills"] {
            std::fs::create_dir_all(dir.join(sub)).map_err(|e| e.to_string())?;
        }
        std::fs::write(dir.join("agent/AGENTS.md"), DEFAULT_AGENTS_MD)
            .map_err(|e| e.to_string())?;
        let info = WorkspaceInfo {
            slug: slug.clone(),
            name: name.to_string(),
            created: now(),
            tool_classes: BTreeMap::new(),
        };
        let ws = Workspace { dir, info };
        ws.save_info()?;
        Ok(ws)
    }

    pub fn workspace(&self, slug: &str) -> Result<Workspace, String> {
        if !plain_name(slug) {
            return Err("no such workspace".into());
        }
        let dir = self.dir.join("workspaces").join(slug);
        let text = std::fs::read_to_string(dir.join("workspace.json"))
            .map_err(|_| "no such workspace".to_string())?;
        let info: WorkspaceInfo = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        Ok(Workspace { dir, info })
    }
}

pub struct Workspace {
    dir: PathBuf,
    pub info: WorkspaceInfo,
}

impl Workspace {
    pub fn files_dir(&self) -> PathBuf {
        self.dir.join("files")
    }

    pub fn agent_dir(&self) -> PathBuf {
        self.dir.join("agent")
    }

    pub fn save_info(&self) -> Result<(), String> {
        let bytes = serde_json::to_vec_pretty(&self.info).map_err(|e| e.to_string())?;
        write_atomic(&self.dir.join("workspace.json"), &bytes)
    }

    pub fn conversation(&self) -> Vec<Message> {
        std::fs::read_to_string(self.dir.join("conversation.json"))
            .ok()
            .and_then(|t| serde_json::from_str(&t).ok())
            .unwrap_or_default()
    }

    pub fn save_conversation(&self, messages: &[Message]) -> Result<(), String> {
        let bytes = serde_json::to_vec(messages).map_err(|e| e.to_string())?;
        write_atomic(&self.dir.join("conversation.json"), &bytes)
    }

    pub fn agents_md(&self) -> String {
        std::fs::read_to_string(self.agent_dir().join("AGENTS.md")).unwrap_or_default()
    }

    /// The skills in `agent/skills/*/SKILL.md`, from their front matter.
    pub fn skills(&self) -> Vec<Skill> {
        let mut out = Vec::new();
        let Ok(entries) = std::fs::read_dir(self.agent_dir().join("skills")) else {
            return out;
        };
        for entry in entries.flatten() {
            let folder = entry.file_name().to_string_lossy().to_string();
            if !plain_name(&folder) {
                continue;
            }
            let Ok(text) = std::fs::read_to_string(entry.path().join("SKILL.md")) else {
                continue;
            };
            let fields = front_matter(&text);
            out.push(Skill {
                name: fields.get("name").cloned().unwrap_or(folder),
                description: fields.get("description").cloned().unwrap_or_default(),
            });
        }
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    /// The text of one skill, found by its folder or its declared name.
    pub fn skill_text(&self, name: &str) -> Result<String, String> {
        if !plain_name(name) {
            return Err(format!("no skill named {name}"));
        }
        let skills = self.agent_dir().join("skills");
        let direct = skills.join(name).join("SKILL.md");
        if let Ok(text) = std::fs::read_to_string(&direct) {
            return Ok(text);
        }
        if let Ok(entries) = std::fs::read_dir(&skills) {
            for entry in entries.flatten() {
                if let Ok(text) = std::fs::read_to_string(entry.path().join("SKILL.md"))
                    && front_matter(&text).get("name").map(String::as_str) == Some(name)
                {
                    return Ok(text);
                }
            }
        }
        Err(format!("no skill named {name}"))
    }

    /// The MCP servers in `agent/mcp.json` (`{"mcpServers": {...}}`).
    pub fn mcp_servers(&self) -> Result<BTreeMap<String, McpServerConfig>, String> {
        let path = self.agent_dir().join("mcp.json");
        let Ok(text) = std::fs::read_to_string(&path) else {
            return Ok(BTreeMap::new());
        };
        let value: Value = serde_json::from_str(&text).map_err(|e| format!("mcp.json: {e}"))?;
        let servers = value.get("mcpServers").cloned().unwrap_or(Value::Null);
        if servers.is_null() {
            return Ok(BTreeMap::new());
        }
        let map: BTreeMap<String, McpServerConfig> =
            serde_json::from_value(servers).map_err(|e| format!("mcp.json: {e}"))?;
        for name in map.keys() {
            if !plain_name(name) {
                return Err(format!("mcp.json: server name not allowed: {name}"));
            }
        }
        Ok(map)
    }

    /// Imports an agent from a folder on this machine (decision 164):
    /// an Agent Plugin (`plugin.json`, `skills/`, `mcp.json`, `AGENTS.md`)
    /// or a single Agent Skill (a folder holding `SKILL.md`). Returns what
    /// was imported. Symbolic links are refused.
    pub fn import(&self, src: &Path) -> Result<Vec<String>, String> {
        let meta = std::fs::symlink_metadata(src).map_err(|e| format!("{}: {e}", src.display()))?;
        if !meta.is_dir() {
            return Err("give the path of a folder: an Agent Plugin or a skill".into());
        }
        let mut done = Vec::new();
        if src.join("SKILL.md").is_file() && !src.join("plugin.json").exists() {
            let text = std::fs::read_to_string(src.join("SKILL.md")).map_err(|e| e.to_string())?;
            let name = front_matter(&text)
                .get("name")
                .cloned()
                .or_else(|| src.file_name().map(|n| n.to_string_lossy().to_string()))
                .unwrap_or_default();
            if !plain_name(&name) {
                return Err(format!("skill name not allowed: {name}"));
            }
            copy_dir(src, &self.agent_dir().join("skills").join(&name))?;
            done.push(format!("skill {name}"));
            return Ok(done);
        }
        let mut found = false;
        for file in ["plugin.json", "mcp.json", "AGENTS.md"] {
            let from = src.join(file);
            if from.is_file() && !from.is_symlink() {
                std::fs::copy(&from, self.agent_dir().join(file)).map_err(|e| e.to_string())?;
                done.push(file.to_string());
                found = true;
            }
        }
        // Some plugins keep MCP servers in plugin.json itself, or in .mcp.json.
        if !src.join("mcp.json").is_file() {
            let dot = src.join(".mcp.json");
            if dot.is_file() && !dot.is_symlink() {
                std::fs::copy(&dot, self.agent_dir().join("mcp.json"))
                    .map_err(|e| e.to_string())?;
                done.push(".mcp.json".into());
                found = true;
            }
        }
        let skills = src.join("skills");
        if skills.is_dir() && !skills.is_symlink() {
            for entry in std::fs::read_dir(&skills)
                .map_err(|e| e.to_string())?
                .flatten()
            {
                let name = entry.file_name().to_string_lossy().to_string();
                if plain_name(&name) && entry.path().join("SKILL.md").is_file() {
                    copy_dir(&entry.path(), &self.agent_dir().join("skills").join(&name))?;
                    done.push(format!("skill {name}"));
                    found = true;
                }
            }
        }
        if !found {
            return Err(
                "nothing to import: no plugin.json, mcp.json, AGENTS.md, skills/ or SKILL.md"
                    .into(),
            );
        }
        if let Err(e) = self.mcp_servers() {
            return Err(format!("imported, but {e}"));
        }
        Ok(done)
    }
}

fn copy_dir(from: &Path, to: &Path) -> Result<(), String> {
    std::fs::create_dir_all(to).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(from)
        .map_err(|e| e.to_string())?
        .flatten()
    {
        let meta = std::fs::symlink_metadata(entry.path()).map_err(|e| e.to_string())?;
        let target = to.join(entry.file_name());
        if meta.file_type().is_symlink() {
            return Err(format!(
                "symbolic links are not imported: {}",
                entry.path().display()
            ));
        } else if meta.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), &target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// The flat `key: value` lines between the first two `---` lines.
pub fn front_matter(text: &str) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    let mut lines = text.lines();
    if lines.next().map(str::trim) != Some("---") {
        return out;
    }
    for line in lines {
        if line.trim() == "---" {
            break;
        }
        if let Some((k, v)) = line.split_once(':') {
            let v = v.trim().trim_matches('"').trim_matches('\'');
            out.insert(k.trim().to_string(), v.to_string());
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "a30m-store-{tag}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn a_workspace_is_created_listed_and_found() {
        let dir = temp("ws");
        let home = Home::open(&dir).unwrap();
        let ws = home.create("Hedgen Ltd").unwrap();
        assert_eq!(ws.info.slug, "hedgen-ltd");
        assert!(home.create("hedgen ltd").is_err());
        assert_eq!(home.workspaces().len(), 1);
        assert!(home.workspace("../x").is_err());
        assert!(ws.files_dir().is_dir());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn a_plugin_is_imported_with_its_skills_and_servers() {
        let dir = temp("import");
        let plugin = dir.join("plugin");
        std::fs::create_dir_all(plugin.join("skills/release-notes")).unwrap();
        std::fs::write(plugin.join("plugin.json"), r#"{"name":"demo"}"#).unwrap();
        std::fs::write(
            plugin.join("skills/release-notes/SKILL.md"),
            "---\nname: release-notes\ndescription: Write release notes\n---\nSteps.",
        )
        .unwrap();
        std::fs::write(
            plugin.join("mcp.json"),
            r#"{"mcpServers":{"files":{"command":"npx","args":["-y","x"]}}}"#,
        )
        .unwrap();
        let home = Home::open(&dir.join("home")).unwrap();
        let ws = home.create("a30m").unwrap();
        let done = ws.import(&plugin).unwrap();
        assert!(done.contains(&"skill release-notes".to_string()));
        assert_eq!(ws.skills()[0].description, "Write release notes");
        assert!(ws.skill_text("release-notes").unwrap().contains("Steps."));
        assert_eq!(ws.mcp_servers().unwrap()["files"].command, "npx");
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn names_that_could_leave_a_folder_are_refused() {
        assert!(!plain_name("../x"));
        assert!(!plain_name("a/b"));
        assert!(!plain_name(""));
        assert!(plain_name("release-notes_2"));
    }
}
