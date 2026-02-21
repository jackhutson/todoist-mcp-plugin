# Todoist Plugin Skill & Agent Redesign — Design

**Date:** 2026-02-21
**Status:** Approved
**Prompt:** [skill-redesign-prompt.md](./2026-02-21-skill-redesign-prompt.md)

## Problem Summary

The todoist-agent guesses MCP tool names wrong (e.g., `complete-task` instead of `complete-tasks`) because the agent and skill definitions use an invented delegation protocol (`Operation: create | complete | ...`) that never references actual MCP tool names. Additionally, all operations are singular-first, wasting the batch-native MCP API.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Keep todoist-sync separate? | **Yes** | Two focused skill descriptions minimize idle metadata cost (~25-40 tokens each). Tight trigger surfaces mean each skill fires only when relevant. |
| Persistent cache (SQLite/file)? | **No — conversation-context only** | Keep redesign scoped to fixing tool grounding + batch-first. Persistence is a separate feature. |
| Delegation style? | **Natural language** | Skills tell the main agent what to ask for. The agent's system prompt maps natural language to exact MCP tools. No invented protocol. Preserves subagent isolation. |
| Tool reference detail level? | **Tool name + key params table** | ~27 rows, 3 columns. Enough to call correctly, not so much that it duplicates the MCP schema. ~500-600 tokens. |
| Priority mapping? | **Strip it out** | MCP server accepts p1-p4 directly. No agent-side mapping needed. |
| Name-to-ID resolution instructions? | **Strip it out** | MCP server accepts project/user names and natural language dates. Agent just passes through. |
| Batch logic location? | **Skill instructs main agent to batch-collect** | todoist-tasks skill says "collect all items, delegate once." Agent receives a pre-batched request and makes a single MCP call. |

## Architecture (Unchanged)

```
Main Context                          Subagent Context
┌─────────────────────┐               ┌──────────────────────────┐
│ Skill metadata       │               │ todoist-agent system     │
│ (~50-80 tok idle)    │               │ prompt (~600 tok)        │
│                      │  natural      │                          │
│ Skill body           │  language     │ MCP Tool Reference Table │
│ (loaded on trigger)  │ ──────────►  │ (exact tool names)       │
│                      │  delegation   │                          │
│ No MCP knowledge     │               │ MCP tool schemas         │
│ in main context      │               │ (~2500 tok, from server) │
└─────────────────────┘               └──────────────────────────┘
```

## File 1: `agents/todoist-agent.md`

### Frontmatter
Unchanged (name, description with examples, model: inherit, color: cyan).

### System Prompt Structure

1. **Role statement** (1 sentence): "You are a Todoist operations agent. Use the MCP tools below to execute requests and return concise results."

2. **MCP Tool Reference Table** (~27 rows):

| MCP Tool | Purpose | Key Params |
|----------|---------|------------|
| `add-tasks` | Create tasks | `tasks[].content` (required), `.projectId`, `.priority` (p1-p4), `.dueString`, `.labels[]`, `.description` |
| `complete-tasks` | Complete tasks | `ids[]` (string array) |
| `update-tasks` | Update tasks | `tasks[].id` (required) + changed fields |
| `find-tasks` | Search tasks | `searchText`, `projectId`, `labels[]`, `limit` |
| `find-tasks-by-date` | Tasks by date | `startDate` ("today" or YYYY-MM-DD), `daysCount` |
| `find-completed-tasks` | Completed tasks | `since`, `until` (both YYYY-MM-DD, required) |
| `add-projects` | Create projects | `projects[].name` (required), `.viewStyle` |
| `update-projects` | Update projects | `projects[].id` (required) + changed fields |
| `find-projects` | Search projects | `search`, `limit` |
| `project-management` | Archive/unarchive | `projectId`, `action` |
| `add-sections` | Create sections | `sections[].name`, `.projectId` (both required) |
| `update-sections` | Update sections | `sections[].id` (required), `.name` |
| `find-sections` | Search sections | `projectId` (required), `search` |
| `add-comments` | Add comments | `comments[].content` (required), `.taskId` or `.projectId` |
| `update-comments` | Update comments | `comments[].id` (required), `.content` |
| `find-comments` | Find comments | `taskId` or `projectId` or `commentId` |
| `get-overview` | Account/project overview | `projectId` (optional — omit for full account) |
| `delete-object` | Delete any object | `type` (project/section/task/comment), `id` |
| `fetch-object` | Fetch single object | `type`, `id` |
| `user-info` | User details | (none) |
| `find-activity` | Activity log | `eventType`, `objectType`, `projectId`, `limit` |
| `find-project-collaborators` | Find team members | `projectId` (required), `searchTerm` |
| `manage-assignments` | Bulk assign/unassign | `operation`, `taskIds[]`, `responsibleUser` |
| `list-workspaces` | List workspaces | (none) |
| `search` | Cross-entity search | `query` |
| `fetch` | Fetch by composite ID | `id` ("task:{id}" or "project:{id}") |
| `project-move` | Move project context | `projectId`, `action`, `workspaceId` |

