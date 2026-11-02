import { execFileSync } from 'node:child_process';
const entries = execFileSync('git', ['ls-files', '--stage', '-z'], { encoding:'utf8' }).split('\0').filter(Boolean);
const failures = [];
if (!entries.length) { console.error('No staged/tracked files to inspect. Stage the intended publication first.'); process.exit(1); }
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub credential', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['API credential', /\bsk-[A-Za-z0-9_-]{24,}\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/],
  ['signed media URL', /(?:X-Amz-Signature|X-Goog-Signature)=[a-fA-F0-9]{20,}/],
  ['local personal path', /\/(?:Users|home)\/[A-Za-z0-9_.-]+\//],
  ['URL with embedded credentials', /https?:\/\/[^\s/"'`]+:[^\s/"'`]+@/]
];
for (const entry of entries) {
  const [metadata,path] = entry.split('\t'), [mode,hash] = metadata.split(' ');
  if (mode === '120000') failures.push(`${path}: symlinks must not be published`);
  if (/(^|\/)(?:\.env(?:\..*)?|\.data|uploads|outputs|captures|research-raw|node_modules)(?:\/|$)/.test(path) && path !== '.env.example') failures.push(`${path}: private/runtime file`);
  if (/\.(har|saz|pem|key|mp4|mov|webm|sqlite3?|zip|tar|gz|log)$/i.test(path)) failures.push(`${path}: capture, media or archive`);
  const data = execFileSync('git', ['cat-file', 'blob', hash]);
  if (data.length > 2 * 1024 * 1024 || data.includes(0)) { failures.push(`${path}: binary/oversized file needs manual review`); continue; }
  const text = data.toString('utf8');
  for (const [label,re] of rules) if (re.test(text)) failures.push(`${path}: possible ${label}`);
  if(path === '.env.example' && text.split('\n').some(line=>/^(?:FAL_KEY|HF_CREDENTIALS|DASHSCOPE_API_KEY|CUSTOM_API_KEY)\s*=\s*\S/.test(line))) failures.push(`${path}: example credentials must be empty`);
}
if (failures.length) { console.error('Public-file review failed (values suppressed):\n'+failures.join('\n')); process.exit(1); }
console.log(`Reviewed ${entries.length} index entries: no matching secrets, private captures or runtime artifacts. Review the diff too; this scan is heuristic.`);
