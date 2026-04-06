#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

// ─── ANSI Colors ───────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

const LOGO = `
${c.green}  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}
${c.green}  ┃${c.reset}  ${c.bold}${c.white}BMAD Visual${c.reset} ${c.dim}— AI Agent Dashboard${c.reset} ${c.green}┃${c.reset}
${c.green}  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}
`;

function log(msg) {
  console.log(`  ${c.green}>${c.reset} ${msg}`);
}

function success(msg) {
  console.log(`  ${c.green}✓${c.reset} ${msg}`);
}

function warn(msg) {
  console.log(`  ${c.yellow}!${c.reset} ${msg}`);
}

function error(msg) {
  console.error(`  ${c.red}✗${c.reset} ${msg}`);
}

function step(n, total, msg) {
  process.stdout.write(`  ${c.dim}[${n}/${total}]${c.reset} ${msg}...`);
}

function done() {
  console.log(` ${c.green}done${c.reset}`);
}

// ─── Template Resolver ─────────────────────────────────────────
function getTemplatesDir() {
  const dir = path.resolve(__dirname, '..', 'templates');
  if (!fs.existsSync(dir)) {
    error('Templates directory not found. Try reinstalling: npm install -g bmad-visual');
    process.exit(1);
  }
  return dir;
}

// ─── Copy Helper ───────────────────────────────────────────────
function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// ─── Commands ──────────────────────────────────────────────────

function handleInit(projectName) {
  console.log(LOGO);

  // Determine target directory
  let targetDir;
  if (projectName) {
    targetDir = path.resolve(process.cwd(), projectName);
    if (fs.existsSync(targetDir)) {
      const entries = fs.readdirSync(targetDir);
      if (entries.length > 0) {
        error(`Directory "${projectName}" already exists and is not empty.`);
        process.exit(1);
      }
    }
    fs.mkdirSync(targetDir, { recursive: true });
    log(`Creating project in ${c.cyan}${targetDir}${c.reset}`);
  } else {
    targetDir = process.cwd();
    log(`Scaffolding into ${c.cyan}${targetDir}${c.reset}`);
  }

  const templatesDir = getTemplatesDir();
  const totalSteps = 6;

  console.log('');

  // Step 1: Dashboard
  step(1, totalSteps, 'Copying dashboard');
  const dashSrc = path.join(templatesDir, 'dashboard');
  const dashDest = path.join(targetDir, 'dashboard');
  if (fs.existsSync(dashDest)) {
    warn('dashboard/ already exists, overwriting...');
  }
  copyDir(dashSrc, dashDest);
  done();

  // Step 2: Squad definition
  step(2, totalSteps, 'Copying BMAD squad & agents');
  copyDir(
    path.join(templatesDir, 'squads'),
    path.join(targetDir, 'squads'),
  );
  done();

  // Step 3: Claude Code skills
  step(3, totalSteps, 'Copying Claude Code skills');
  copyDir(
    path.join(templatesDir, '.claude'),
    path.join(targetDir, '.claude'),
  );
  done();

  // Step 4: Antigravity workflows
  step(4, totalSteps, 'Copying Antigravity workflows');
  copyDir(
    path.join(templatesDir, '.agent'),
    path.join(targetDir, '.agent'),
  );
  done();

  // Step 4b: Antigravity rules
  const agentsRulesSrc = path.join(templatesDir, '.agents');
  if (fs.existsSync(agentsRulesSrc)) {
    step('4b', totalSteps, 'Copying Antigravity rules');
    copyDir(agentsRulesSrc, path.join(targetDir, '.agents'));
    done();
  }

  // Step 5: CLAUDE.md
  step(5, totalSteps, 'Copying CLAUDE.md');
  copyFile(
    path.join(templatesDir, 'CLAUDE.md'),
    path.join(targetDir, 'CLAUDE.md'),
  );
  done();

  // Step 6: .gitignore
  step(6, totalSteps, 'Updating .gitignore');
  const gitignorePath = path.join(targetDir, '.gitignore');
  const entries = [
    '',
    '# bmad-visual',
    'dashboard/node_modules/',
    'dashboard/dist/',
    'squads/*/state.json',
  ];
  const entriesToAdd = entries.join('\n') + '\n';

  if (fs.existsSync(gitignorePath)) {
    const current = fs.readFileSync(gitignorePath, 'utf-8');
    if (!current.includes('# bmad-visual')) {
      fs.appendFileSync(gitignorePath, entriesToAdd);
    }
  } else {
    fs.writeFileSync(gitignorePath, entriesToAdd.trimStart());
  }
  done();

  // Install dependencies
  console.log('');
  log('Installing dashboard dependencies...');
  try {
    execSync('npm install', {
      cwd: path.join(targetDir, 'dashboard'),
      stdio: 'pipe',
    });
    success('Dependencies installed');
  } catch {
    warn('Could not auto-install. Run manually: cd dashboard && npm install');
  }

  // Done!
  console.log('');
  console.log(`  ${c.green}${c.bold}Done!${c.reset} Your BMAD Visual dashboard is ready.`);
  console.log('');
  console.log(`  ${c.dim}Next steps:${c.reset}`);
  if (projectName) {
    console.log(`    ${c.cyan}cd ${projectName}${c.reset}`);
  }
  console.log(`    ${c.cyan}bmad-visual dev${c.reset}    ${c.dim}Start the dashboard${c.reset}`);
  console.log('');
  console.log(`  ${c.dim}Available agents:${c.reset}`);
  console.log(`    /analyst  /pm  /ux  /architect  /sm  /dev  /qa  /solo-dev  /bmad-help`);
  console.log('');
}

