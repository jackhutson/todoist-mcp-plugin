---
name: todoist-tasks
description: >
  This skill should be used when the user asks to "add a task",
  "create a Todoist task", "complete a task", "mark task as done",
  "update a task", "delete a task", "show my tasks", "what's due today",
  "list my Todoist tasks", "check my to-dos", "what do I need to do",
  or mentions Todoist task management, to-do items, or task queries by
  project, priority, label, or due date. Delegates all operations to
  the todoist-agent subagent.
---

# Todoist Task Operations

## Overview

All Todoist task operations delegate to the `todoist-agent` subagent. This skill defines the delegation protocol, parameter formats, and error recovery workflow.

## Delegation Quick Reference

| Operation | Protocol |
|-----------|----------|
| Create task | `Operation: create`, params: content, project, priority (p1-p4), due date, labels |
| Complete task | `Operation: complete`, params: task name or ID |
| Update task | `Operation: update`, params: task ID + changed fields |
| Delete task | `Operation: delete`, params: task ID |
| Query tasks | `Operation: query`, params: filter (project, priority, due date, label) |

## Delegation Protocol

Delegate to the `todoist-agent` subagent with this structure:

```
Operation: [create | complete | update | delete | query]
Parameters: [key-value pairs per the table above]
Context: [cached project/label maps from todoist-sync, if available]
Output format: concise summary
```

### Parameter Details

**Create:**
- `content` (required): Task title/description
- `project`: Project name or ID (defaults to Inbox if omitted)
- `priority`: p1 (urgent), p2 (high), p3 (medium), p4 (normal/default)
- `due`: Natural language date ("today", "tomorrow", "next Monday", "2026-02-20")
- `labels`: Comma-separated label names

**Complete:**
- `task`: Task name (for search) or task ID (for exact match)

**Update:**
- `task`: Task ID (required for updates)
- Any changed fields: content, project, priority, due, labels

**Delete:**
- `task`: Task ID

**Query:**
- `filter`: Todoist filter expression or structured filter
- Common filters: "due today", "priority 1", "project:Work", "@label", "overdue"

## Name Resolution

If the user references a project or label by name and no cached structure exists in conversation context, invoke `todoist:todoist-sync` first to fetch and cache the structure, then proceed with the task operation.

Pass any cached structure as the `Context` parameter so the subagent can resolve names to IDs without additional API calls.

## Common Patterns

**Single task creation:**
Pass all known fields in one delegation. Example: user says "Add 'Review PR #42' to Work with p2 priority due tomorrow" — delegate with content, project, priority, and due date all specified.

**Task queries:**
- "Show my tasks due today" -> `Operation: query, filter: due today`
- "What's overdue?" -> `Operation: query, filter: overdue`
- "Show Work project tasks" -> `Operation: query, filter: project:Work`
- "Show my p1 tasks" -> `Operation: query, filter: priority 1`

**Task completion:**
- "Mark X as done" -> `Operation: complete, task: X`
- "Complete the deploy task" -> `Operation: complete, task: deploy`

**Batch creation:**
When the user provides multiple tasks at once, list all tasks in a single delegation with one task per line in the content parameter. The subagent will create them sequentially.

## Error Recovery

If the `todoist-agent` reports a project, label, or section "not found":

1. Invoke `todoist:todoist-sync` to refresh the cached structure
2. Retry the original operation once with the updated context
3. If the retry also fails, report the error to the user — the entity may genuinely not exist in their Todoist

## Priority Display

When showing tasks to the user, display priorities as p1-p4 (not the internal API numbers). The subagent handles this mapping automatically.
