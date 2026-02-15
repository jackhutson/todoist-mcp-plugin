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

## Purpose

Fetch and cache the current Todoist structure (projects, sections, labels) so future task operations can resolve names to IDs without discovery round-trips. This eliminates repeated lookups and reduces subagent invocations.

## When to Invoke

- User explicitly requests a refresh ("refresh Todoist", "list my projects", "show my labels")
- A todoist-tasks delegation fails because a project, label, or section name was not found
- Start of a session where heavy Todoist use is expected

## Delegation Protocol

Delegate to the `todoist-agent` subagent with:

```
Operation: list-structure
Parameters: scope=all
Output format: name-to-ID map
```

For partial refreshes, narrow the scope:

```
Operation: list-structure
Parameters: scope=projects|labels|sections
Output format: name-to-ID map
```

## Cache Format

Store the returned structure in conversation context for subsequent operations. Expected format:

```
Projects: ProjectName (ID: xxx), ProjectName2 (ID: yyy), ...
Labels: @label1 (ID: xxx), @label2 (ID: yyy), ...
Sections: SectionName in ProjectName (ID: xxx), ...
```

Include this cached structure as the `Context` parameter in subsequent todoist-tasks delegations so the subagent can resolve names without additional API calls.

## Staleness and Re-Sync

Re-invoke this skill if:
- A task operation fails with "project not found", "label not found", or "section not found"
- The user reports that their Todoist structure has changed (new projects, renamed labels, etc.)
- The user explicitly asks to refresh or sync

Do not proactively re-sync unless one of these conditions is met. The cached structure is assumed valid for the duration of the conversation.

## Workflow

1. Delegate to `todoist-agent` with `Operation: list-structure, scope=all`
2. Receive the name-to-ID maps from the subagent
3. Present the structure to the user in a readable format
4. Retain the structure in conversation context for use by todoist-tasks delegations
