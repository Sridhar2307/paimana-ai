import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate backend and frontend directories
let backendDir = path.join(__dirname, 'backend');
let frontendDir = path.join(__dirname, 'frontend');

if (!fs.existsSync(backendDir) || !fs.existsSync(frontendDir)) {
  backendDir = path.join(__dirname, 'paimana-ai-llm-assistant', 'paimana-ai', 'backend');
  frontendDir = path.join(__dirname, 'paimana-ai-llm-assistant', 'paimana-ai', 'frontend');
}

if (!fs.existsSync(backendDir) || !fs.existsSync(frontendDir)) {
  console.error('❌ Could not locate backend or frontend directories.');
  process.exit(1);
}

// Locate Python executable
let pythonCmd = 'python';
let pythonArgs = ['run_backend.py'];

const winVenvPy = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
const unixVenvPy = path.join(backendDir, '.venv', 'bin', 'python');

if (fs.existsSync(winVenvPy)) {
  pythonCmd = winVenvPy;
} else if (fs.existsSync(unixVenvPy)) {
  pythonCmd = unixVenvPy;
} else if (process.platform === 'win32') {
  pythonCmd = 'py';
  pythonArgs = ['-3.12', 'run_backend.py'];
}

console.log('====================================================');
console.log('🚀 PAIMANA-AI: Starting Full Local Development Stack');
console.log('====================================================');
console.log(`📁 Backend:  ${backendDir}`);
console.log(`📁 Frontend: ${frontendDir}`);
console.log(`🐍 Python:   ${pythonCmd} ${pythonArgs.join(' ')}`);
console.log('====================================================\n');

// Start backend
const backend = spawn(pythonCmd, pythonArgs, {
  cwd: backendDir,
  shell: true,
  env: { ...process.env, PYTHONUNBUFFERED: '1' },
});

backend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l) => console.log(`\x1b[36m[BACKEND]\x1b[0m ${l}`));
});

backend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l) => console.log(`\x1b[33m[BACKEND]\x1b[0m ${l}`));
});

backend.on('error', (err) => {
  console.error('\x1b[31m[BACKEND ERROR]\x1b[0m', err.message);
});

// Start frontend
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  env: process.env,
});

frontend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l) => console.log(`\x1b[32m[FRONTEND]\x1b[0m ${l}`));
});

frontend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l) => console.log(`\x1b[35m[FRONTEND]\x1b[0m ${l}`));
});

frontend.on('error', (err) => {
  console.error('\x1b[31m[FRONTEND ERROR]\x1b[0m', err.message);
});

function cleanup() {
  console.log('\n🛑 Stopping PAIMANA-AI servers...');
  try {
    backend.kill();
  } catch (e) {}
  try {
    frontend.kill();
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
