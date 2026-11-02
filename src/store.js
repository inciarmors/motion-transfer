import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
export function createStore(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, 'jobs.json');
  const jobs = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  const save = () => { writeFileSync(`${path}.tmp`, JSON.stringify(jobs, null, 2), { mode: 0o600 }); renameSync(`${path}.tmp`, path); };
  for (const j of jobs) if (j.status === 'submitting') { j.status = 'submission_unknown'; j.error = 'Server stopped during submission. Check the provider dashboard before resubmitting.'; }
  save();
  return { jobs, save };
}
