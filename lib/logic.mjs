import { createHash } from 'node:crypto';
import { applyConfirmation, confirmationHashFields, unloadHashFields, VEHICLE_UNLOAD } from './confirm.mjs';

const DAY_MS = 86_400_000;
const EARTH_RADIUS_M = 6_371_000;
const COMPASS_POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export const GENESIS_HASH = '0'.repeat(64);

export function chooseReplyLanguage(requested, detected, supported) {
  if (requested !== 'auto') return requested;
  return supported.has(detected) ? detected : 'en-IN';
}

// "spoken" is the wording used in voice replies. It stays plain because the
// replies are machine-translated, and jargon like "pump-out" translates badly.
export const KINDS = {
  sewage_pumpout: { label: 'Sewage pump-out', spoken: 'Toilet tank emptying', needs: 'sewage' },
  solid_waste: { label: 'Solid waste handover', spoken: 'Plastic and solid waste handover', needs: 'solid' },
  engine_oil: { label: 'Used engine oil handover', spoken: 'Used engine oil handover', needs: 'oil' },
};

export const POINT_NAMES = {
  sewage: 'sewage collection point',
  solid: 'waste collection point',
  oil: 'oil collection point',
};

const HANDOVER_METHODS = {
  collection_point: 'at a collection point',
  suction_truck: 'by suction truck',
  mobile_pump: 'by mobile pump boat',
  waste_collector: 'with a waste collector',
  waste_bin: 'at a public waste bin',
};

const rad = (deg) => (deg * Math.PI) / 180;

export function distanceM(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function compass(from, to) {
  const dLon = rad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(rad(to.lat));
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLon);
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return COMPASS_POINTS[Math.round(bearing / 45) % 8];
}

export function spokenDistance(metres) {
  if (metres < 950) return `${Math.max(10, Math.round(metres / 10) * 10)} metres`;
  return `${(metres / 1000).toFixed(1)} kilometres`;
}

export function nearest(facilities, point) {
  let best = null;
  for (const facility of facilities) {
    const d = distanceM(point, facility);
    if (!best || d < best.distanceM) best = { facility, distanceM: d };
  }
  return best;
}

function receiptProof(proof, method) {
  if (method === 'collection_point' && proof.level === 'location') return { ...proof, level: 'receipt' };
  if (method !== 'collection_point' && method !== 'waste_bin' && proof.level === 'declared') {
    return { ...proof, level: 'receipt', reason: 'handover_slip' };
  }
  return proof;
}

/**
 * Decides how far a logged event can be trusted. A voice note alone is
 * "declared"; being inside the radius of an open facility that takes this kind
 * of waste makes it "location"; a receipt photo on top of that makes it "receipt".
 */
export function verify({ kind, method = 'collection_point', location, facilities, hasReceipt }) {
  const declared = { level: 'declared', facilityId: null, facilityName: null, distanceM: null };
  if (method === 'waste_bin') return { ...declared, reason: 'waste_bin' };
  if (method !== 'collection_point') {
    const proof = { ...declared, reason: 'no_fixed_point' };
    return hasReceipt ? receiptProof(proof, method) : proof;
  }
  if (!location) return { ...declared, reason: 'no_location' };

  const candidates = facilities.filter((f) => f.accepts.includes(KINDS[kind].needs));
  if (!candidates.length) return { ...declared, reason: 'no_facility' };

  const inRange = candidates.filter((f) => distanceM(location, f) <= f.radiusM);
  const openOnly = (list) => list.filter((f) => f.open);
  // Out of range, point the crew at a plant they can actually use.
  const match = nearest(openOnly(inRange), location) ?? nearest(inRange, location)
    ?? nearest(openOnly(candidates), location) ?? nearest(candidates, location);
  const seen = {
    facilityId: match.facility.id,
    facilityName: match.facility.name,
    distanceM: Math.round(match.distanceM),
  };

  if (match.distanceM > match.facility.radiusM) return { ...declared, ...seen, reason: 'too_far' };
  if (!match.facility.open) return { ...declared, ...seen, reason: 'closed' };
  const proof = { level: 'location', ...seen, reason: null };
  return hasReceipt ? receiptProof(proof, method) : proof;
}

