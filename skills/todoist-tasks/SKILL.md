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
