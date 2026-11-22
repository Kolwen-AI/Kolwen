import { execFileSync } from 'node:child_process';
const tok = execFileSync('powershell', ['-NoProfile', '-Command', "[Environment]::GetEnvironmentVariable('GITHUB_READ_TOKEN','User')"]).toString().trim();
const H = { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' };
const g = async p => (await fetch(`https://api.github.com/repos/TheColliery/Kolwen/${p}`, { headers: H })).json();
const cq = await g('code-scanning/alerts?state=open&per_page=50'); console.log('CodeQL open', cq.length, cq.map(a => `#${a.number} ${a.rule?.id} ${a.created_at?.slice(0,10)}`).join('; '));
const ss = await g('secret-scanning/alerts?state=open&per_page=50'); console.log('secret open', Array.isArray(ss) ? ss.length : JSON.stringify(ss).slice(0,80));
const dp = await g('dependabot/alerts?state=open&per_page=50'); console.log('Dependabot open', dp.length, dp.map(a => `#${a.number} ${a.security_advisory.ghsa_id}`).join('; '));
