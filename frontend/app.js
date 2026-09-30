'use strict';

const POLL_MS = 1500;
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
    const res = await fetch('/api/jobs', { method: 'POST', body });
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
  form.hidden = false;
});

async function poll(jobId) {
  for (;;) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) throw new Error(await errorText(res));
    const job = await res.json();
    if (job.status === 'done') return showResult(job);
    if (job.status === 'failed') throw new Error(job.error || 'Animation failed.');
    $('statusText').textContent = job.step || 'Working…';
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

function showResult(job) {
  const media = $('media');
  media.replaceChildren();
  const isVideo = /\.(mp4|webm|mov)$/i.test(job.output_url);
  const el = document.createElement(isVideo ? 'video' : 'img');
  el.src = job.output_url;
  if (isVideo) Object.assign(el, { autoplay: true, loop: true, muted: true, playsInline: true, controls: true });
  else el.alt = job.subject || 'Your animated drawing';
  media.append(el);

  $('warning').hidden = !job.warning;
  $('warning').textContent = job.warning || '';
  $('meta').textContent = [job.subject, job.animator && `made with ${job.animator}`].filter(Boolean).join(' · ');
  $('download').href = job.output_url;
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
