# Todoist Plugin Skill & Agent Redesign Prompt

## Context

This plugin wraps the official Doist MCP server (`ai.todoist.net/mcp`) for Claude Code. It has one agent (`todoist-agent`) and two skills (`todoist-tasks`, `todoist-sync`).

A production session revealed that the agent was **guessing MCP tool names and getting them all wrong** — trying `complete-task`, `close-task`, `complete_task` when the actual tool is `complete-tasks`. The root cause: our agent and skill definitions describe operations abstractly ("Operation: complete") without ever referencing the actual MCP tool names. The agent has to discover or guess them at runtime, and it guesses wrong.

A second design issue: **all Doist MCP tools are plural and accept arrays**, meaning they're designed for batch operations. But our skills treat everything as singular — "complete a task", "create a task", "update a task" — which means we waste API calls even when the user provides multiple items at once.

## The Doist MCP Tool Inventory

Every tool uses **plural kebab-case** names and accepts arrays. Here is the complete set of 27 tools as they appear in the MCP:

### Task Operations
| MCP Tool Name | Accepts | Key Parameters |
|---|---|---|
| `add-tasks` | Array of task objects | `tasks[].content` (required), `.projectId`, `.sectionId`, `.priority` (p1-p4), `.dueString` (natural language), `.deadlineDate` (YYYY-MM-DD), `.duration` ("2h", "90m"), `.labels[]`, `.description`, `.parentId` |
| `complete-tasks` | Array of task IDs | `ids[]` (string array) |
| `update-tasks` | Array of task objects | `tasks[].id` (required), plus any changed fields: `.content`, `.priority`, `.dueString`, `.labels[]`, `.projectId`, `.sectionId` |
| `find-tasks` | Single query | `searchText`, `projectId`, `sectionId`, `parentId`, `labels[]`, `responsibleUser`, `limit` (max 100) |
| `find-tasks-by-date` | Date range | `startDate` (YYYY-MM-DD or "today"), `daysCount` (1-30), `overdueOption`, `limit` |
| `find-completed-tasks` | Date range | `since` (YYYY-MM-DD, required), `until` (YYYY-MM-DD, required), `projectId`, `parentId` |

### Project Operations
| MCP Tool Name | Accepts | Key Parameters |
|---|---|---|
| `add-projects` | Array of project objects | `projects[].name` (required), `.viewStyle` (list/board/calendar), `.parentId`, `.isFavorite` |
| `update-projects` | Array of project objects | `projects[].id` (required), plus `.name`, `.viewStyle`, `.isFavorite` |
| `find-projects` | Search | `search` (partial, case-insensitive), `limit` |
| `project-management` | Single | `projectId`, `action` (archive/unarchive) |
| `project-move` | Single | `projectId`, `action` (move-to-workspace/move-to-personal), `workspaceId` |

### Section Operations
| MCP Tool Name | Accepts | Key Parameters |
|---|---|---|
| `add-sections` | Array of section objects | `sections[].name` (required), `.projectId` (required) |
| `update-sections` | Array of section objects | `sections[].id` (required), `.name` |
| `find-sections` | Query | `projectId` (required), `search` |

### Comment Operations
| MCP Tool Name | Accepts | Key Parameters |
|---|---|---|
| `add-comments` | Array of comment objects | `comments[].content` (required), `.taskId` or `.projectId` |
| `update-comments` | Array of comment objects | `comments[].id` (required), `.content` |
| `find-comments` | Single lookup | `taskId` or `projectId` or `commentId` |

### Organization & Metadata
| MCP Tool Name | Accepts | Key Parameters |
|---|---|---|
| `get-overview` | Single | `projectId` (optional — omit for full account overview) |
| `delete-object` | Single | `type` (project/section/task/comment), `id` |
| `fetch-object` | Single | `type` (task/project/comment/section), `id` |
| `user-info` | None | Returns timezone, goals, plan info |
| `find-activity` | Query | `eventType`, `objectType`, `objectId`, `projectId`, `initiatorId`, `limit` |
| `find-project-collaborators` | Query | `projectId` (required), `searchTerm` |
| `manage-assignments` | Bulk | `operation` (assign/unassign/reassign), `taskIds[]`, `responsibleUser` |
| `list-workspaces` | None | Returns all workspaces |
| `search` | Text search | `query` — searches across tasks and projects |
| `fetch` | Single | `id` in format "task:{id}" or "project:{id}" |

