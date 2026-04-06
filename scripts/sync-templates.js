#!/usr/bin/env node

/**
 * Syncs source files into templates/ for npm publishing.
 * Run before `npm publish` or via `npm run sync-templates`.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES = path.join(ROOT, 'templates');

// Exclusions for dashboard
const DASHBOARD_EXCLUDE = new Set([
  'node_modules',
  'dist',
  'test-results',
  'package-lock.json',
  '.vite',
]);

function clean() {
  if (fs.existsSync(TEMPLATES)) {
    fs.rmSync(TEMPLATES, { recursive: true });
  }
  fs.mkdirSync(TEMPLATES, { recursive: true });
}

function copyWithFilter(src, dest, excludes) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (source) => {
      const rel = path.relative(src, source);
      if (!rel) return true; // root dir itself
      const firstSegment = rel.split(path.sep)[0];
      return !excludes.has(firstSegment);
    },
  });
}

function main() {
  console.log('[sync-templates] Cleaning templates/...');
  clean();

  console.log('[sync-templates] Copying dashboard...');
  copyWithFilter(
    path.join(ROOT, 'dashboard'),
    path.join(TEMPLATES, 'dashboard'),
    DASHBOARD_EXCLUDE,
  );

  console.log('[sync-templates] Copying squads/bmad...');
  fs.cpSync(
    path.join(ROOT, 'squads'),
    path.join(TEMPLATES, 'squads'),
    { recursive: true },
  );

  console.log('[sync-templates] Copying .claude/skills...');
  fs.cpSync(
    path.join(ROOT, '.claude'),
    path.join(TEMPLATES, '.claude'),
    { recursive: true },
  );

  console.log('[sync-templates] Copying .agent/workflows...');
  fs.cpSync(
    path.join(ROOT, '.agent'),
    path.join(TEMPLATES, '.agent'),
    { recursive: true },
  );

  console.log('[sync-templates] Copying CLAUDE.md...');
  fs.copyFileSync(
    path.join(ROOT, 'CLAUDE.md'),
    path.join(TEMPLATES, 'CLAUDE.md'),
  );

  console.log('[sync-templates] Done!');
}

main();
