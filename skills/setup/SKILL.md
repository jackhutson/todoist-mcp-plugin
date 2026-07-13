---
name: setup
description: >
  This skill should be used when the user asks to "set up Todoist",
  "install td", "connect Todoist", "authenticate Todoist", when any td
  command fails because the CLI is missing or unauthenticated, or when
  migrating from the v1 MCP-based version of this plugin. Bootstraps the
  official td CLI: install, OAuth login, health check, and an optional
  permission allowlist.
---

# Todoist Setup

Bootstrap the td CLI transport. No methodology, no questionnaire.

## Steps

### 1. Installation
`command -v td || echo missing`. If missing, guide:
`npm install -g @doist/todoist-cli` (requires Node 20+), then re-check.

### 2. Version floor
`td --version` must be ≥ 1.75.0. If older: `td update` (or
`npm update -g @doist/todoist-cli`).

### 3. Authenticate
`td auth status`. If unauthenticated, have the user run `td auth login`
(browser OAuth; token lands in the OS keyring). Headless machines:
`td auth login --no-browser-open`. Never run `td auth token view`.

### 4. Health check
`td doctor`. Report problems verbatim; the common fix is re-login.

### 5. Permission ergonomics (offer, don't impose)
Offer to add read-only td commands to the Claude Code permission
allowlist so daily use doesn't prompt. Ask which scope — project
(`.claude/settings.json`) or user (`~/.claude/settings.json`) — or skip.
Merge these into `permissions.allow` (create the file if absent,
preserve existing entries):

    Bash(td today*), Bash(td inbox*), Bash(td upcoming*),
    Bash(td task list*), Bash(td task view*), Bash(td completed list*),
    Bash(td project list*), Bash(td section list*), Bash(td label list*),
    Bash(td filter list*), Bash(td auth status*), Bash(td doctor*)

Mutations stay unlisted (they prompt normally); destructive commands
always prompt.

### 6. Verify & seed
`td today` runs clean → seed the structure cache: run `td project list`
and `td label list`, write the names to
`~/.config/todoist-plugin/structure.md` (shape defined in the `todoist`
skill), then report ready and mention `/todoist:capture`,
`/todoist:daily`, `/todoist:triage`.

## Migrating from v1 (MCP)

v1 of this plugin used the Doist MCP server. Once setup succeeds the MCP
connection is unused — remove any `todoist` entry via `/mcp`. Details in
CHANGELOG 2.0.0.
