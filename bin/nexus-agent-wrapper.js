#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Determine agent name from process.argv[1]
const scriptName = path.basename(process.argv[1]);
let agentName = scriptName.replace(/^nexus-/, '');

// If it's just 'nexus', we might need to get the agent from args
let args = process.argv.slice(2);
if (agentName === 'nexus') {
  const agentArgIndex = args.indexOf('--agent');
  if (agentArgIndex !== -1 && agentArgIndex + 1 < args.length) {
    agentName = args[agentArgIndex + 1];
    // Remove --agent <name> from args
    args.splice(agentArgIndex, 2);
  } else {
    console.error("Error: When running 'nexus', you must provide an --agent <name> argument.");
    process.exit(1);
  }
}

const safeName = agentName.replace(/-/g, '_');

// 2. Read the persona from agents/<agent_name>.md
const agentFileCandidates = [
  path.join(ROOT_DIR, 'agents', `${safeName}.md`),
  path.join(ROOT_DIR, 'agents', `nexus_${safeName}.md`),
];

let agentFile = agentFileCandidates.find(p => fs.existsSync(p));
if (!agentFile) {
  console.error(`Missing required agent file (checked: ${agentFileCandidates.join(', ')})`);
  process.exit(2);
}

let agentPrompt = fs.readFileSync(agentFile, 'utf-8');
agentPrompt = agentPrompt.replace(/^---[\s\S]*?---/, '').trim();

// 3. Read the skill from skills/nexus-<agent_name>/SKILL.md
const skillFile = path.join(ROOT_DIR, 'skills', `nexus-${agentName.replace(/_/g, '-')}`, 'SKILL.md');
let skillPrompt = '';
if (fs.existsSync(skillFile)) {
  skillPrompt = fs.readFileSync(skillFile, 'utf-8').trim();
} else {
  console.error(`Missing required skill file: ${skillFile}`);
  process.exit(2);
}

// 4. Handle environment variables
const autoApprove = (process.env.NEXUS_AUTO_APPROVE || 'false').toLowerCase() === 'true';
const timeoutSec = parseInt(process.env.NEXUS_AGENT_TIMEOUT_SEC || '300', 10);
const model = process.env.NEXUS_MODEL || 'gemini-3.1-pro-preview';

// 5. Build combined prompt
const taskInstructions = args.join(' ');

const parts = [
  `# Agent Persona\n${agentPrompt}`,
];
if (skillPrompt) {
  parts.push(`# Skill Instructions\n${skillPrompt}`);
}
parts.push(`# Task Instructions\n${taskInstructions}`);
const combinedPrompt = parts.join('\n\n');

// 6. Invoke the v4.0 orchestrator
// SRE: Prefer pre-compiled dist/index.js for production reliability, fall back to tsx for dev.
const distPath = path.join(ROOT_DIR, 'dist', 'index.js');
const tsxBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx');
const indexPath = path.join(ROOT_DIR, 'src', 'index.tsx');

let cmd, cmdArgs;

if (fs.existsSync(distPath)) {
  cmd = 'node';
  cmdArgs = [distPath];
} else {
  cmd = tsxBin;
  cmdArgs = [indexPath];
}

cmdArgs.push(
  '--agent', agentName,
  '--task', taskInstructions,
  '--model', model
);

if (autoApprove) {
  cmdArgs.push('--auto-approve');
}

const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXUS_COMBINED_PROMPT: combinedPrompt,
  }
});

let timeoutId;
if (timeoutSec > 0) {
  timeoutId = setTimeout(() => {
    console.error(`SRE ALERT: Agent process timed out after ${timeoutSec}s. Initiating graceful shutdown (SIGTERM)...`);
    child.kill('SIGTERM');
    
    // SRE: If not dead in 5s, SIGKILL
    setTimeout(() => {
      try {
        if (child.exitCode === null) {
          console.error(`SRE ALERT: Process ${child.pid} resisted SIGTERM. Escalating to SIGKILL.`);
          child.kill('SIGKILL');
        }
      } catch (e) {}
      process.exit(124);
    }, 5000);
  }, timeoutSec * 1000);
}

child.on('close', (code) => {
  if (timeoutId) clearTimeout(timeoutId);
  process.exit(code !== null ? code : 1);
});

child.on('error', (err) => {
  if (timeoutId) clearTimeout(timeoutId);
  console.error('SRE CRITICAL: Failed to start agent subprocess.', {
    command: cmd,
    args: cmdArgs,
    error: err.message
  });
  process.exit(1);
});