export function replyFor({ kind, method = 'collection_point', vehicleNumber, handedTo, verification, hasPhoto }) {
  const event = KINDS[kind].spoken;
  const point = POINT_NAMES[KINDS[kind].needs];
  const { facilityName, distanceM: d, level, reason } = verification;
  const photoNote = !hasPhoto ? '' : level === 'receipt' ? ' The receipt photo is saved.' : ' The photo is saved.';
  const recorded = 'This handover is now in the logbook.';
  const unconfirmed = 'This handover is in the logbook. We could not confirm it.';

  if (method !== 'collection_point') {
    const action = kind === 'sewage_pumpout' ? 'Toilet tank emptied' : `${event} recorded`;
    const vehicle = vehicleNumber ? ` ${vehicleNumber}` : '';
    const recipient = handedTo ? ` Handed to ${handedTo}.` : '';
    return `${recorded} ${action} ${HANDOVER_METHODS[method]}${vehicle}.${recipient}${hasPhoto ? ' The handover photo is saved.' : ''}`;
  }
  switch (reason) {
    case null:
      return `${recorded} ${event} recorded at ${facilityName}. Your location is confirmed.${photoNote}`;
    case 'no_location':
      return `${unconfirmed} Turn on location at the collection point next time.${photoNote}`;
    case 'too_far':
      return `${unconfirmed} You are ${spokenDistance(d)} from the nearest ${point}, ${facilityName}.${photoNote}`;
    case 'closed':
      return `${unconfirmed} ${facilityName} is marked closed.${photoNote}`;
    default:
      return `${unconfirmed} No ${point} is listed yet.${photoNote}`;
  }
}

export function answerQuestion(english, location, facilities) {
  const needs = /plastic|garbage|trash|rubbish|solid|(?:food|dry) waste|waste bags?|bottle/i.test(english)
    ? 'solid'
    : /\boil\b/i.test(english)
      ? 'oil'
      : 'sewage';
  const point = POINT_NAMES[needs];
  const open = facilities.filter((f) => f.open && f.accepts.includes(needs));

  if (!open.length) return `No ${point} is working right now.`;
  if (!location) {
    return `Working now: ${open.map((f) => f.name).join(', ')}. Turn on location to hear the distance.`;
  }
  const near = nearest(open, location);
  if (Math.round(near.distanceM) === 0) return `You are at ${near.facility.name}, a working ${point}.`;
  return `The nearest working ${point} is ${near.facility.name}, ${spokenDistance(near.distanceM)} to the ${compass(location, near.facility)}.`;
}

export function classifyByKeywords(english) {
  const t = english.toLowerCase();
  if (/\?|\b(where|which|nearest|closest)\b/.test(t)) return 'question';
  return wasteKind(t);
}

function wasteKind(t) {
  if (/sewage|septage|septic|toilet|latrine|f(a)?ecal|pump(ed)?[- ]?out|holding tank|bio ?tank/.test(t)) return 'sewage_pumpout';
  if (/\boil\b/.test(t)) return 'engine_oil';
  if (/plastic|garbage|trash|rubbish|(?:solid|food|dry) waste|bottles?|waste bags?/.test(t)) return 'solid_waste';
  return 'other';
}

export function hasInvalidQuantity(text) {
  return /(?:^|[^\p{L}\p{N}])[-−]\s*\.?\p{Nd}|\b(?:nan|infinity)\b/iu.test(text);
}

/** Models wrap JSON in prose or code fences; take the outermost object. */
export function parseModelJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The model reply has no JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

function cleanString(value, max = 200) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const s = String(value).replace(/[<>\x00-\x1f\x7f]/g, ' ').trim();
  return s && s.toLowerCase() !== 'null' ? s.slice(0, max) : null;
}

function handoverSummary(summary, kind) {
  return summary.replace(/\b(?:dumped|discharged|threw|thrown|discarded|disposed of|tipped|released)\b(?: away\b)?/gi, (verb) => {
    const replacement = kind === 'sewage_pumpout' ? 'emptied' : 'handed over';
    return /^[A-Z]/.test(verb) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  });
}

