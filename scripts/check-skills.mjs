#!/usr/bin/env node
// Lint skill frontmatter and enforce per-skill token budgets (~chars/4).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BUDGETS = { todoist: 1300, setup: 1200, capture: 900, triage: 1000, daily: 1400 };
const DEFAULT_BUDGET = 1500;

const root = new URL('..', import.meta.url).pathname;
const skillsDir = join(root, 'skills');
let failed = false;

for (const dir of readdirSync(skillsDir).sort()) {
  const file = join(skillsDir, dir, 'SKILL.md');
  if (!existsSync(file)) {
    console.error(`FAIL ${dir}: missing SKILL.md`);
    failed = true;
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    console.error(`FAIL ${dir}: missing frontmatter`);
    failed = true;
    continue;
  }
  const [, fm, body] = m;
  if (!/^name:\s*\S/m.test(fm)) {
    console.error(`FAIL ${dir}: frontmatter missing name`);
    failed = true;
  }
  if (!/^description:\s*\S/m.test(fm)) {
    console.error(`FAIL ${dir}: frontmatter missing description`);
    failed = true;
  }
  const budget = BUDGETS[dir] ?? DEFAULT_BUDGET;
  const tokens = Math.round(body.length / 4);
  if (tokens > budget) {
    console.error(`FAIL ${dir}: ~${tokens} tokens > budget ${budget}`);
    failed = true;
  } else {
    console.log(`OK   ${dir}: ~${tokens}/${budget} tokens`);
  }
}
process.exit(failed ? 1 : 0);
