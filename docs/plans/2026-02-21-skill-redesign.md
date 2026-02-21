# Todoist Plugin Skill & Agent Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the todoist-agent system prompt, todoist-tasks skill, and todoist-sync skill to ground them in exact MCP tool names and batch-first patterns, eliminating the invented delegation protocol that caused production failures.

**Architecture:** Three markdown files are rewritten in-place. The agent gets an MCP tool reference table replacing the abstract operations table. Both skills switch from a structured `Operation:` protocol to natural language delegation with batch-collection guidance. Frontmatter (name, description, triggers) is preserved on all three files.

**Tech Stack:** Markdown (Claude Code plugin system — agent `.md` and skill `SKILL.md` files)

**Design doc:** `docs/plans/2026-02-21-skill-redesign-design.md`

---

### Task 1: Rewrite `agents/todoist-agent.md` system prompt body

**Files:**
- Modify: `agents/todoist-agent.md:45-113` (everything after the frontmatter closing `---`)

**Step 1: Replace the system prompt body**

Keep lines 1-44 (the YAML frontmatter) exactly as-is. Replace everything from line 45 onward with the new system prompt:

```markdown
You are a Todoist operations agent with access to the official Doist MCP tools. Execute requests and return concise results.

## MCP Tool Reference

| Tool | Purpose | Key Params |
|------|---------|------------|
| `add-tasks` | Create tasks | `tasks[].content` (required), `.projectId`, `.priority` (p1-p4), `.dueString`, `.labels[]`, `.description`, `.parentId`, `.sectionId` |
| `complete-tasks` | Complete tasks | `ids[]` (string array) |
| `update-tasks` | Update tasks | `tasks[].id` (required) + any changed fields |
| `find-tasks` | Search tasks | `searchText`, `projectId`, `sectionId`, `labels[]`, `responsibleUser`, `limit` |
| `find-tasks-by-date` | Tasks by date | `startDate` ("today" or YYYY-MM-DD), `daysCount` (1-30), `overdueOption` |
| `find-completed-tasks` | Completed tasks | `since`, `until` (both YYYY-MM-DD, required), `projectId` |
| `add-projects` | Create projects | `projects[].name` (required), `.viewStyle`, `.parentId`, `.isFavorite` |
| `update-projects` | Update projects | `projects[].id` (required) + changed fields |
| `find-projects` | Search projects | `search` (partial, case-insensitive), `limit` |
| `project-management` | Archive/unarchive | `projectId`, `action` (archive/unarchive) |
| `project-move` | Move project context | `projectId`, `action` (move-to-workspace/move-to-personal), `workspaceId` |
| `add-sections` | Create sections | `sections[].name`, `.projectId` (both required) |
| `update-sections` | Update sections | `sections[].id` (required), `.name` |
| `find-sections` | Search sections | `projectId` (required), `search` |
| `add-comments` | Add comments | `comments[].content` (required), `.taskId` or `.projectId` |
| `update-comments` | Update comments | `comments[].id` (required), `.content` |
| `find-comments` | Find comments | `taskId` or `projectId` or `commentId` |
| `get-overview` | Account/project overview | `projectId` (optional — omit for full account) |
| `delete-object` | Delete any object | `type` (project/section/task/comment), `id` |
| `fetch-object` | Fetch single object | `type` (task/project/comment/section), `id` |
| `user-info` | User details | (none) |
| `find-activity` | Activity log | `eventType`, `objectType`, `objectId`, `projectId`, `limit` |
| `find-project-collaborators` | Find team members | `projectId` (required), `searchTerm` |
| `manage-assignments` | Bulk assign/unassign | `operation` (assign/unassign/reassign), `taskIds[]`, `responsibleUser` |
| `list-workspaces` | List workspaces | (none) |
| `search` | Cross-entity search | `query` |
| `fetch` | Fetch by composite ID | `id` ("task:{id}" or "project:{id}") |

## Rules

**Batch-first:** All mutating tools accept arrays. Collect items into a single call — one `complete-tasks` with 5 IDs, not 5 calls. Single items are arrays of length 1.

**Output:**
- Created/completed/updated: confirm with task name and ID
- Queries: formatted list (name, project, priority, due). Omit empty/default fields.
- Structure: clean maps grouped by type (projects, sections)
- Keep responses concise — no raw API dumps

**Errors:**
- Auth failure → suggest `/mcp` to re-authenticate
- Not found → report which entity wasn't found, suggest sync refresh
- Ambiguous names → list matches, ask for clarification
```

**Step 2: Verify the rewrite**

Visually confirm:
- Lines 1-44 (frontmatter) are unchanged
- No `Operation:` protocol references remain
- No "Priority Mapping" section remains
- No "name-to-ID resolution" instructions remain
- The tool reference table has all 27 MCP tools
- Batch-first rule is present

**Step 3: Commit**

```bash
git add agents/todoist-agent.md
git commit -m "feat: rewrite todoist-agent with MCP tool reference table

Replace invented delegation protocol with exact MCP tool names.
Remove wrong priority mapping and unnecessary name resolution.
Add batch-first rule for array-native MCP tools."
```

---

### Task 2: Rewrite `skills/todoist-tasks/SKILL.md`

