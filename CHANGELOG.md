# Changelog

## [2.1.0] - 2026-07-12

### Fixed
- **Install was broken:** empty `owner`/`author` objects in the plugin
  manifests made `claude plugin marketplace add` fail schema validation.
  CI meta check now guards `owner.name`/`author.name`.
- **Silent project misrouting:** capture and daily filed tasks with
  quickadd `#Project` tokens, which only match exact single-word names —
  multi-word/emoji projects fell through to Inbox with literal `#...`
  text. Creations now route via `td task add --project` (fuzzy-matched).
- Ops skill documented `td task reschedule <when>`; the CLI accepts only
  YYYY-MM-DD there. Natural-language dates are documented via `--due`.
- Noted `td task delete` without `--yes` is an exit-0 no-op.

### Added
- Lazy structure cache at `~/.config/todoist-plugin/structure.md` —
  exact project/label names for routing without discovery calls; seeded
  by `/todoist:setup`, refreshed only on name-not-found. Zero idle cost.
- README token table now states the whole-plugin always-on cost (~870
  tokens via `claude plugin details`) alongside per-skill chars/4 floors.

## [2.0.0] - 2026-07-03

### Changed (breaking)
- **Transport: Doist MCP server → official `td` CLI** (`@doist/todoist-cli`
  ≥ 1.75.0). No MCP schemas anywhere; OAuth handled by `td auth login`.
- **todoist-agent** repurposed from MCP holder to context firewall: runs
  td commands in its own context, returns ≤30-line digests.
- Marketplace/plugin metadata rewritten for the new positioning.

### Added
- `todoist` ops skill — curated td command surface (~625 tokens
  triggered) with batch-first, error-repair, and untrusted-content rules.
- `/todoist:setup` — install, auth, `td doctor`, optional read-only
  permission allowlist.
- `/todoist:capture` — harvest session loose ends into tasks.
- `/todoist:daily` — morning ritual (triage → capture → prioritize →
  sort → plan) with an enforced efficiency contract.
- `/todoist:triage` — inbox-zero processor with batched apply.
- Lazy preferences at `~/.config/todoist-plugin/preferences.md`.
- CI: metadata validation, skill token budgets, td drift check.

### Removed
- `.mcp.json` and the MCP tool table.
- v1 skills `todoist-tasks` and `todoist-sync` (replaced by `todoist`).

### Migration
Run `/todoist:setup`, then remove the old `todoist` MCP connection via
`/mcp`. Task vocabulary triggers the new ops skill automatically.

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
