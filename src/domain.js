import { isIP } from 'node:net';

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const models = [
  { id: 'wan3', name: 'Wan 3.0 · Harness sperimentale', vendor: 'alibaba', maxImages: 10, maxDuration: 15, resolutions: ['480p', '720p', '1080p'], prompt: true, note: 'API Alibaba diretta. Confronta un prompt semplice con un harness esplicito. Equivalenza con Genjutsu da verificare.' },
  { id: 'wan-move', name: 'Wan Animate · Move', vendor: 'fal', endpoint: 'fal-ai/wan/v2.2-14b/animate/move', maxImages: 1, resolutions: ['480p', '580p', '720p'], prompt: false, note: 'Anima un personaggio da un video di movimento. Modello a pesi aperti, inferenza su fal a pagamento.' },
  { id: 'kling', name: 'Kling 2.6 · Motion Control', vendor: 'fal', endpoint: 'fal-ai/kling-video/v2.6/pro/motion-control', maxImages: 1, resolutions: [], prompt: true, note: 'Trasferisce la performance di un personaggio. Orientamento dal video, fino a 30 secondi. Risoluzione gestita dal provider.' },
  { id: 'wan-replace', name: 'Wan Animate · Replace', vendor: 'fal', endpoint: 'fal-ai/wan/v2.2-14b/animate/replace', maxImages: 1, resolutions: ['480p', '580p', '720p'], prompt: false, note: 'Sostituisce un personaggio mantenendo l’ambiente originale. Supporta una singola immagine di riferimento.' },
  { id: 'genjutsu', name: 'Genjutsu · Motion Transfer', vendor: 'higgsfield', endpoint: 'higgsfield/genjutsu/motion-transfer/v1.0', maxImages: 8, resolutions: ['480p', '720p', '1080p'], prompt: true, note: 'API ufficiale Higgsfield con crediti del tuo account. Usa il servizio originale, senza copiarne il modello.' },
  { id: 'custom', name: 'Il tuo endpoint', vendor: 'custom', maxImages: 30, resolutions: ['480p', '720p', '1080p'], prompt: true, note: 'Collega un servizio tuo usando il contratto API documentato.' }
];
export function publicMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 2083) throw new AppError('Enter a valid public HTTPS media URL.');
  let u; try { u = new URL(value); } catch { throw new AppError('Enter a valid public HTTPS media URL.'); }
  const h = u.hostname.toLowerCase();
  // Hostnames only; providers fetch the URLs. This server never fetches user media URLs.
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || (u.port && u.port !== '443') || isIP(h) || h.includes(':') || !h.includes('.') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(h)) throw new AppError('Use a public HTTPS URL without credentials or a local address.');
  return u.href;
}
export function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Expected a JSON object.');
  const model = models.find(m => m.id === input.model);
  if (!model) throw new AppError('Choose a supported model.');
  const videoUrl = publicMediaUrl(input.videoUrl);
  if (!Array.isArray(input.imageUrls) || input.imageUrls.length < 1 || input.imageUrls.length > model.maxImages) throw new AppError(`This model needs 1–${model.maxImages} image reference(s).`);
  const imageUrls = input.imageUrls.map(publicMediaUrl);
  const prompt = input.prompt ?? '';
  if (typeof prompt !== 'string' || prompt.length > 10000) throw new AppError('Prompt must be at most 10,000 characters.');
  if (!model.prompt && prompt.trim()) throw new AppError('This model generates its own prompt. Clear the prompt or choose another model.');
  const resolution = model.resolutions.length ? (input.resolution ?? model.resolutions[0]) : null;
  if (resolution && !model.resolutions.includes(resolution)) throw new AppError('Unsupported resolution for this model.');
  if (input.duration != null && (typeof input.duration !== 'number' || !Number.isFinite(input.duration) || input.duration < 4 || input.duration > 30)) throw new AppError('Use a source video between 4 and 30 seconds.');
  if (model.id === 'wan3' && (input.duration == null || input.duration > 15)) throw new AppError('Wan 3.0 reference inputs are limited to 15 seconds. Enter the source duration.');
  const recipe = input.recipe ?? 'raw';
  if (!['raw', 'motion-transfer', 'character-replace'].includes(recipe)) throw new AppError('Unknown prompt recipe.');
  if (recipe !== 'raw' && model.id !== 'wan3') throw new AppError('Prompt recipes are only available for Wan 3.0.');
  if (model.id === 'wan3' && recipe === 'raw' && !prompt.trim()) throw new AppError('Add a prompt for the raw Wan 3.0 baseline.');
  return { recipe, model: model.id, videoUrl, imageUrls, prompt: prompt.trim(), resolution, duration: input.duration ?? null };
}
export function compilePrompt(input) {
  if (input.recipe === 'raw' || input.model !== 'wan3') return input.prompt;
  const shared = 'Edit Video 1. Preserve the source sequence of actions, their timing, body poses, interactions, camera trajectory, framing and shot boundaries. Keep motion continuous. Do not add cuts, slow motion, new gestures or new actions.';
  const instruction = input.recipe === 'character-replace'
    ? 'Replace the main character using Image 1 as the identity and wardrobe reference. Preserve the source environment and other subjects. Match contact, occlusions, shadows and lighting.'
    : 'Recast the main character and visual appearance using Image 1. Use the video as the motion and camera reference, not as the identity reference. Keep the new identity and wardrobe consistent throughout.';
  return [shared, instruction, input.prompt && `Additional direction: ${input.prompt}`].filter(Boolean).join('\n\n');
}
export function providerPayload(input) {
  if (input.model === 'wan3') return { model: 'wan3.0-video', input: { prompt: compilePrompt(input), media: [{ type: 'reference_video', url: input.videoUrl }, ...input.imageUrls.map(url => ({ type: 'reference_image', url }))] }, parameters: { resolution: input.resolution.toUpperCase(), ratio: 'adaptive', duration: -1, prompt_extend: false, audio: true } };
  if (input.model === 'genjutsu') return { video_url: input.videoUrl, image_urls: input.imageUrls, prompt: input.prompt, resolution: input.resolution };
  if (input.model === 'custom') return input;
  const payload = { video_url: input.videoUrl, image_url: input.imageUrls[0] };
  if (input.model === 'kling') Object.assign(payload, { prompt: input.prompt, character_orientation: 'video', keep_original_sound: true });
  else payload.resolution = input.resolution;
  return payload;
}
export const terminal = status => ['completed', 'failed', 'cancelled', 'submission_unknown'].includes(status);
