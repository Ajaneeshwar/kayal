import type { Entry, Level, Waste } from './api.ts';

export const KIND_LABELS: Record<Entry['kind'], string> = {
  sewage_pumpout: 'Sewage pump-out',
  solid_waste: 'Solid waste handover',
  engine_oil: 'Used engine oil handover',
};

export const WASTE_LABELS: Record<Waste, string> = { sewage: 'Sewage', solid: 'Solid waste', oil: 'Used oil' };

export const LEVEL_LABELS: Record<Level, string> = {
  declared: 'Declared only',
  location: 'Location matched',
  receipt: 'Location and receipt',
};

/** Proof level to the boat state colour it shares. */
export const LEVEL_TONE: Record<Level, 'verified' | 'declared'> = {
  declared: 'declared',
  location: 'verified',
  receipt: 'verified',
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function ago(iso: string, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  if (minutes > -1) return 'just now';
  if (minutes > -60) return rtf.format(minutes, 'minute');
  if (minutes > -1440) return rtf.format(Math.round(minutes / 60), 'hour');
  return rtf.format(Math.round(minutes / 1440), 'day');
}

export function daysAgo(n: number) {
  return rtf.format(-n, 'day');
}

export function distance(m: number) {
  return m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function whereText(entry: Entry) {
  const { reason, facilityName, distanceM } = entry.verification;
  switch (reason) {
    case null:
      return `At ${facilityName}`;
    case 'too_far':
      return `${distance(distanceM ?? 0)} from ${facilityName}`;
    case 'closed':
      return `${facilityName} is marked closed`;
    case 'no_location':
      return 'No location shared';
    default:
      return 'No collection point listed';
  }
}

export function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
