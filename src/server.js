import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { AppError, validateInput, providerPayload, terminal } from './domain.js';
import { createProviders } from './providers.js';
import { createStore } from './store.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const staticFiles = new Map([['/', ['public/index.html', 'text/html']], ['/app.js', ['public/app.js', 'text/javascript']], ['/style.css', ['public/style.css', 'text/css']]]);
const safeMessage = e => e instanceof AppError ? e.message : 'Unexpected server error. No provider details were exposed.';
async function readBody(req, limit) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new AppError('Request is too large.', 413); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new AppError('Expected application/json.', 415);
  try { return JSON.parse((await readBody(req, 128 * 1024)).toString()); } catch (e) { if (e instanceof AppError) throw e; throw new AppError('Invalid JSON.'); }
}
export function createApp({ providers = createProviders(), directory = resolve(root, '.data') } = {}) {
  const store = createStore(directory), polling = new Map();
  let uploads = 0;
  async function refresh(job) {
    if (terminal(job.status) || !job.providerId || Date.now() - (job.lastPoll ?? 0) < (job.input.model === 'wan3' ? 15000 : 5000)) return;
    if (polling.has(job.id)) return polling.get(job.id);
    job.lastPoll = Date.now();
    const promise = (async () => {
      try { Object.assign(job, await providers.poll(job), { pollError: null, updatedAt: new Date().toISOString() }); }
      catch (error) { job.pollError = safeMessage(error); }
      finally { store.save(); polling.delete(job.id); }
    })();
    polling.set(job.id, promise); return promise;
  }
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: https:; media-src 'self' blob: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      const hosts = [`127.0.0.1:${req.socket.localPort}`, `localhost:${req.socket.localPort}`];
      if (!hosts.includes(req.headers.host)) throw new AppError('Unrecognized host.', 403);
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new AppError('Cross-origin requests are not allowed.', 403);
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new AppError('Cross-site requests are not allowed.', 403);
      const path = new URL(req.url, `http://${req.headers.host}`).pathname;
      if (req.method === 'GET' && staticFiles.has(path)) {
        const [file, mime] = staticFiles.get(path); res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8` }); return res.end(readFileSync(resolve(root, file)));
      }
      if (req.method === 'GET' && path === '/api/models') return send(200, providers.catalog());
      if (req.method === 'GET' && path === '/api/jobs') return send(200, store.jobs.slice().reverse());
      if (req.method === 'GET' && /^\/api\/jobs\/[a-z0-9-]+$/.test(path)) {
        const job = store.jobs.find(j => j.id === path.split('/').pop()); if (!job) throw new AppError('Job not found.', 404);
        await refresh(job); return send(200, job);
      }
      if (req.method === 'POST' && path === '/api/preview') return send(200, providerPayload(validateInput(await readJson(req))));
      if (req.method === 'POST' && path === '/api/jobs') {
        const input = validateInput(await readJson(req));
        const key = req.headers['idempotency-key'];
        if (!key || !/^[a-f0-9-]{36}$/.test(key)) throw new AppError('A UUID Idempotency-Key is required.');
        const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
        const existing = store.jobs.find(j => j.key === key);
        if (existing) { if (existing.inputHash !== hash) throw new AppError('This request key already belongs to different inputs.', 409); return send(200, existing); }
        if (!providers.catalog().find(m => m.id === input.model)?.configured) throw new AppError('Configure the selected provider in .env and restart.', 503);
        if (store.jobs.filter(j => !terminal(j.status)).length >= 4) throw new AppError('Four jobs are already active. Wait for completion before submitting another.', 429);
        const job = { id: randomUUID(), key, inputHash: hash, input, status: 'submitting', createdAt: new Date().toISOString() };
        store.jobs.push(job); store.save();
        try { job.providerId = await providers.submit(input, key); job.status = 'queued'; }
        catch (error) { job.status = error.definitive ? 'failed' : 'submission_unknown'; job.error = safeMessage(error); }
        store.save(); return send(202, job);
      }
      if (req.method === 'POST' && path === '/api/uploads') {
        if (uploads >= 2) throw new AppError('Two uploads are already running.', 429);
        const mime = req.headers['content-type'];
        const limits = { 'image/jpeg': 10, 'image/png': 10, 'image/webp': 10, 'video/mp4': 100 };
        if (!limits[mime]) throw new AppError('Use JPEG, PNG, WebP or MP4.', 415);
        uploads++;
        try {
          const b = await readBody(req, limits[mime] * 1024 * 1024);
          const valid = mime === 'image/jpeg' ? b[0] === 255 && b[1] === 216 && b[2] === 255 : mime === 'image/png' ? b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime === 'image/webp' ? b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' : b.toString('ascii', 4, 8) === 'ftyp';
          if (!valid) throw new AppError('File contents do not match its media type.');
          return send(201, { url: await providers.upload(b, mime) });
        } finally { uploads--; }
      }
      throw new AppError('Not found.', 404);
    } catch (error) { if (!res.headersSent) send(error instanceof AppError ? error.status : 500, { error: safeMessage(error) }); else res.end(); }
  });
  server.requestTimeout = 120000;
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3210);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  createApp().listen(port, '127.0.0.1', () => console.log(`Motion Transfer Studio · http://127.0.0.1:${port}`));
}