**Files:**
- Modify: `skills/todoist-tasks/SKILL.md:12-98` (everything after the frontmatter closing `---`)

**Step 1: Replace the skill body**

Keep lines 1-11 (the YAML frontmatter) exactly as-is. Replace everything from line 12 onward with:

```markdown
# Todoist Task Operations

All task operations delegate to the `todoist-agent` subagent via natural language.

## Batch-First Delegation

Collect all items from the user's request before delegating. One delegation per operation type:
- Multiple creates → list all tasks in one delegation
- Multiple completions → list all task names/IDs in one delegation
- Never call the agent separately for each item in a batch

## Delegation Conventions

When describing tasks to the agent, use these formats:
- **Priority:** p1 (highest) through p4 (lowest/default)
- **Project:** use the project name as the user said it
- **Due dates:** pass through natural language ("tomorrow", "next Friday", "March 15")
- **Labels:** prefix with @ if the user doesn't

## Examples

- "Create a task 'Review PR #42' in Work, p2 priority, due tomorrow"
- "Complete these tasks: Deploy hotfix, Update docs, Close issue #99"
- "Show tasks due today"
- "Create 3 tasks in Personal: Buy groceries (due today), Call dentist (due Monday, p2), Renew subscription (due March 1)"

## Error Recovery

If the agent reports a project, label, or section "not found":
1. Invoke `todoist:todoist-sync` to refresh structure
2. Retry the original operation once
3. If still failing, report to the user — the entity may not exist
```

**Step 2: Verify the rewrite**

Visually confirm:
- Lines 1-11 (frontmatter with description triggers) are unchanged
- No `Operation: create | complete` protocol references remain
- No parameter details table remains
- No `Context:` parameter format remains
- Batch-first delegation is the lead section
- Delegation conventions section is present
- Error recovery workflow is preserved

**Step 3: Commit**

```bash
git add skills/todoist-tasks/SKILL.md
git commit -m "feat: rewrite todoist-tasks skill with batch-first delegation

Replace Operation protocol with natural language delegation.
Add batch-collection rule as lead pattern.
Add delegation conventions (p1-p4, project names, dates)."
```

---

### Task 3: Rewrite `skills/todoist-sync/SKILL.md`

**Files:**
- Modify: `skills/todoist-sync/SKILL.md:10-61` (everything after the frontmatter closing `---`)

**Step 1: Replace the skill body**

Keep lines 1-9 (the YAML frontmatter) exactly as-is. Replace everything from line 10 onward with:

```markdown
# Todoist Structure Sync

Fetch Todoist structure (projects, sections) so future task operations can reference them by name.

## When to Invoke

- User asks ("list my projects", "refresh Todoist", "show my sections")
- A todoist-tasks delegation fails with a not-found error
- Start of a session with expected heavy Todoist use

## Delegation

Ask the `todoist-agent` for the current structure:
- Full sync: "List all projects and their sections"
- Partial: "List just the projects" or "List sections in project X"

## After Sync

- Store the returned structure in conversation context
- Include it when delegating future todoist-tasks operations
- Re-sync if a task operation fails with not-found, or if the user reports structure changes
```

**Step 2: Verify the rewrite**

Visually confirm:
- Lines 1-9 (frontmatter with description triggers) are unchanged
- No `Operation: list-structure` protocol references remain
- No rigid "Cache Format" specification remains
- No scope narrowing (`scope=projects|labels|sections`) remains
- Delegation is natural language
- Re-sync triggers are preserved

**Step 3: Commit**

```bash
git add skills/todoist-sync/SKILL.md
git commit -m "feat: rewrite todoist-sync skill with natural language delegation

Replace invented list-structure protocol with natural language.
Simplify cache and re-sync guidance."
```

---

### Task 4: Final review and token budget check

**Files:**
- Read: `agents/todoist-agent.md`
- Read: `skills/todoist-tasks/SKILL.md`
- Read: `skills/todoist-sync/SKILL.md`

**Step 1: Read all three files end-to-end**

Verify the complete files are coherent and match the design doc.

**Step 2: Check for leftover references**

Search all three files for these terms that should no longer appear:
- `Operation:` (the old protocol)
- `list-structure` (invented operation)
- `priority 4 in the API` / `priority 3` / `priority 2` / `priority 1` (old mapping)
- `resolve any project/label names to IDs` (removed)
- `Parse the incoming request` (removed process section)

Run: `grep -rn "Operation:" agents/ skills/` — expected: no matches
Run: `grep -rn "list-structure" agents/ skills/` — expected: no matches
Run: `grep -rn "priority [1-4] in the API" agents/ skills/` — expected: no matches

**Step 3: Verify token budget**

Rough word count as proxy (~0.75 tokens per word for markdown):
- Agent body: target ~600-700 tokens → ~450-525 words
- todoist-tasks body: target ~200-250 tokens → ~150-190 words
- todoist-sync body: target ~150-200 tokens → ~110-150 words

Run: `wc -w agents/todoist-agent.md skills/todoist-tasks/SKILL.md skills/todoist-sync/SKILL.md`

**Step 4: No further commit needed unless issues found**

If all checks pass, the redesign is complete.
