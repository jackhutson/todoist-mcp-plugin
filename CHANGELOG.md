# Changelog

## [1.1.0] - 2026-02-21

### Fixed
- Agent no longer guesses MCP tool names — all 27 tools explicitly listed in system prompt
- Batch operations work correctly — `complete-tasks` with 5 IDs in one call instead of 5 calls
- Removed incorrect priority mapping (p1 ↔ priority 4) — MCP server handles p1-p4 directly
- Removed unnecessary name-to-ID resolution instructions — MCP server accepts project names directly

### Changed
- **todoist-agent:** Replaced invented delegation protocol with MCP tool reference table and batch-first rule
- **todoist-tasks skill:** Replaced `Operation:` protocol with natural language delegation and batch-collection guidance
- **todoist-sync skill:** Replaced `Operation: list-structure` protocol with natural language delegation
- Added "Lessons Learned" section to README documenting the v1.0 failure mode

### Removed
- `Operation: create | complete | update | delete | query | list-structure` delegation protocol
- Priority mapping section (MCP server handles this)
- Name-to-ID resolution process (MCP server handles this)
- Verbose parameter details tables in skills (agent has MCP schemas)

## [1.0.0] - 2026-02-20

### Added
- Initial release with subagent isolation architecture
- todoist-agent wrapping the official Doist MCP server
- todoist-tasks skill for task CRUD operations
- todoist-sync skill for structure caching
- OAuth-based authentication via Doist MCP
