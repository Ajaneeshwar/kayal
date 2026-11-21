import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { GENESIS_HASH, entryHash, projectEntries } from './logic.mjs';
import { HttpError } from './input.mjs';
import { canConfirm, HANDOVER_ALPHABET, isVehicleOperator, normaliseVehicle, publicOperator, VEHICLE_UNLOAD } from './confirm.mjs';

const CORRECTION_WINDOW_MS = 30 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function appendEntry(db, draft) {
  const prevHash = db.entries.at(-1)?.hash ?? GENESIS_HASH;
  const entry = { ...draft, id: draft.id ?? randomUUID(), prevHash };
  entry.hash = entryHash(prevHash, entry);
  db.entries = [...db.entries, entry];
  return entry;
}

function handoverRecords(db, id) {
  return db.entries.filter((entry) =>
    entry.id === id || entry.correctsEntryId === id || entry.voidsEntryId === id || entry.confirmsEntryId === id);
}

export class Store {
  #file;
  #db = { boats: [], facilities: [], operators: [], entries: [], reports: [] };
  #pending = Promise.resolve();

  constructor(file) {
    this.#file = file;
  }

  static async open(dir, seed) {
    await mkdir(dir, { recursive: true });
    const store = new Store(path.join(dir, 'db.json'));
    try {
      store.#db = JSON.parse(await readFile(store.#file, 'utf8'));
      store.#db.reports ??= [];
      store.#db.operators ??= [];
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      if (seed) await seed(store);
    }
    return store;
  }

  get boats() {
    return this.#db.boats;
  }

  get facilities() {
    return this.#db.facilities;
  }

  get operators() {
    return this.#db.operators.map(publicOperator);
  }

  authenticateOperator(id, code) {
    const operator = this.#db.operators.find((item) => item.id === id);
    if (!operator) throw new HttpError(404, 'This operator is not registered.');
    if (typeof code !== 'string' || code.length > 64
      || !timingSafeEqual(Buffer.from(operator.codeHash), Buffer.from(hashToken(code)))) {
      throw new HttpError(401, 'The operator code is wrong.');
    }
    return publicOperator(operator);
  }