function namedRecipient(value) {
  const name = typeof value === 'string' ? cleanString(value, 100) : null;
  if (!name || [...name].length < 3 || !/\p{L}/u.test(name)) return null;
  if (/^\p{Lu}[\p{Lu}\p{N}._/-]*$/u.test(name)) return null;
  if (/^[a-z]{2}[-\s]*\d{1,2}[-\s]*[a-z]{0,3}[-\s]*\d{1,4}$/i.test(name)) return null;
  if (/^(?:(?:a|an|the)\s+)?(?:(?:local|municipal|suction|septic|waste|collection)\s+)*(?:truck|tanker|boat|barge|driver|collector|operator|service|crew|person|someone|somebody|unknown)\.?$/i.test(name)) return null;
  return name;
}

export function normaliseExtraction(raw, english) {
  const known = [...Object.keys(KINDS), 'question', 'other'];
  const kind = known.includes(raw?.kind) ? raw.kind : classifyByKeywords(english);
  const summary = cleanString(raw?.summary_en);
  const summaryText = !summary || /^(?:emptied|handed over)[.!]?$/i.test(summary) ? english.trim() : summary;
  const vehicleNumber = typeof raw?.vehicle_number === 'string' ? cleanString(raw.vehicle_number, 40) : null;
  const facilityMentioned = cleanString(raw?.facility_mentioned);
  let method = typeof raw?.method === 'string' && Object.hasOwn(HANDOVER_METHODS, raw.method)
    ? raw.method : 'collection_point';
  if (raw?.method === 'collection_point' && vehicleNumber && !facilityMentioned) method = 'suction_truck';
  return {
    kind,
    method,
    vehicleNumber,
    handedTo: namedRecipient(raw?.handed_to),
    facilityMentioned,
    quantity: cleanString(raw?.quantity),
    summaryEn: handoverSummary(summaryText, kind).slice(0, 200),
  };
}

export function normalisePhoto(raw) {
  return {
    isReceipt: raw?.is_receipt === true,
    issuer: cleanString(raw?.issuer),
    date: cleanString(raw?.date),
    amount: cleanString(raw?.amount),
    caption: cleanString(raw?.caption),
  };
}

export function boatStatus(entries, now, overdueDays) {
  const newestFirst = (kind) =>
    entries.filter((e) => !e.voided && !e.disputed && e.kind === kind).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const describe = (e) =>
    e && {
      at: e.at,
      daysAgo: Math.max(0, Math.floor((now.getTime() - Date.parse(e.at)) / DAY_MS)),
      level: e.verification.level,
      facilityName: e.verification.reason === null || e.verification.level === 'confirmed' ? e.verification.facilityName : null,
    };

  const sewage = newestFirst('sewage_pumpout');
  const cutoff = now.getTime() - overdueDays * DAY_MS;
  const recent = sewage.filter((e) => Date.parse(e.at) >= cutoff);
  const verified = recent.find((e) => e.verification.level !== 'declared');

  return {
    state: verified ? 'verified' : recent.length ? 'declared' : 'overdue',
    overdueDays,
    lastSewage: describe(verified ?? recent[0] ?? sewage[0]) ?? null,
    lastSolid: describe(newestFirst('solid_waste')[0]) ?? null,
  };
}

const reminderDate = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
});

export function reminderMessage(boatName, ownerName, status, facilities, now) {
  let timing = `${boatName} has no sewage pump-out on record.`;
  let notDueSoon = false;
  if (status.lastSewage) {
    const dueAt = Date.parse(status.lastSewage.at) + status.overdueDays * DAY_MS;
    const timeLeft = dueAt - now.getTime();
    const days = Math.ceil(Math.abs(timeLeft) / DAY_MS);
    const period = `${days} ${days === 1 ? 'day' : 'days'}`;
    notDueSoon = timeLeft > 14 * DAY_MS;
    const expiry = timeLeft < 0
      ? `is ${period} overdue`
      : `expires ${days === 0 ? 'today' : `in ${period}`} (${reminderDate.format(dueAt)})`;
    timing = `${boatName}'s ${status.overdueDays}-day sewage pump-out record ${expiry}.`;
  }
  const plant = facilities.find((facility) => facility.open && facility.accepts.includes('sewage'));
  const destination = plant ? `${plant.name} or another approved plant` : 'an approved treatment plant';
  const english = `Hello ${ownerName}, this is Kayal Log's automated Alappuzha houseboat reminder. ${timing} Empty the toilet tank at ${destination} and log it in Kayal Log. Delays may affect licence renewal. Thank you.`;
  return { english, notDueSoon };
}

