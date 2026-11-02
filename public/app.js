const $ = id => document.getElementById(id);
let models = [], jobs = [], busy = false, uploadCount = 0, selectedJob = null;
const statusNames = { submitting: 'INVIO', queued: 'IN CODA', running: 'IN CORSO', completed: 'COMPLETATO', failed: 'ERRORE', cancelled: 'ANNULLATO', submission_unknown: 'DA VERIFICARE' };
const terminal = job => ['completed', 'failed', 'cancelled', 'submission_unknown'].includes(job.status);
const current = () => models.find(m => m.id === $('model').value);
function notice(message, error = false) { $('notice').textContent = message; $('notice').className = error ? 'error' : ''; $('notice').hidden = false; }
async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Richiesta non riuscita.');
  return data;
}
function buttonState() { $('generate').disabled = busy || uploadCount > 0 || !current()?.configured; }
function configureModel() {
  const m = current(); if (!m) return;
  $('model-note').textContent = m.note;
  $('connection').textContent = m.configured ? 'COLLEGATO' : 'DA CONFIGURARE';
  $('connection').className = m.configured ? 'badge' : 'badge off';
  $('image-limit').textContent = m.maxImages === 1 ? '1 immagine' : `Fino a ${m.maxImages}`;
  $('duration-limit').textContent = `4–${m.maxDuration || 30} s`;
  $('duration').max = m.maxDuration || 30;
  $('duration').required = m.id === 'wan3';
  $('resolution').replaceChildren(...(m.resolutions.length ? m.resolutions : ['Automatico']).map(r => new Option(r, r)));
  if (m.resolutions.includes('720p')) $('resolution').value = '720p';
  $('resolution').disabled = !m.resolutions.length;
  $('prompt').disabled = !m.prompt;
  $('prompt').placeholder = m.prompt ? 'Descrivi cosa cambiare e cosa mantenere…' : 'Questo modello elabora automaticamente i riferimenti.';
  $('recipe-field').hidden = m.id !== 'wan3';
  document.querySelectorAll('.upload').forEach(el => el.classList.toggle('disabled', !m.upload));
  $('upload-note').textContent = m.upload ? 'Gli upload vengono inviati a fal. MP4 ≤100 MB, immagini ≤10 MB.' : 'Usa URL HTTPS scaricabili dal provider. Le anteprime vengono caricate solo nel tuo browser.';
  buttonState();
}
function input() {
  const m = current();
  return { model: m.id, videoUrl: $('video-url').value.trim(), imageUrls: $('image-urls').value.split('\n').map(s => s.trim()).filter(Boolean), prompt: m.prompt ? $('prompt').value : '', resolution: m.resolutions.length ? $('resolution').value : null, duration: $('duration').value ? Number($('duration').value) : null, recipe: m.id === 'wan3' ? $('recipe').value : 'raw' };
}
function publicPreviewUrl(url) { try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } }
function previewSource(url = $('video-url').value.trim()) {
  const safe = publicPreviewUrl(url);
  $('source-video').hidden = !safe; $('source-empty').hidden = Boolean(safe);
  if (safe && $('source-video').getAttribute('src') !== safe) $('source-video').src = safe;
  if (!safe) $('source-video').removeAttribute('src');
}
function previewImages() {
  $('references-strip').replaceChildren();
  $('image-urls').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0,30).forEach((url, i) => {
    const safe = publicPreviewUrl(url); if (!safe) return;
    const img = document.createElement('img'); img.src = safe; img.alt = `Riferimento ${i+1}`; img.referrerPolicy = 'no-referrer'; img.loading = 'lazy'; $('references-strip').append(img);
  });
}
function selectJob(job) {
  selectedJob = job.id; previewSource(job.input.videoUrl);
  $('result-status').textContent = statusNames[job.status] || job.status;
  const safe = publicPreviewUrl(job.outputUrl);
  $('result-video').hidden = !safe; $('result-empty').hidden = Boolean(safe); $('result-link').hidden = !safe;
  if (safe) { if ($('result-video').getAttribute('src') !== safe) $('result-video').src = safe; $('result-link').href = safe; }
  else { $('result-video').removeAttribute('src'); $('result-link').removeAttribute('href'); }
  if (job.error || job.pollError) notice(job.error || job.pollError, true);
}
function renderJobs() {
  $('job-count').textContent = String(jobs.length).padStart(2, '0');
  if (!jobs.length) return;
  $('jobs').replaceChildren();
  jobs.forEach(job => {
    const button = document.createElement('button'); button.className = 'job'; button.type = 'button';
    const details = document.createElement('div'), title = document.createElement('div'), meta = document.createElement('div'), status = document.createElement('span');
    title.className = 'job-title'; title.textContent = models.find(m => m.id === job.input.model)?.name || job.input.model;
    meta.className = 'job-meta'; meta.textContent = `${new Date(job.createdAt).toLocaleString('it-IT')} · ${job.input.resolution || 'Auto'} · ${job.input.recipe || 'raw'}${job.providerId ? ` · ID ${job.providerId}` : ''}`;
    if (job.error || job.pollError) meta.textContent += ` · ${job.error || job.pollError}`;
    status.className = 'job-status'; status.textContent = statusNames[job.status] || job.status;
    details.append(title,meta); button.append(details,status); button.addEventListener('click',()=>selectJob(job)); $('jobs').append(button);
  });
  const selected = jobs.find(j => j.id === selectedJob); if (selected) selectJob(selected);
}
async function refreshJobs() { jobs = await api('/api/jobs'); renderJobs(); }
function fileDuration(file) {
  return new Promise((resolve,reject) => {
    const v = document.createElement('video'), url = URL.createObjectURL(file);
    const finish = (error) => { clearTimeout(timer); URL.revokeObjectURL(url); v.removeAttribute('src'); error ? reject(error) : resolve(v.duration); };
    const timer = setTimeout(()=>finish(new Error('Impossibile leggere la durata del video.')),10000);
    v.onloadedmetadata = () => { const d=v.duration; if (!Number.isFinite(d) || d<4 || d>30) finish(new Error('Usa una clip da 4 a 30 secondi.')); else { clearTimeout(timer); URL.revokeObjectURL(url); resolve(d); } };
    v.onerror = () => finish(new Error('Formato video non leggibile. Usa MP4.')); v.src=url;
  });
}
async function uploadFiles(files, isVideo) {
  const m = current();
  if (!files.length || !m.upload) return;
  const previous = $('image-urls').value.split('\n').filter(s=>s.trim());
  if (!isVideo && previous.length + files.length > m.maxImages) return notice(`Questo motore accetta al massimo ${m.maxImages} riferimenti.`,true);
  uploadCount++; buttonState();
  try {
    for (const file of files) {
      if (file.size > (isVideo?100:10)*1024*1024) throw new Error('File troppo grande. Video: 100 MB; immagine: 10 MB.');
      const duration = isVideo ? await fileDuration(file) : null;
      notice('Caricamento a fal in corso…');
      const data = await api('/api/uploads',{ method:'POST', headers:{'Content-Type':file.type}, body:file });
      if (isVideo) { $('video-url').value=data.url; $('duration').value=duration.toFixed(2); previewSource(); }
      else { $('image-urls').value = [$('image-urls').value.trim(), data.url].filter(Boolean).join('\n'); previewImages(); }
    }
    notice('Caricamento completato. Il file è pronto per la generazione.');
  } catch(error) { notice(error.message,true); }
  finally { uploadCount--; buttonState(); }
}
$('model').addEventListener('change',configureModel);
$('video-url').addEventListener('change',()=>{ $('duration').value=''; previewSource(); });
$('source-video').addEventListener('loadedmetadata',()=>{ $('source-meta').textContent = `${$('source-video').videoWidth}×${$('source-video').videoHeight} · ${$('source-video').duration.toFixed(1)}s`; if (!selectedJob && Number.isFinite($('source-video').duration)) $('duration').value=$('source-video').duration.toFixed(2); });
$('image-urls').addEventListener('change',previewImages);
$('video-file').addEventListener('change',e=>{ uploadFiles([...e.target.files],true); e.target.value=''; });
$('image-files').addEventListener('change',e=>{ uploadFiles([...e.target.files],false); e.target.value=''; });
$('setup-button').addEventListener('click',()=>$('setup-dialog').showModal());
document.querySelectorAll('dialog .close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('preview-button').addEventListener('click',async()=>{ try { const data = await api('/api/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input())}); $('payload').textContent=JSON.stringify(data,null,2); $('payload-dialog').showModal(); } catch(error){ notice(error.message,true); } });
$('refresh').addEventListener('click',()=>refreshJobs().catch(e=>notice(e.message,true)));
$('generation-form').addEventListener('submit',async event=>{
  event.preventDefault(); if(busy || uploadCount) return;
  busy=true; buttonState();
  const body = JSON.stringify(input());
  // Preserve the same key after a lost HTTP response, including a page reload.
  const fingerprint = body;
  let key;
  try { const pending=JSON.parse(sessionStorage.getItem('pending-submission') || 'null'); key=pending?.fingerprint===fingerprint?pending.key:crypto.randomUUID(); sessionStorage.setItem('pending-submission',JSON.stringify({key,fingerprint})); }
  catch { notice('Le sessioni browser sono disabilitate. Abilitale per evitare invii duplicati.',true); busy=false; buttonState(); return; }
  try {
    const job=await api('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body});
    sessionStorage.removeItem('pending-submission'); selectedJob=job.id;
    notice(job.status==='queued'?'Richiesta accettata. Puoi seguirla nello storico.':job.error || 'Controlla lo stato della richiesta.',job.status!=='queued');
    await refreshJobs();
  } catch(error){ notice(`${error.message} Se l’invio è stato interrotto, riprova con gli stessi campi: verrà riutilizzato lo stesso identificatore.`,true); }
  finally{busy=false;buttonState();}
});
async function pollLoop() {
  try {
    for (const job of jobs.filter(j=>!terminal(j))) {
      const updated = await api(`/api/jobs/${job.id}`); const index=jobs.findIndex(j=>j.id===updated.id); if(index>=0) jobs[index]=updated;
    }
    if(jobs.some(j=>!terminal(j)) || selectedJob) renderJobs();
  } catch(error) { notice(`Aggiornamento interrotto: ${error.message} Le richieste non vengono reinviate.`,true); }
  finally { setTimeout(pollLoop,5500); }
}
try { models=await api('/api/models'); $('model').replaceChildren(...models.map(m=>new Option(m.name,m.id))); configureModel(); await refreshJobs(); pollLoop(); }
catch(error){ notice(error.message,true); }
