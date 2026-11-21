import { correctionQuantity } from './input.mjs';

const CONFIRM_WINDOW_MS = 72 * 60 * 60 * 1000;
const CUSTODY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const OPERATOR_TYPES = ['plant', 'suction_truck', 'mobile_pump', 'waste_collector'];
export const HANDOVER_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const VEHICLE_UNLOAD = 'vehicle_unload';
export const isVehicleOperator = (type) => type === 'suction_truck' || type === 'mobile_pump';
export const normaliseVehicle = (number) => number?.replace(/[\s-]/g, '').toUpperCase() ?? '';

export function publicOperator({ id, name, type, facilityId, vehicleNumber }) {
  return { id, name, type, facilityId, vehicleNumber };
}

export function canConfirm(operator, entry, now = new Date(), facility = null) {
  const age = now.getTime() - Date.parse(entry.at);
  if (entry.voided || !(age >= 0 && age <= CONFIRM_WINDOW_MS)) return false;
  const method = entry.method ?? 'collection_point';
  if (operator.type === 'plant') {
    if (method !== 'collection_point' || !operator.facilityId) return false;
    const matched = entry.verification?.facilityId;
    if (matched && entry.verification.reason !== 'too_far') return matched === operator.facilityId;
    return facility?.id === operator.facilityId
      && entry.facilityMentioned?.trim().toLowerCase() === facility.name.trim().toLowerCase();
  }
  if (method !== operator.type) return false;
  if (operator.type === 'waste_collector') return true;
  if (!isVehicleOperator(operator.type)) return false;
  const vehicle = normaliseVehicle(operator.vehicleNumber);
  const named = normaliseVehicle(entry.vehicleNumber);
  return Boolean(vehicle) && (!named || named === vehicle);
}

export function applyConfirmation(entry, confirmation, operator) {
  if (!confirmation || !operator) return { ...entry, confirmation: null, disputed: false };
  const { decision, at, operatorId, quantity, note } = confirmation;
  const disputed = decision === 'not_received';
  const verification = { ...entry.verification };
  if (operator.type === 'plant' && verification.facilityId !== operator.facilityId) {
    verification.facilityId = operator.facilityId;
    verification.facilityName = entry.facilityMentioned;
    verification.distanceM = null;
  }
  return {
    ...entry,
    vehicleNumber: isVehicleOperator(operator.type) && !normaliseVehicle(entry.vehicleNumber)
      ? operator.vehicleNumber : entry.vehicleNumber,
    verification: {
      ...verification,
      level: disputed ? 'declared' : 'confirmed',
      reason: disputed ? 'operator_disputed' : 'operator_confirmed',
    },
    confirmation: { decision, at, operatorId, operatorName: operator.name, operatorType: operator.type, quantity, note },
    disputed,
  };
}

export function confirmationHashFields({ id, boatId, at, confirmsEntryId, operatorId, decision, quantity, note }) {
  return ['operator_confirmation', id, boatId, at, confirmsEntryId, operatorId, decision, quantity, note];
}

export function unloadHashFields({ type, id, at, operatorId, facilityId, vehicleNumber, quantity }) {
  return [type, id, at, operatorId, facilityId, vehicleNumber, quantity];
}

function decimalDigit(digit) {
  const code = digit.codePointAt(0);
  let first = code;
  while (/\p{Nd}/u.test(String.fromCodePoint(first - 1))) first--;
  return String((code - first) % 10);
}

export function litresFromQuantity(value) {
  let quantity;
  try {
    quantity = correctionQuantity(value);
  } catch {
    return 0;
  }
  const match = /^(?<amount>[\p{Nd},.]+) *(?:l|ltrs?|litres?|liters?|ലിറ്റർ|ലിറ്റര്‍|ലിറ്ററുകൾ)$/iu.exec(quantity);
  if (!match) return 0;
  const amount = Number(match.groups.amount.replaceAll(',', '').replace(/\p{Nd}/gu, decimalDigit));
  return Number.isFinite(amount) ? amount : 0;
}

export function custodyTotals(operators, records, now = new Date()) {
  const byVehicle = new Map();
  const byOperator = new Map();
  for (const operator of operators) {
    if (!isVehicleOperator(operator.type)) continue;
    const vehicle = normaliseVehicle(operator.vehicleNumber);
    if (!vehicle) continue;
    if (!byVehicle.has(vehicle)) {
      byVehicle.set(vehicle, {
        vehicleNumber: operator.vehicleNumber, operatorName: operator.name,
        pickedUpLitres: 0, unloadedLitres: 0, lastPickupAt: null, lastUnloadAt: null,
      });
    }
    byOperator.set(operator.id, byVehicle.get(vehicle));
  }
  const voided = new Set(records.map((record) => record.voidsEntryId).filter(Boolean));
  const cutoff = now.getTime() - CUSTODY_WINDOW_MS;
  for (const record of records) {
    const at = Date.parse(record.at);
    if (!(at >= cutoff && at <= now.getTime())) continue;
    if (record.type === VEHICLE_UNLOAD) {
      const row = byVehicle.get(normaliseVehicle(record.vehicleNumber));
      if (!row) continue;
      row.unloadedLitres += litresFromQuantity(record.quantity);
      if (!row.lastUnloadAt || at > Date.parse(row.lastUnloadAt)) row.lastUnloadAt = record.at;
    } else if (record.confirmsEntryId && record.decision === 'received' && !voided.has(record.confirmsEntryId)) {
      const row = byOperator.get(record.operatorId);
      if (!row) continue;
      row.pickedUpLitres += litresFromQuantity(record.quantity);
      if (!row.lastPickupAt || at > Date.parse(row.lastPickupAt)) row.lastPickupAt = record.at;
    }
  }
  return [...byVehicle.values()].map((row) => ({ ...row, gapLitres: row.pickedUpLitres - row.unloadedLitres }));
}
