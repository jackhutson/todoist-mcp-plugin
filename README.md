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
- **Batch-first** — all MCP tools accept arrays; the plugin collects items and makes single batch calls
- **Cache-first** — Todoist structure synced once per session, reused across operations
- **Official MCP** — uses Doist's own server (`ai.todoist.net/mcp`) with fewer, workflow-oriented tools and OAuth auth

## Lessons Learned: v1.0 → v1.1 Redesign

The v1.0 plugin had a design flaw that caused a 42-minute failure loop in production. Documenting it here so others building MCP wrapper plugins can avoid the same mistake.

### The Problem

The agent's system prompt described operations abstractly — `Operation: create | complete | update` — without ever naming the actual MCP tools. When the agent needed to complete a task, it had to **guess** the tool name. It guessed `complete-task` (singular). The actual tool is `complete-tasks` (plural). Every Doist MCP tool uses plural kebab-case names.

The agent tried `complete-task`, `close-task`, `complete_task`, and several other variations before timing out. The tool names were right there in the MCP schema, but the agent's system prompt never referenced them.

### The Root Causes

1. **No tool name grounding.** The system prompt said "use the appropriate MCP tool" but never listed which tools exist. The agent was expected to discover or guess them at runtime.

2. **Invented delegation protocol.** The skills defined an `Operation: create | complete` protocol that didn't map to anything real. This added a translation layer (skill → protocol → tool name) that introduced failure modes without adding value.

3. **Singular-first design.** All operations were framed as singular ("complete a task", "create a task") even though every Doist MCP tool accepts arrays. This wasted API calls — completing 5 tasks meant 5 separate calls instead of 1.

### The Fix

- **Agent gets an MCP tool reference table** — all 27 tool names with key parameters, directly in the system prompt. No guessing.
- **Natural language delegation** — skills tell the main agent *what to ask for* in plain language. The agent maps that to the correct tool using its reference table.
- **Batch-first** — array operations are the default. Single items are arrays of length 1.
- **Removed unnecessary abstractions** — no invented protocol, no priority mapping (MCP handles it), no name-to-ID resolution instructions (MCP handles it).

### The Takeaway

When wrapping an MCP server in a subagent, **name the tools explicitly in the agent's system prompt.** Don't rely on the agent discovering tool names from the MCP schema at runtime — it will guess wrong. The MCP tool names are the source of truth; your agent instructions should align with them, not invent their own vocabulary.

## Requirements

- Claude Code with plugin support
- Todoist account (free or Pro)

## License

MIT
