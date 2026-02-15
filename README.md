# todoist-mcp-plugin

Every MCP server you enable in Claude Code injects tool definitions into your system prompt — consuming context in every message, even when idle. The official Todoist MCP adds ~8-10 tool schemas (~2,500 tokens). This plugin wraps it in a subagent so those definitions never touch your main conversation.

## How It Works

```
┌─────────────────────────────────────────────────┐
│  Main Claude Code Conversation                  │
│                                                 │
│  Skills loaded on demand:                       │
│  ┌─────────────┐  ┌──────────────┐              │
│  │todoist-tasks │  │ todoist-sync │  ~50-80 tok  │
│  │  (metadata)  │  │  (metadata)  │  idle cost   │
│  └──────┬──────┘  └──────┬───────┘              │
│         │                │                      │
│         └───────┬────────┘                      │
│                 ▼                                │
│  ┌──────────────────────────────┐               │
│  │      todoist-agent           │               │
│  │   (separate context window)  │               │
│  │                              │               │
│  │  MCP tool definitions live   │               │
│  │  HERE, not in main context   │               │
│  │                              │               │
│  │  ┌────────────────────────┐  │               │
│  │  │ Doist MCP (HTTP/OAuth) │  │               │
│  │  │ ai.todoist.net/mcp     │  │               │
│  │  └────────────────────────┘  │               │
│  └──────────────────────────────┘               │
└─────────────────────────────────────────────────┘
```

Skills expose only short metadata descriptions to the main context (~50-80 tokens). When triggered, the full skill body loads and delegates to a subagent that holds the MCP connection in its own context window. Tool schemas stay isolated.

### Token Cost Comparison

| Setup | Idle Context Cost | Per-Operation Cost |
|-------|------------------|--------------------|
| Raw MCP (always loaded) | ~2,500 tokens/message (tool schemas in every message) | Same + API response |
| This plugin | ~50-80 tokens/message (skill metadata only) | ~900 tokens (skill body) + subagent |

Over a 50-message coding session, raw MCP costs 100k-150k tokens on Todoist schemas you used twice. This plugin pays only when you use it.

## Quick Start

```bash
claude plugin install jackhutson/todoist-mcp-plugin
```

Then authenticate with the Todoist MCP server:

1. Launch Claude Code
2. Run `/mcp`
3. Select the `todoist` server
4. Complete the browser-based OAuth flow

No API keys to manage — the official Doist server uses OAuth.

## Usage

Natural language, delegated automatically:

```
"Add a task 'Review PR #42' to Work with p2 priority due tomorrow"
"What's due today?"
"Mark the deploy task as done"
"Refresh my Todoist projects"
```

## Supported Operations

- **Task CRUD** — create, complete, update, delete
- **Queries** — by project, priority, due date, label, or Todoist filter strings
- **Structure sync** — projects, sections, labels fetched and cached in-conversation
- **Error recovery** — automatic re-sync on name resolution failures

## Design Principles

- **Subagent isolation** — MCP tool definitions never enter the main context window
- **Progressive disclosure** — skill metadata always loaded; full instructions only when triggered
- **Cache-first** — Todoist structure synced once per session, reused across operations
- **Official MCP** — uses Doist's own server (`ai.todoist.net/mcp`) with fewer, workflow-oriented tools and OAuth auth

## Requirements

- Claude Code with plugin support
- Todoist account (free or Pro)

## License

MIT
