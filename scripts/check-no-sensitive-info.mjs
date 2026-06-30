#!/usr/bin/env node
/**
 * Checks that no sensitive information appears in any committed source file.
 * Mirrors the pattern used in open-agent-audit and wasmagent-js.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const FORBIDDEN_PATTERNS = [
  // Internal network addresses
  /\b\w+\.corp\b/,
  /\b\w+\.internal\b/,
  // Absolute user paths (CI environments use /home/runner, not /Users/*)
  /\/Users\/[A-Za-z0-9_-]+\//,
  // API keys that look like real secrets (basic heuristic)
  /sk-[A-Za-z0-9]{40,}/,
  /AKIA[0-9A-Z]{16}/,
];

const SCAN_EXTENSIONS = new Set(['.ts', '.js', '.json', '.md', '.yaml', '.yml', '.sh', '.toml']);

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.turbo', '.git', 'coverage', 'target']);

let violations = 0;

function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      const content = readFileSync(full, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`SENSITIVE: ${full} matches ${pattern}`);
          violations++;
        }
      }
    }
  }
}

scanDir(new URL('..', import.meta.url).pathname);

if (violations > 0) {
  console.error(`\n${violations} sensitive pattern(s) found.`);
  process.exit(1);
} else {
  console.log('OK: no sensitive information found.');
}
