# todoist plugin for Claude Code

Token-efficient Todoist for Claude Code: lean operations backed by the
official `td` CLI, plus optional workflow skills — session capture, a
daily ritual, and inbox triage — that adapt to your structure instead of
imposing one.

## Quick start

```bash
claude plugin install jackhutson/todoist-mcp-plugin
```

Then in Claude Code:

```
/todoist:setup
```

Setup checks/installs the `td` CLI (`npm install -g @doist/todoist-cli`),
walks through browser OAuth (token stored in your OS keyring), runs
`td doctor`, and offers to allowlist read-only `td` commands so daily use
doesn't trigger permission prompts.

## Skills

| Skill | Invoked | What it does |
|-------|---------|--------------|
| `todoist` | automatically | Lean td command surface for any task operation |
| `/todoist:setup` | manually | Install, auth, health check, permission allowlist |
| `/todoist:capture` | manually | Harvest this session's loose ends into tasks — the reason to have Todoist inside your coding agent |
| `/todoist:daily` | manually | Morning walkthrough: triage overdue → capture → prioritize → sort → plan |
| `/todoist:triage` | manually | Inbox-zero processor, one item at a time, one batch of changes |

Workflow skills learn your preferences lazily — a question is asked only
when first needed, then persisted to
`~/.config/todoist-plugin/preferences.md` (plain markdown; edit freely).

## Architecture

Two execution paths, chosen by output size:

- **Inline `td`** — bounded operations run directly in the main context.
- **`todoist-agent`** — reads that scale with account size (full scans,
  multi-project sweeps) run inside a subagent that returns a ≤30-line
  digest. Verbose output never reaches your context window.

## Token math

| | Idle | Triggered |
|---|------|-----------|
| This plugin (ops skill) | ~110 tokens | ~1.2k tokens |
| Official `td` skill | ~120 tokens | ~6.8k tokens |
| Doist MCP server (always loaded) | ~2.5k tokens/message | — |

Idle = frontmatter loaded every session; triggered = full skill body.
Both budgets are asserted in CI (`scripts/check-skills.mjs`).

## Why not the official `td` skill?

`td skill install claude-code` installs Doist's reference manual: ~6,800
tokens covering the full CLI, including developer apps, billing, backups,
and Help Center search. This plugin's ops skill curates the ~20 commands
task workflows actually use and relies on `td <command> --help` for the
long tail — the CLI is self-documenting. A CI drift check diffs `td`'s
help output against snapshots so the curated surface can't silently rot.

Credit where due: the untrusted-content rule, priority mapping gotcha,
and quickadd guidance are adapted from Doist's skill (MIT).

## Requirements

- Claude Code with plugin support
- Node.js 20+ (for the td CLI)
- Todoist account (free or Pro)

## Migrating from v1

v1 wrapped the Doist MCP server. v2 replaces it with the `td` CLI:
run `/todoist:setup`, then remove the old `todoist` MCP connection via
`/mcp`. The v1 skills (`todoist-tasks`, `todoist-sync`) are gone; the
`todoist` ops skill covers both.

## License

MIT