## Current File Contents

### agents/todoist-agent.md (current)
```markdown
(see attached — currently describes abstract operations like "create | complete | update | delete | query | list-structure" without referencing any MCP tool names)
```

### skills/todoist-tasks/SKILL.md (current)
```markdown
(see attached — describes a "Delegation Protocol" with abstract Operation/Parameters/Context format, treats everything as singular operations, mentions "Batch creation" as an afterthought)
```

### skills/todoist-sync/SKILL.md (current)
```markdown
(see attached — tells the agent to delegate with "Operation: list-structure, scope=all" — an invented protocol that doesn't map to any MCP tool)
```

## Design Problems to Solve

### 1. No MCP tool name grounding
The agent instructions say "execute the operation using the appropriate MCP tool" but never name the tools. When the agent encounters an operation like "complete", it has to guess the tool name. It guessed `complete-task` (singular) — wrong. The correct name is `complete-tasks` (plural). This caused a 42-minute failure loop in production.

### 2. Singular-first design wastes batch capability
The Doist MCP is **batch-native**: `add-tasks` takes an array, `complete-tasks` takes an array of IDs, `update-tasks` takes an array. Our skills treat batching as an afterthought ("When the user provides multiple tasks at once, list all tasks in a single delegation with one task per line"). This means:
- Completing 5 tasks = 5 separate `complete-tasks` calls instead of 1
- Creating 3 tasks = 3 calls instead of 1
- The agent never thinks to collect and batch

### 3. Invented delegation protocol adds indirection
The skills define an `Operation: create | complete | update` protocol that doesn't map to anything real. The agent has to translate "Operation: complete" → find the right MCP tool → guess the name → call it. This translation layer adds complexity and failure modes without adding value.

### 4. Skills and agent overlap
The todoist-tasks skill and todoist-agent both describe the same operations with slightly different formats. The skill says "delegate with this protocol" and the agent says "expect this protocol." But the protocol is an abstraction layer that doesn't match the actual MCP interface.

## Design Constraints

1. **The agent and skills are loaded as system prompts** — they need to be concise. Every token counts.
2. **The agent runs as a subagent** with full MCP tool access (confirmed via testing).
3. **The MCP tool names are the source of truth** — the plugin should align with them, not invent its own vocabulary.
4. **Batch operations should be the default pattern**, not an afterthought. The agent should naturally collect items and make single batch calls.
5. **The MCP server handles priority mapping** — the Doist MCP accepts `p1`-`p4` directly and the response also uses `p1`-`p4`. The agent doesn't need to do any mapping.
6. **The MCP server handles name resolution** — tools accept project names, user names/emails, natural language dates. The agent doesn't need to pre-resolve IDs.

## Your Task

Redesign these three files:

1. **`agents/todoist-agent.md`** — The agent's system prompt. Should ground the agent in exact MCP tool names and batch-first patterns.
2. **`skills/todoist-tasks/SKILL.md`** — The skill that triggers for task operations. Should instruct the main agent on how to delegate efficiently.
3. **`skills/todoist-sync/SKILL.md`** — The skill for structure queries. Should reference the actual MCP tools (`find-projects`, `find-sections`, `get-overview`).

### Design Principles

- **Tool names are explicit**: Never say "use the appropriate tool." Name the exact MCP tool.
- **Batch-first**: Default examples show arrays. Single items are just arrays of length 1.
- **No invented protocols**: Drop the `Operation: create | complete` abstraction. Speak in terms of MCP tool calls directly.
- **Concise**: These are system prompts. Every word should earn its place. Prefer tables over prose.
- **Ergonomic delegation**: The skill should make it easy for the main agent to hand off batched work. For example: "Collect all task IDs to complete, then delegate once" rather than "delegate for each task."
- **Error handling stays practical**: Auth errors → suggest `/mcp`. Not-found → suggest re-querying. Don't over-specify.

### Questions to Consider

- Should the skill tell the main agent to batch-collect before delegating, or should the agent itself be smart enough to batch?
- Should the todoist-sync skill even exist as a separate skill, or should structure queries just be part of todoist-tasks?
- How explicit should the MCP tool reference be? Full parameter schemas? Or just tool names with the most common parameters?
- Is the "Delegation Protocol" concept still useful, or should the skill just say "dispatch todoist-agent with a natural language description of what you need"?
