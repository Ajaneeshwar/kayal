export async function api(path, body, pin) {
  const init = body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(pin ? { 'x-admin-pin': pin } : {}) },
    body: JSON.stringify(body),
  };
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `The request failed (${res.status}).`);
  return data;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const KIND_LABELS = {
  sewage_pumpout: 'Sewage pump-out',
  solid_waste: 'Solid waste handover',
  engine_oil: 'Used engine oil handover',
};

export const LEVELS = {
  declared: { label: 'Self-declared', tone: 'warn' },
  location: { label: 'Location verified', tone: 'ok' },
  receipt: { label: 'Location and receipt verified', tone: 'ok' },
};

export const STATES = {
  verified: { label: 'Verified', tone: 'ok' },
  declared: { label: 'Self-declared', tone: 'warn' },
  overdue: { label: 'Overdue', tone: 'bad' },
};

export const badge = (tone, label) => `<span class="badge ${tone}">${esc(label)}</span>`;

export function ago(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  const days = Math.floor(minutes / 1440);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export const days = (n) => (n === 0 ? 'today' : n === 1 ? '1 day ago' : `${n} days ago`);

export function distance(metres) {
  return metres < 950 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
}

export function whereText(entry) {
  const { reason, facilityName, distanceM } = entry.verification;
  switch (reason) {
    case null: return `At ${facilityName}`;
    case 'too_far': return `${distance(distanceM)} from ${facilityName}`;
    case 'closed': return `${facilityName} is marked closed`;
    case 'no_location': return 'No location shared';
    default: return 'No collection point listed';
  }
}

export function entryCard(entry, boatName) {
  const level = LEVELS[entry.verification.level];
  const quantity = entry.quantity && !entry.summaryEn.includes(entry.quantity) ? ` (${esc(entry.quantity)})` : '';
  const translated = entry.heard.original !== entry.heard.english;
  const photo = entry.photo
    ? `<p class="small"><a href="/uploads/${esc(entry.photo.file)}" target="_blank" rel="noopener">${entry.photo.isReceipt ? 'Receipt photo' : 'Photo'}</a>${entry.photo.caption ? `: ${esc(entry.photo.caption)}` : ''}</p>`
    : '';
  return `
    <article class="entry">
      <div class="entry-top">
        <strong>${esc(KIND_LABELS[entry.kind])}</strong>
        ${badge(level.tone, level.label)}
        ${entry.source === 'sample' ? badge('plain', 'Sample data') : ''}
        <time datetime="${esc(entry.at)}">${esc(ago(entry.at))}</time>
      </div>
      ${boatName ? `<p class="small muted">${esc(boatName)}</p>` : ''}
      <p>${esc(entry.summaryEn)}${quantity}</p>
      <p class="small muted">${esc(whereText(entry))}</p>
      ${translated ? `<p class="entry-heard" lang="${esc(entry.heard.language)}">${esc(entry.heard.original)}</p>` : ''}
      ${photo}
      <p class="entry-foot">#${esc(entry.hash.slice(0, 10))}</p>
    </article>`;
}