export function entryHash(prevHash, e) {
  if (e.photoForEntryId) {
    const fields = [prevHash, 'entry_photo', e.id, e.boatId, e.at, e.photoForEntryId, e.photo, e.reading];
    return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
  }
  if (e.confirmsEntryId) {
    return createHash('sha256').update(JSON.stringify([prevHash, ...confirmationHashFields(e)])).digest('hex');
  }
  if (e.type === VEHICLE_UNLOAD) {
    return createHash('sha256').update(JSON.stringify([prevHash, ...unloadHashFields(e)])).digest('hex');
  }
  if (e.voidsEntryId) {
    const fields = [prevHash, 'entry_void', e.id, e.boatId, e.at, e.voidsEntryId, e.reason];
    return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
  }
  const fields = e.correctsEntryId
    ? [prevHash, 'quantity_correction', e.id, e.boatId, e.at, e.correctsEntryId, e.quantity]
    : [
        prevHash, e.id, e.boatId, e.at, e.kind, e.summaryEn, e.quantity,
        e.heard, e.location, e.verification, e.photo?.file ?? null, e.source,
      ];
  if (e.correctionTokenHash) fields.push(e.correctionTokenHash);
  // Original entries used only the photo filename. Preserve their stored digests.
  if (e.hashVersion === 2 || e.hashVersion === 3 || e.hashVersion === 4 || e.hashVersion === 5) {
    fields.push(e.hashVersion, e.facilityMentioned ?? null, e.photo ?? null);
  }
  if (e.hashVersion === 3 || e.hashVersion === 4 || e.hashVersion === 5) fields.push(e.method, e.vehicleNumber ?? null, e.handedTo ?? null);
  if (e.hashVersion === 4 || e.hashVersion === 5) fields.push(e.handoverCode);
  if (e.hashVersion === 5) fields.push(e.replyLanguage);
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}

export function projectEntries(records, operators = []) {
  const corrections = new Map();
  const voids = new Map();
  const confirmations = new Map();
  const photos = new Map();
  const receiptEntries = new Set();
  const operatorById = new Map(operators.map((operator) => [operator.id, operator]));
  for (const record of records) {
    if (record.correctsEntryId) corrections.set(record.correctsEntryId, record);
    if (record.voidsEntryId) voids.set(record.voidsEntryId, record);
    if (record.confirmsEntryId) confirmations.set(record.confirmsEntryId, record);
    if (record.photoForEntryId) {
      photos.set(record.photoForEntryId, record);
      if (record.reading.isReceipt) receiptEntries.add(record.photoForEntryId);
    }
  }
  const entries = records.filter((record) =>
    !record.correctsEntryId && !record.voidsEntryId && !record.confirmsEntryId
    && !record.photoForEntryId && record.type !== VEHICLE_UNLOAD);
  return entries.map(({ correctionTokenHash, hashVersion, replyLanguage, ...entry }) => {
    // Supply defaults on reads without changing the original hashed record.
    entry.method ??= 'collection_point';
    entry.vehicleNumber ??= null;
    entry.handedTo ??= null;
    entry.handoverCode ??= null;
    const photoRecord = photos.get(entry.id);
    if (photoRecord) entry.photo = { ...photoRecord.photo, ...photoRecord.reading };
    if (receiptEntries.has(entry.id)) entry.verification = receiptProof(entry.verification, entry.method);
    const voidRecord = voids.get(entry.id);
    entry.voided = Boolean(voidRecord);
    if (voidRecord) {
      entry.voidedAt = voidRecord.at;
      entry.voidReason = voidRecord.reason;
    }
    const correction = corrections.get(entry.id);
    const projected = correction
      ? { ...entry, quantity: correction.quantity, corrected: true, correctionId: correction.id, correctedAt: correction.at }
      : { ...entry, corrected: false, correctionId: null, correctedAt: null };
    const confirmation = confirmations.get(entry.id);
    return applyConfirmation(projected, confirmation, operatorById.get(confirmation?.operatorId));
  });
}

/** Entries must be in the order they were written, oldest first. */
export function checkChain(entries) {
  let prev = GENESIS_HASH;
  for (const [index, entry] of entries.entries()) {
    if (entry.prevHash !== prev || entry.hash !== entryHash(prev, entry)) {
      return { ok: false, count: entries.length, brokenAt: index };
    }
    prev = entry.hash;
  }
  return { ok: true, count: entries.length, brokenAt: null };
}
