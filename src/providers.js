import { createFalClient } from '@fal-ai/client';
import { AppError, models, providerPayload, publicMediaUrl } from './domain.js';

export function createProviders(env = process.env, fetcher = fetch) {
  const fal = env.FAL_KEY ? createFalClient({ credentials: env.FAL_KEY }) : null;
  let custom;
  if (env.CUSTOM_API_URL) {
    custom = new URL(env.CUSTOM_API_URL);
    if (custom.username || custom.password || custom.search || custom.hash || (custom.protocol !== 'https:' && !(custom.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(custom.hostname)))) throw new Error('CUSTOM_API_URL must be HTTPS, or HTTP on localhost, without credentials/query/fragment.');
  }
  let alibaba;
  if (env.ALIBABA_API_BASE) {
    alibaba = new URL(env.ALIBABA_API_BASE);
    if (alibaba.protocol !== 'https:' || !/^[a-zA-Z0-9-]+\.(cn-beijing|ap-southeast-1|ap-northeast-1|eu-central-1|us-east-1|cn-hongkong)\.maas\.aliyuncs\.com$/.test(alibaba.hostname) || alibaba.username || alibaba.password || alibaba.port || alibaba.search || alibaba.hash || alibaba.pathname !== '/') throw new Error('ALIBABA_API_BASE must be your workspace regional HTTPS origin from the Alibaba documentation.');
  }
  const configured = vendor => vendor === 'alibaba' ? Boolean(alibaba && env.DASHSCOPE_API_KEY) : vendor === 'fal' ? Boolean(fal) : vendor === 'higgsfield' ? Boolean(env.HF_CREDENTIALS) : Boolean(custom);
  const headers = vendor => ({ 'Content-Type': 'application/json', ...(vendor === 'alibaba' ? { Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, 'X-DashScope-Async': 'enable' } : vendor === 'fal' ? { Authorization: `Key ${env.FAL_KEY}` } : vendor === 'higgsfield' ? { Authorization: `Key ${env.HF_CREDENTIALS}` } : env.CUSTOM_API_KEY ? { Authorization: `Bearer ${env.CUSTOM_API_KEY}` } : {}) });
  async function json(url, vendor, method = 'GET', body, idempotencyKey) {
    let response;
    try {
      response = await fetcher(url, { method, headers: { ...headers(vendor), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(30000) });
    } catch { throw new AppError('Provider connection interrupted. Check the provider dashboard before resubmitting.', 502); }
    if (!response.ok) {
      // Do not expose response bodies: they can echo credentials, prompts or signed URLs.
      const err = new AppError(`Provider returned HTTP ${response.status}. Check credentials, credit balance and inputs in the provider dashboard.`, 502);
      err.definitive = [400, 401, 402, 403, 404, 413, 422, 429].includes(response.status);
      throw err;
    }
    try { return await response.json(); } catch { throw new AppError('Provider returned an unreadable response. Check the provider dashboard.', 502); }
  }
  function modelFor(id) { const m = models.find(m => m.id === id); if (!m || !configured(m.vendor)) throw new AppError('Configure this provider in your local .env file and restart the server.', 503); return m; }
  function customUrl(path) { return `${custom.href.replace(/\/$/, '')}/${path}`; }
  function base(m) { return m.vendor === 'fal' ? `https://queue.fal.run/${m.endpoint}` : `https://api.higgsfield.ai/${m.endpoint}`; }
  function requestId(value) { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(value)) throw new AppError('Provider did not return a valid request ID. Check its dashboard before resubmitting.', 502); return value; }
  return {
    catalog: () => models.map(({ endpoint, ...m }) => ({ ...m, configured: configured(m.vendor), upload: m.vendor === 'fal' && Boolean(fal) })),
    async upload(buffer, mime) {
      if (!fal) throw new AppError('File upload requires FAL_KEY. Other providers accept your own hosted HTTPS URLs.', 503);
      try { return publicMediaUrl(await fal.storage.upload(new File([buffer], 'input', { type: mime }))); }
      catch { throw new AppError('Upload to fal failed. Check your provider account and file.', 502); }
    },
    async submit(input, key) {
      const m = modelFor(input.model);
      const result = await json(m.vendor === 'alibaba' ? `${alibaba.origin}/api/v1/services/aigc/video-generation/video-synthesis` : m.vendor === 'custom' ? customUrl('jobs') : base(m), m.vendor, 'POST', providerPayload(input), m.vendor === 'custom' ? key : undefined);
      return requestId(m.vendor === 'alibaba' ? result.output?.task_id : result.request_id ?? result.id);
    },
    async poll(job) {
      const m = modelFor(job.input.model), id = encodeURIComponent(requestId(job.providerId));
      let result;
      if (m.vendor === 'alibaba') {
        result = await json(`${alibaba.origin}/api/v1/tasks/${id}`, m.vendor);
        const status = result.output?.task_status;
        if (status === 'PENDING') return { status: 'queued' };
        if (status === 'RUNNING') return { status: 'running' };
        if (['FAILED', 'CANCELED', 'UNKNOWN'].includes(status)) return { status: 'failed', error: 'Alibaba task failed, was cancelled or expired. Check the provider dashboard.' };
        if (status !== 'SUCCEEDED') throw new AppError('Unrecognized provider status.', 502);
        result = { video: { url: result.output?.video_url } };
      } else if (m.vendor === 'fal') {
        // fal queue lifecycle routes use the owner/model prefix, not the full subpath.
        const queue = `https://queue.fal.run/${m.endpoint.split('/').slice(0, 2).join('/')}/requests/${id}`;
        const status = await json(`${queue}/status`, m.vendor);
        if (status.status === 'IN_QUEUE') return { status: 'queued' };
        if (status.status === 'IN_PROGRESS') return { status: 'running' };
        if (status.status !== 'COMPLETED') throw new AppError('Unrecognized provider status.', 502);
        try { result = await json(queue, m.vendor); }
        catch (error) { if (error.definitive) return { status: 'failed', error: error.message }; throw error; }
      } else {
        result = await json(m.vendor === 'custom' ? customUrl(`jobs/${id}`) : `https://api.higgsfield.ai/requests/${id}/status`, m.vendor);
        const status = String(result.status).toLowerCase();
        if (['queued', 'pending', 'submitted'].includes(status)) return { status: 'queued' };
        if (['in_progress', 'running', 'processing'].includes(status)) return { status: 'running' };
        if (['failed', 'error', 'nsfw', 'cancelled', 'canceled'].includes(status)) return { status: status.startsWith('cancel') ? 'cancelled' : 'failed', error: 'Provider could not complete this request. See its dashboard for details.' };
        if (!['completed', 'succeeded'].includes(status)) throw new AppError('Unrecognized provider status.', 502);
      }
      const url = result.video?.url ?? result.output?.video?.url;
      if (!url) return { status: 'failed', error: 'Provider completed without a video URL. See its dashboard.' };
      return { status: 'completed', outputUrl: publicMediaUrl(url) };
    }
  };
}
