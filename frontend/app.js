'use strict';

const POLL_MS = 1500;
const API_BASE = ((window.DOODLE_CONFIG && window.DOODLE_CONFIG.apiBaseUrl) || '').replace(/\/+$/, '');
const $ = (id) => document.getElementById(id);

const form = $('form');
const photo = $('photo');
const preview = $('preview');

photo.addEventListener('change', () => {
  const file = photo.files[0];
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  $('captureLabel').hidden = true;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = photo.files[0];
  if (!file) return showError('Take a photo of your drawing first.');

  const body = new FormData();
  body.append('image', file);
  body.append('mode', form.elements.mode.value);
  const prompt = $('prompt').value.trim();
  if (prompt) body.append('prompt', prompt);

  setBusy(true, 'Uploading…');
  try {
    const res = await fetch(`${API_BASE}/api/jobs`, { method: 'POST', body });
    if (!res.ok) throw new Error(await errorText(res));
    const job = await res.json();
    await poll(job.id);
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    setBusy(false);
  }
});

$('again').addEventListener('click', () => {
  form.reset();
  preview.hidden = true;
  $('captureLabel').hidden = false;
  $('result').hidden = true;
  $('error').hidden = true;
  $('flow').hidden = true;
  form.hidden = false;
});

async function poll(jobId) {
  for (;;) {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    if (!res.ok) throw new Error(await errorText(res));
    const job = await res.json();
    renderFlow(job);
    if (job.status === 'done') return showResult(job);
    if (job.status === 'failed') throw new Error(job.error || 'Animation failed.');
    $('statusText').textContent = job.step || 'Working…';
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

function showResult(job) {
  const media = $('media');
  media.replaceChildren();
  const outputUrl = API_BASE + job.output_url;
  const isVideo = /\.(mp4|webm|mov)$/i.test(outputUrl);
  const el = document.createElement(isVideo ? 'video' : 'img');
  el.src = outputUrl;
  if (isVideo) Object.assign(el, { autoplay: true, loop: true, muted: true, playsInline: true, controls: true });
  else el.alt = job.subject || 'Your animated drawing';
  media.append(el);

  $('warning').hidden = !job.warning;
  $('warning').textContent = job.warning || '';
  $('meta').textContent = [job.subject, job.animator && `made with ${job.animator}`].filter(Boolean).join(' · ');
  $('download').href = outputUrl;
  form.hidden = true;
  $('result').hidden = false;
}

function setBusy(busy, text) {
  $('submit').disabled = busy;
  $('status').hidden = !busy;
  if (text) $('statusText').textContent = text;
  if (busy) $('error').hidden = true;
}

function showError(message) {
  $('error').textContent = message;
  $('error').hidden = false;
}

async function errorText(res) {
  try {
    const data = await res.json();
    return data.detail || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

// ---- "How it was made": the job's pipeline as a flow chart, updated on every poll ----

const PIPELINE = [
  ['📷', 'Clean up photo'],
  ['🧠', 'Understand the drawing'],
  ['🔀', 'Pick the animator'],
  ['🎬', 'Animate'],
  ['✅', 'Ready'],
];

function renderFlow(job) {
  const steps = job.steps || [];
  const seen = new Set(steps.map((s) => s.title.replace(/^Fallback: a/, 'A')));
  // Stages that have not started yet are shown greyed out, so you can see what comes next.
  const pending = job.status === 'failed' ? [] : PIPELINE
    .filter(([, title]) => !seen.has(title))
    .map(([icon, title]) => ({ icon, title, status: 'pending', model: '', outputs: {}, notes: [] }));

  const list = $('flowSteps');
  list.replaceChildren(...[...steps, ...pending].map(flowStep));
  $('flow').hidden = steps.length === 0;
}

function flowStep(step) {
  const item = document.createElement('li');
  item.className = `flow-step ${step.status}`;
  const card = document.createElement('div');
  card.className = 'flow-card';

  const head = document.createElement('div');
  head.className = 'flow-head';
  const title = document.createElement('strong');
  title.textContent = `${step.icon} ${step.title}`;
  head.append(title);
  if (step.model) {
    const model = document.createElement('span');
    model.className = 'flow-model';
    model.textContent = step.model;
    head.append(model);
  }
  const time = document.createElement('span');
  time.className = 'flow-time';
  time.textContent = step.status === 'running' ? 'working…'
    : step.duration_ms != null ? `${(step.duration_ms / 1000).toFixed(1)} s` : '';
  head.append(time);
  card.append(head);

  const outputs = Object.entries(step.outputs || {});
  if (outputs.length) {
    const dl = document.createElement('dl');
    dl.className = 'flow-outputs';
    for (const [key, value] of outputs) {
      const dt = document.createElement('dt');
      dt.textContent = key;
      const dd = document.createElement('dd');
      dd.textContent = value;
      dl.append(dt, dd);
    }
    card.append(dl);
  }
  if (step.notes && step.notes.length) {
    const notes = document.createElement('ul');
    notes.className = 'flow-notes';
    for (const text of step.notes) {
      const li = document.createElement('li');
      li.textContent = text;
      notes.append(li);
    }
    card.append(notes);
  }
  item.append(card);
  return item;
}

// ---- Team admin panel (page URL + #admin): Hugging Face key status and switching ----

const PIN_KEY = 'doodleAdminPin';

function initAdmin() {
  window.addEventListener('hashchange', () => { if (location.hash === '#admin') location.reload(); });
  if (location.hash !== '#admin') return;
  $('admin').hidden = false;
  const saved = readPin();
  if (saved) {
    $('adminPin').value = saved;
    loadKeys();
  }
  $('adminLogin').addEventListener('submit', (event) => {
    event.preventDefault();
    loadKeys();
  });
  $('adminRefresh').addEventListener('click', () => loadKeys());
}

async function loadKeys() {
  if (await adminCall('GET', '/api/admin/hf-keys', null, (data) => renderKeys(data.keys))) {
    await adminCall('GET', '/api/admin/gpu-servers', null, (data) => renderServers(data.servers));
  }
}

async function useKey(name) {
  await adminCall('POST', '/api/admin/hf-keys/active', { name }, (data) => renderKeys(data.keys));
}

async function saveServer(name, url) {
  await adminCall('POST', '/api/admin/gpu-servers', { name, url }, (data) => renderServers(data.servers));
}

// Returns true on success; `render` gets the JSON body.
async function adminCall(method, path, payload, render) {
  const pin = $('adminPin').value;
  $('adminError').hidden = true;
  $('adminStatus').hidden = false;
  $('adminStatus').textContent = 'Loading…';
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'X-Admin-Pin': pin, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) throw new Error(await errorText(res));
    savePin(pin);
    render(await res.json());
    $('adminStatus').textContent = `Updated ${new Date().toLocaleTimeString()}`;
    return true;
  } catch (err) {
    $('adminStatus').hidden = true;
    $('adminError').textContent = err.message || String(err);
    $('adminError').hidden = false;
    return false;
  }
}

function renderServers(servers) {
  const list = $('adminServers');
  list.replaceChildren();
  for (const server of servers) {
    const item = document.createElement('li');
    item.className = 'admin-server';
    item.classList.toggle('active', Boolean(server.url && server.last_ok_at));
    const label = document.createElement('div');
    label.textContent = server.name;
    const detail = document.createElement('small');
    detail.textContent = !server.url ? 'Off (no link)'
      : server.last_error ? `Failed at ${new Date(server.last_error_at).toLocaleTimeString()}: ${server.last_error}`
      : server.last_ok_at ? `Last worked ${new Date(server.last_ok_at).toLocaleTimeString()}` : 'Ready, not used yet';
    label.append(detail);

    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'url';
    input.placeholder = 'https://….gradio.live';
    input.value = server.url;
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Save';
    form.append(input, button);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveServer(server.name, input.value.trim());
    });
    item.append(label, form);
    list.append(item);
  }
  $('adminServersBox').hidden = false;
}

function renderKeys(keys) {
  const list = $('adminKeys');
  list.replaceChildren();
  if (!keys.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No keys configured. Set HF_TOKENS in backend/.env and redeploy.';
    list.append(empty);
  }
  for (const key of keys) {
    const item = document.createElement('li');
    item.classList.toggle('active', key.active);
    const label = document.createElement('div');
    label.textContent = key.name + (key.active ? ' · in use' : '');
    const detail = document.createElement('small');
    detail.textContent = key.quota_hit_at
      ? `Out of quota at ${new Date(key.quota_hit_at).toLocaleTimeString()}`
      : key.last_ok_at ? `Last worked ${new Date(key.last_ok_at).toLocaleTimeString()}` : 'Not used yet';
    label.append(detail);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Use';
    button.disabled = key.active;
    button.addEventListener('click', () => useKey(key.name));
    item.append(label, button);
    list.append(item);
  }
  $('adminRefresh').hidden = false;
}

// sessionStorage can throw in private mode; the PIN is then just not remembered.
function readPin() {
  try { return sessionStorage.getItem(PIN_KEY) || ''; } catch { return ''; }
}

function savePin(pin) {
  try { sessionStorage.setItem(PIN_KEY, pin); } catch { /* not remembered */ }
}

initAdmin();
