#!/usr/bin/env node
// Validate plugin/marketplace metadata and v2 structural invariants.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let failed = false;
const fail = (msg) => { console.error(`FAIL ${msg}`); failed = true; };

const plugin = JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8'));
if (plugin.name !== 'todoist') fail('plugin.json: name must be "todoist"');
if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) fail('plugin.json: version must be semver');
if (!plugin.description) fail('plugin.json: description missing');
if (!Array.isArray(plugin.keywords) || plugin.keywords.length === 0) fail('plugin.json: keywords missing');
if (!plugin.author?.name) fail('plugin.json: author.name missing (claude plugin validate requires it)');

const mp = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const entry = (mp.plugins ?? []).find((p) => p.name === 'todoist');
if (!entry || !entry.source || !entry.description) fail('marketplace.json: "todoist" entry incomplete');
if (!mp.owner?.name) fail('marketplace.json: owner.name missing (claude plugin validate requires it)');

if (!existsSync(join(root, 'agents/todoist-agent.md'))) fail('agents/todoist-agent.md missing');
if (existsSync(join(root, '.mcp.json'))) fail('.mcp.json must not exist in v2');

console.log(failed ? 'meta: FAIL' : 'meta: OK');
process.exit(failed ? 1 : 0);