3. **Batch-first rule** (2-3 sentences):
   - All mutating tools accept arrays. Always collect items into a single call.
   - One `complete-tasks` call with 5 IDs, not 5 calls with 1 ID each.
   - Single items are arrays of length 1.

4. **Output rules** (brief):
   - Created/completed/updated: confirm with task name and ID
   - Queries: formatted list (name, project, priority, due). Omit empty/default fields.
   - Structure: clean maps grouped by type
   - Keep responses concise — no raw API dumps

5. **Error handling** (3 bullets):
   - Auth failure → suggest `/mcp` to re-authenticate
   - Not found → re-query to verify, suggest sync refresh
   - Ambiguous names → list matches, ask for clarification

### What's Removed
- `Operation: create | complete | update | delete | query | list-structure` protocol
- Priority mapping section (p1 ↔ priority 4 internal mapping)
- Name-to-ID resolution instructions
- "Parse the incoming request into an operation" process section

## File 2: `skills/todoist-tasks/SKILL.md`

### Frontmatter
Keep current description triggers (they're good). No changes to when this skill fires.

### Skill Body Structure

1. **Overview** (1 sentence): All Todoist task operations delegate to the `todoist-agent` subagent via natural language.

2. **Batch-first delegation rule** (lead pattern):
   - Collect all items from the user's request before delegating
   - Multiple creates → one delegation with all tasks listed
   - Multiple completions → one delegation with all task names/IDs
   - Never delegate the same operation type multiple times for one user request

3. **Delegation conventions:**
   - Priority: p1 (highest) through p4 (lowest/default)
   - Project: use the project name as the user said it
   - Due dates: pass through natural language ("tomorrow", "next Friday")
   - Labels: prefix with @ if the user doesn't

4. **Example delegations** (natural language, not protocol):
   - "Create a task 'Review PR #42' in Work, p2 priority, due tomorrow"
   - "Complete these tasks: Deploy hotfix, Update docs, Close issue #99"
   - "Show tasks due today"
   - "Create 3 tasks in Personal: Buy groceries (due today), Call dentist (due Monday, p2), Renew subscription (due March 1)"

5. **Error recovery** (unchanged):
   - Agent reports not-found → invoke `todoist:todoist-sync` → retry once → report if still failing

### What's Removed
- `Operation: create | complete | update | delete | query` delegation protocol
- Parameter details table (agent knows the tools)
- `Context:` parameter passing format

## File 3: `skills/todoist-sync/SKILL.md`

### Frontmatter
Keep current description triggers. No changes.

### Skill Body Structure

1. **Purpose** (1 sentence): Fetch Todoist structure (projects, sections) so future task operations can reference them by name.

2. **When to invoke** (3 bullets):
   - User asks ("list my projects", "refresh Todoist")
   - A todoist-tasks delegation fails with not-found
   - Start of a session with expected heavy Todoist use

3. **Delegation** (natural language):
   - "Ask todoist-agent for all projects and their sections"
   - For partial: "Ask todoist-agent for just the projects" / "just the sections in project X"

4. **Cache usage:**
   - Store the returned structure in conversation context
   - Include it when delegating future todoist-tasks operations so the agent has context

5. **Re-sync triggers:**
   - Not-found errors from task operations
   - User reports structure changes

### What's Removed
- `Operation: list-structure, scope=all` invented protocol
- Scope narrowing (`scope=projects|labels|sections`)
- Rigid "Cache Format" specification

## Token Budget Estimates

| Component | Current | Redesigned | Change |
|-----------|---------|------------|--------|
| Agent system prompt | ~800 tokens | ~600-700 tokens | -15% |
| todoist-tasks skill body | ~500 tokens | ~200-250 tokens | -55% |
| todoist-sync skill body | ~350 tokens | ~150-200 tokens | -50% |
| Skill metadata (idle cost) | ~80 tokens | ~80 tokens | unchanged |

## Out of Scope

- Persistent caching (SQLite, file-based) — separate feature/PR
- README changes — update after implementation
- plugin.json changes — no structural changes needed
- New skills or agents — same 3 files, redesigned
