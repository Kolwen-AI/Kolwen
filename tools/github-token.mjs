// Reads a GitHub token by name: the process environment first, then, on Windows, the User environment. Throws, naming the variable,
// when neither has it. Only the two house names are accepted (GITHUB_READ_TOKEN for reads, GITHUB_TOKEN only where a tool writes).
import { execFileSync } from 'node:child_process';

const NAMES = new Set(['GITHUB_READ_TOKEN', 'GITHUB_TOKEN']);

export function githubToken(name) {
  if (!NAMES.has(name)) throw new Error(`unknown token name: ${name}`);
  let tok = process.env[name] || '';
  if (!tok && process.platform === 'win32') {
    tok = execFileSync('powershell', ['-NoProfile', '-Command', `[Environment]::GetEnvironmentVariable('${name}','User')`]).toString().trim();
  }
  if (!tok) throw new Error(`${name} is not set (process or Windows User environment)`);
  return tok;
}