function handleDev() {
  const dashboardDir = path.join(process.cwd(), 'dashboard');

  if (!fs.existsSync(path.join(dashboardDir, 'package.json'))) {
    error('No dashboard found in this directory.');
    log('Run "bmad-visual init" first to scaffold the project.');
    process.exit(1);
  }

  // Check if node_modules exists
  if (!fs.existsSync(path.join(dashboardDir, 'node_modules'))) {
    log('Installing dependencies first...');
    execSync('npm install', { cwd: dashboardDir, stdio: 'inherit' });
  }

  console.log(LOGO);
  log(`Starting dashboard at ${c.cyan}http://localhost:5174${c.reset}`);
  console.log('');

  try {
    execSync('npm run dev', { cwd: dashboardDir, stdio: 'inherit' });
  } catch {
    // User hit Ctrl+C
  }
}

function showHelp() {
  console.log(LOGO);
  console.log(`  ${c.bold}Usage:${c.reset}`);
  console.log('');
  console.log(`    ${c.cyan}bmad-visual init${c.reset}            Scaffold into current directory`);
  console.log(`    ${c.cyan}bmad-visual init ${c.dim}<name>${c.reset}      Create new project directory`);
  console.log(`    ${c.cyan}bmad-visual dev${c.reset}             Start the dashboard dev server`);
  console.log('');
  console.log(`  ${c.bold}Agents:${c.reset}`);
  console.log('');
  console.log(`    ${c.green}/analyst${c.reset}    Mary      Market research & requirements`);
  console.log(`    ${c.green}/pm${c.reset}         John      PRD, epics & stories`);
  console.log(`    ${c.green}/ux${c.reset}         Sally     UX design & wireframes`);
  console.log(`    ${c.green}/architect${c.reset}  Winston   System architecture`);
  console.log(`    ${c.green}/sm${c.reset}         Bob       Sprint planning`);
  console.log(`    ${c.green}/dev${c.reset}        Amelia    TDD implementation`);
  console.log(`    ${c.green}/qa${c.reset}         Quinn     QA & testing`);
  console.log(`    ${c.green}/solo-dev${c.reset}   Barry     Quick dev end-to-end`);
  console.log(`    ${c.green}/bmad-help${c.reset}            Agent guide`);
  console.log('');
}

// ─── Main ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  showHelp();
} else if (command === 'init') {
  handleInit(args[1]);
} else if (command === 'dev') {
  handleDev();
} else if (command === '--version' || command === '-v') {
  const pkg = require('../package.json');
  console.log(pkg.version);
} else {
  error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}