  addOperator({ id, name, type, facilityId = null, vehicleNumber = null, code }) {
    const operator = {
      id: id ?? `o-${randomUUID().slice(0, 8)}`, name, type, facilityId, vehicleNumber, codeHash: hashToken(code),
    };
    return this.#update((db) => {
      db.operators = [...db.operators, operator];
      return publicOperator(operator);
    });
  }

  /** Oldest first, which is also hash-chain order. */
  get entries() {
    return this.#db.entries;
  }

  get reports() {
    return this.#db.reports;
  }

  get uploadsDir() {
    return path.join(path.dirname(this.#file), 'uploads');
  }

  boat(id) {
    return this.#db.boats.find((b) => b.id === id) ?? null;
  }

  entriesFor(boatId) {
    return projectEntries(this.#db.entries.filter((e) => e.boatId === boatId), this.#db.operators);
  }

  addBoat({ id, name, registration }) {
    const boat = { id: id ?? `b-${randomUUID().slice(0, 8)}`, name, registration };
    return this.#update((db) => {
      db.boats = [...db.boats, boat];
      return boat;
    });
  }

  addFacility({ id, name, operator = null, accepts, lat, lon, radiusM, open = true, note = null }) {
    const facility = { id: id ?? `f-${randomUUID().slice(0, 8)}`, name, operator, accepts, lat, lon, radiusM, open, note };
    return this.#update((db) => {
      db.facilities = [...db.facilities, facility];
      return facility;
    });
  }

  setFacilityOpen(id, open) {
    return this.#update((db) => {
      const current = db.facilities.find((f) => f.id === id);
      if (!current) return null;
      if (current.open === open) return { facility: current, changed: false };
      const facility = { ...current, open };
      db.facilities = db.facilities.map((f) => f.id === id ? facility : f);
      return { facility, changed: true };
    });
  }

  addEntry(draft, correctionToken = null) {
    if (correctionToken) draft = { ...draft, correctionTokenHash: hashToken(correctionToken) };
    return this.#update((db) => {
      let handoverCode;
      do {
        handoverCode = Array.from({ length: 6 }, () => HANDOVER_ALPHABET[randomInt(HANDOVER_ALPHABET.length)]).join('');
      } while (db.entries.some((entry) => entry.handoverCode === handoverCode));
      return appendEntry(db, { ...draft, handoverCode, hashVersion: 4 });
    });
  }

  correctEntry({ entryId, boatId, quantity, correctionToken }) {
    return this.#update((db) => {
      const records = handoverRecords(db, entryId);
      const entry = records.find((e) => e.id === entryId && e.boatId === boatId
        && !e.correctsEntryId && !e.voidsEntryId && !e.confirmsEntryId);
      if (!entry) throw new HttpError(404, 'This entry does not belong to that boat.');
      const now = new Date();
      if (!entry.correctionTokenHash || now.getTime() - Date.parse(entry.at) > CORRECTION_WINDOW_MS) {
        throw new HttpError(409, 'This entry is no longer open for corrections.');
      }
      if (!timingSafeEqual(Buffer.from(entry.correctionTokenHash), Buffer.from(hashToken(correctionToken)))) {
        throw new HttpError(403, 'Only the crew who saved this entry can correct it.');
      }
      const previous = records.findLast((e) => e.correctsEntryId === entryId);
      if (previous?.quantity === quantity) {
        return { entry: projectEntries(records, db.operators)[0], correction: previous, changed: false };
      }
      if (!previous && entry.quantity === quantity) throw new HttpError(409, 'The entry already has that quantity.');
      const correction = appendEntry(db, { boatId, at: now.toISOString(), correctsEntryId: entryId, quantity });
      return { entry: projectEntries([...records, correction], db.operators)[0], correction, changed: true };
    });
  }

  voidEntry({ entryId, reason }) {
    return this.#update((db) => {
      const records = handoverRecords(db, entryId);
      const [entry] = projectEntries(records, db.operators);
      if (!entry) throw new HttpError(404, 'This entry does not exist.');
      const existing = records.find((e) => e.voidsEntryId === entryId);
      const voidRecord = existing ?? appendEntry(db, {
        boatId: entry.boatId, at: new Date().toISOString(), voidsEntryId: entryId, reason,
      });
      const projected = existing ? entry : projectEntries([...records, voidRecord], db.operators)[0];
      return { entry: projected, void: voidRecord, changed: !existing };
    });
  }

  confirmEntry({ entryId, operator, decision, quantity = null, note = null }, clock = () => new Date()) {
    return this.#update((db) => {
      const records = handoverRecords(db, entryId);
      const [entry] = projectEntries(records, db.operators);
      if (!entry) throw new HttpError(404, 'This entry does not exist.');
      const now = clock();
      const facility = db.facilities.find((item) => item.id === operator.facilityId);
      if (!canConfirm(operator, entry, now, facility)) throw new HttpError(403, 'This operator cannot confirm this entry.');
      const existing = records.find((record) => record.confirmsEntryId === entryId);
      if (existing) {
        if (existing.decision !== decision) throw new HttpError(409, 'An operator has already decided this entry.');
        return { entry, confirmation: existing, changed: false };
      }
      const confirmation = appendEntry(db, {
        boatId: entry.boatId, at: now.toISOString(), confirmsEntryId: entryId, operatorId: operator.id, decision, quantity, note,
      });
      return { entry: projectEntries([...records, confirmation], db.operators)[0], confirmation, changed: true };
    });
  }

  addUnload({ operator, vehicleNumber, quantity }, clock = () => new Date()) {
    if (operator.type !== 'plant') throw new HttpError(403, 'Only a plant operator can record an unload.');
    return this.#update((db) => {
      const number = normaliseVehicle(vehicleNumber);
      const vehicle = db.operators.find((item) => isVehicleOperator(item.type) && normaliseVehicle(item.vehicleNumber) === number);
      if (!vehicle) throw new HttpError(404, 'This vehicle is not registered.');
      return appendEntry(db, {
        type: VEHICLE_UNLOAD, at: clock().toISOString(), operatorId: operator.id,
        facilityId: operator.facilityId, vehicleNumber: vehicle.vehicleNumber, quantity,
      });
    });
  }

  addReport(report) {
    return this.#update((db) => {
      db.reports = [...db.reports, report];
      return report;
    });
  }

  reviewReport(id) {
    return this.#update((db) => {
      const current = db.reports.find((report) => report.id === id);
      if (!current) return null;
      if (current.reviewedAt) return { report: current, changed: false };
      const report = { ...current, reviewedAt: new Date().toISOString() };
      db.reports = db.reports.map((item) => item.id === id ? report : item);
      return { report, changed: true };
    });
  }

  #update(update) {
    const write = async () => {
      const db = { ...this.#db };
      const result = update(db);
      if (Object.keys(db).every((key) => db[key] === this.#db[key])) return result;
      const tmp = `${this.#file}.tmp`;
      await writeFile(tmp, JSON.stringify(db, null, 1));
      await rename(tmp, this.#file);
      this.#db = db;
      return result;
    };
    const run = this.#pending.then(write);
    // One failed write must not block every later one.
    this.#pending = run.catch(() => {});
    return run;
  }
}
