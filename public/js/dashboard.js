import { api, esc, entryCard, badge, days, KIND_LABELS, LEVELS, STATES } from './common.js';

/* global L, qrcode */
const $ = (id) => document.getElementById(id);
const URGENCY = { overdue: 0, declared: 1, verified: 2 };
const WASTE_LABELS = { sewage: 'Sewage', solid: 'Solid waste', oil: 'Used oil' };
const TONE_COLOURS = { ok: '#18794a', warn: '#c98500', bad: '#b3322a' };

const map = L.map('map').setView([9.53, 76.4], 11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);
const layer = L.layerGroup().addTo(map);
let fitted = false;
let boats = [];

const pin = () => $('pin').value || undefined;

function renderMetrics(state) {
  const count = (name) => state.boats.filter((b) => b.status.state === name).length;
  const chain = state.chain.ok
    ? `<b>${state.chain.count}</b>entries, chain intact`
    : `<b>Broken</b>chain fails at entry ${state.chain.brokenAt + 1}`;
  $('metrics').innerHTML = `
    <div class="metric"><b>${state.boats.length}</b>boats registered</div>
    <div class="metric ok"><b>${count('verified')}</b>verified pump-out</div>
    <div class="metric warn"><b>${count('declared')}</b>self-declared only</div>
    <div class="metric bad"><b>${count('overdue')}</b>overdue (${state.overdueDays} days)</div>
    <div class="metric ${state.chain.ok ? '' : 'bad'}">${chain}</div>`;
}

function renderBoats(state) {
  boats = [...state.boats].sort((a, b) =>
    URGENCY[a.status.state] - URGENCY[b.status.state]
    || (b.status.lastSewage?.daysAgo ?? Infinity) - (a.status.lastSewage?.daysAgo ?? Infinity));
  $('boats').innerHTML = boats.map((boat) => {
    const status = STATES[boat.status.state];
    const last = boat.status.lastSewage;
    return `<tr>
      <td><a href="/boat/${encodeURIComponent(boat.id)}">${esc(boat.name)}</a><br><span class="small muted">${esc(boat.registration)}</span></td>
      <td>${badge(status.tone, status.label)}</td>
      <td>${last ? esc(days(last.daysAgo)) : 'Never'}</td>
      <td><button class="btn small ghost" type="button" data-qr="${esc(boat.id)}">QR</button></td>
    </tr>`;
  }).join('');
}

function renderFacilities(state) {
  $('facilities').innerHTML = state.facilities.map((f) => `<tr>
    <td>${esc(f.name)}${f.operator ? `<br><span class="small muted">${esc(f.operator)}</span>` : ''}</td>
    <td>${esc(f.accepts.map((a) => WASTE_LABELS[a]).join(', '))}</td>
    <td>${badge(f.open ? 'ok' : 'bad', f.open ? 'Open' : 'Closed')}</td>
    <td><button class="btn small ghost" type="button" data-facility="${esc(f.id)}" data-open="${!f.open}">${f.open ? 'Mark closed' : 'Mark open'}</button></td>
  </tr>`).join('');
}

function renderMap(state) {
  layer.clearLayers();
  const names = new Map(state.boats.map((b) => [b.id, b.name]));
  for (const f of state.facilities) {
    const colour = f.open ? TONE_COLOURS.ok : '#7b8b8f';
    L.circle([f.lat, f.lon], { radius: f.radiusM, color: colour, weight: 1, fillOpacity: 0.12 }).addTo(layer);
    L.circleMarker([f.lat, f.lon], { radius: 9, color: '#fff', weight: 2, fillColor: colour, fillOpacity: 1 })
      .bindPopup(`<strong>${esc(f.name)}</strong><br>${f.open ? 'Open' : 'Closed'} · ${esc(f.accepts.map((a) => WASTE_LABELS[a]).join(', '))}${f.note ? `<br>${esc(f.note)}` : ''}`)
      .addTo(layer);
  }
  for (const e of state.entries) {
    if (!e.location) continue;
    const level = LEVELS[e.verification.level];
    L.circleMarker([e.location.lat, e.location.lon], { radius: 5, color: '#fff', weight: 1, fillColor: TONE_COLOURS[level.tone], fillOpacity: 0.95 })
      .bindPopup(`<strong>${esc(names.get(e.boatId) ?? 'Unknown boat')}</strong><br>${esc(KIND_LABELS[e.kind])}<br>${esc(level.label)}`)
      .addTo(layer);
  }
  if (!fitted && state.facilities.length) {
    map.fitBounds(L.latLngBounds(state.facilities.map((f) => [f.lat, f.lon])).pad(0.25));
    fitted = true;
  }
}

async function refresh() {
  try {
    const state = await api('/api/state');
    const names = new Map(state.boats.map((b) => [b.id, b.name]));
    renderMetrics(state);
    renderBoats(state);
    renderFacilities(state);
    renderMap(state);
    $('feed').innerHTML = state.entries.map((e) => entryCard(e, names.get(e.boatId))).join('')
      || '<p class="muted">Nothing logged yet.</p>';
    $('pin-row').hidden = !state.adminPinRequired;
    $('error').hidden = true;
  } catch (err) {
    $('error').textContent = err.message;
    $('error').hidden = false;
  }
}

async function admin(action) {
  $('form-error').hidden = true;
  try {
    await action();
    await refresh();
  } catch (err) {
    $('form-error').textContent = err.message;
    $('form-error').hidden = false;
  }
}

function qrSvg(url) {
  const code = qrcode(0, 'M');
  code.addData(url);
  code.make();
  return code.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
}

function showQr(boat) {
  const crew = `${location.origin}/crew?boat=${encodeURIComponent(boat.id)}`;
  const open = `${location.origin}/boat/${encodeURIComponent(boat.id)}`;
  $('qr-title').textContent = `${boat.name} · ${boat.registration}`;
  $('qr-crew').innerHTML = qrSvg(crew);
  $('qr-public').innerHTML = qrSvg(open);
  for (const [id, url] of [['qr-crew-link', crew], ['qr-public-link', open]]) {
    $(id).href = url;
    $(id).textContent = url;
  }
  $('qr').showModal();
}

$('boats').addEventListener('click', (event) => {
  const id = event.target.dataset.qr;
  const boat = id && boats.find((b) => b.id === id);
  if (boat) showQr(boat);
});

$('facilities').addEventListener('click', (event) => {
  const { facility, open } = event.target.dataset;
  if (facility) admin(() => api(`/api/facilities/${encodeURIComponent(facility)}/status`, { open: open === 'true' }, pin()));
});

$('boat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  admin(async () => {
    await api('/api/boats', { name: $('boat-name').value, registration: $('boat-reg').value }, pin());
    event.target.reset();
  });
});

$('facility-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const accepts = [...event.target.querySelectorAll('input[name="accepts"]:checked')].map((box) => box.value);
  admin(async () => {
    const position = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error('This browser cannot share its location.'));
      else navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Location permission was refused.')), { enableHighAccuracy: true, timeout: 20_000 });
    });
    await api('/api/facilities', {
      name: $('facility-name').value,
      accepts,
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    }, pin());
    $('facility-name').value = '';
  });
});

refresh();
setInterval(refresh, 5000);
