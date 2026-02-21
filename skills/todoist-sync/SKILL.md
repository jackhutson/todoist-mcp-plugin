---
name: todoist-sync
description: >
  This skill should be used when the user asks to "refresh Todoist",
  "sync Todoist", "list my projects", "show my labels", "update Todoist
  structure", "show my Todoist sections", or when a todoist-agent operation
  fails with a not-found error for a project, label, or section name.
  Fetches and caches Todoist structure for name-to-ID resolution.
---

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
