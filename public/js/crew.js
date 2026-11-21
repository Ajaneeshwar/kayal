import { api, esc, entryCard } from './common.js';

const MAX_SECONDS = 25;
const PHOTO_MAX_SIDE = 1280;
const STATUS = {
  recording: 'നിർത്താൻ വീണ്ടും ടാപ്പ് ചെയ്യുക · Tap again to stop',
  busy: 'കാത്തിരിക്കുക · Working',
};

const $ = (id) => document.getElementById(id);
const boatId = new URLSearchParams(location.search).get('boat');
const mic = $('mic');
const player = $('player');

let position = null;
let photoBase64 = null;
let recorder = null;
let chunks = [];
let stopTimer = null;
let tick = null;

// A tenth of a second of silence. Playing it inside the tap lets the reply
// play later without a second tap, which phones otherwise block.
function silentWav() {
  const rate = 8000;
  const samples = rate / 10;
  const view = new DataView(new ArrayBuffer(44 + samples));
  const ascii = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i += 1) view.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
}
const SILENCE = silentWav();

function setState(state, message) {
  mic.dataset.state = state;
  mic.setAttribute('aria-label', state === 'recording' ? 'Stop recording' : 'Start recording');
  $('mic-status').textContent = message ?? STATUS[state] ?? 'Ready';
  $('mic-status').classList.remove('error');
}

function showError(message) {
  setState('idle', message);
  $('mic-status').classList.add('error');
}

function watchLocation() {
  const chip = $('gps');
  if (!navigator.geolocation) {
    chip.textContent = 'Location not available';
    chip.className = 'chip warn';
    return;
  }
  navigator.geolocation.watchPosition(
    ({ coords }) => {
      position = { lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy };
      chip.textContent = `Location ready (±${Math.round(coords.accuracy)} m)`;
      chip.className = 'chip ok';
    },
    () => {
      position = null;
      chip.textContent = 'Location is off';
      chip.className = 'chip warn';
    },
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
  );
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

async function playReply(replyId) {
  try {
    const { audioBase64, mime } = await api('/api/speak', { replyId });
    player.src = `data:${mime};base64,${audioBase64}`;
    await player.play();
  } catch {
    // The text reply is on screen and the Play button stays available.
  }
}

function renderResult(result) {
  const { reply, heard } = result;
  const english = reply.local !== reply.english ? `<p class="muted">${esc(reply.english)}</p>` : '';
  const heardBlock = result.stored ? '' : `
    <p class="entry-heard" lang="${esc(heard.language)}">${esc(heard.original)}</p>
    ${heard.original !== heard.english ? `<p class="small muted">${esc(heard.english)}</p>` : ''}`;
  $('result').innerHTML = `
    <div class="card">
      <div class="reply">
        <p class="reply-local" lang="${esc(reply.language)}">${esc(reply.local)}</p>
        ${english}
        <button id="replay" class="btn small ghost" type="button">Play reply</button>
      </div>
      ${result.stored ? entryCard(result.entry) : heardBlock}
    </div>`;
  $('result').hidden = false;
  $('replay').addEventListener('click', () => playReply(reply.id));
}

async function loadHistory(shownId) {
  const { boat, entries } = await api(`/api/boats/${encodeURIComponent(boatId)}`);
  const earlier = entries.filter((e) => e.id !== shownId);
  $('boat-name').textContent = `${boat.name} · ${boat.registration}`;
  $('history-list').innerHTML = earlier.length
    ? earlier.slice(0, 5).map((e) => entryCard(e)).join('')
    : '<p class="muted">Nothing else logged yet.</p>';
  $('history').hidden = false;
}

async function send(payload) {
  setState('busy');
  try {
    const result = await api('/api/log', { boatId, ...position, photoBase64, ...payload });
    renderResult(result);
    playReply(result.reply.id);
    if (result.stored) {
      photoBase64 = null;
      $('photo').value = '';
      $('photo-label').textContent = 'Add receipt photo';
      loadHistory(result.entry.id).catch(() => {});
    }
    setState('idle');
  } catch (err) {
    showError(err.message);
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showError('The microphone needs a secure (https) page. Use "Type instead".');
    return;
  }
  player.src = SILENCE;
  player.play().catch(() => {});

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showError('Microphone permission was refused.');
    return;
  }
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    .find((type) => MediaRecorder.isTypeSupported(type));
  recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  chunks = [];
  recorder.addEventListener('dataavailable', (event) => event.data.size && chunks.push(event.data));
  recorder.addEventListener('stop', async () => {
    clearTimeout(stopTimer);
    clearInterval(tick);
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType });
    recorder = null;
    await send({ audioBase64: await toBase64(blob), audioMime: blob.type });
  });
  recorder.start();

  const started = Date.now();
  setState('recording');
  tick = setInterval(() => {
    const left = MAX_SECONDS - Math.floor((Date.now() - started) / 1000);
    $('mic-status').textContent = `${STATUS.recording} (${left} s)`;
  }, 1000);
  stopTimer = setTimeout(() => recorder?.stop(), MAX_SECONDS * 1000);
}

mic.addEventListener('click', () => {
  if (mic.dataset.state === 'busy') return;
  if (recorder) recorder.stop();
  else startRecording();
});

$('photo').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    photoBase64 = await shrinkPhoto(file);
    $('photo-label').textContent = 'Photo added. Tap to change';
  } catch {
    photoBase64 = null;
    $('photo-label').textContent = 'Could not read that photo';
  }
});

$('typed-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('typed').value.trim();
  if (!text || mic.dataset.state !== 'idle') return;
  $('typed').value = '';
  send({ text });
});

async function init() {
  if (!boatId) {
    const { boats } = await api('/api/state');
    $('picker-list').innerHTML = boats
      .map((b) => `<a class="entry" href="/crew?boat=${encodeURIComponent(b.id)}"><strong>${esc(b.name)}</strong><span class="small muted">${esc(b.registration)}</span></a>`)
      .join('');
    $('picker').hidden = false;
    return;
  }
  try {
    await loadHistory();
  } catch (err) {
    $('picker-list').innerHTML = `<p class="error">${esc(err.message)}</p>`;
    $('picker').hidden = false;
    return;
  }
  $('recorder').hidden = false;
  watchLocation();
}

init();
