import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { GENESIS_HASH, entryHash, projectEntries } from './logic.mjs';
import { HttpError } from './input.mjs';

const CORRECTION_WINDOW_MS = 30 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function appendEntry(db, draft) {
  const prevHash = db.entries.at(-1)?.hash ?? GENESIS_HASH;
  const entry = { ...draft, id: draft.id ?? randomUUID(), prevHash };
  entry.hash = entryHash(prevHash, entry);
  db.entries = [...db.entries, entry];
  return entry;
}

export class Store {
  #file;
  #db = { boats: [], facilities: [], entries: [], reports: [] };
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

  /** Oldest first, which is also hash-chain order. */
  get entries() {
    return this.#db.entries;
  }

  get reports() {
    return this.#db.reports;
  }

  boat(id) {
    return this.#db.boats.find((b) => b.id === id) ?? null;
  }

  entriesFor(boatId) {
    return projectEntries(this.#db.entries.filter((e) => e.boatId === boatId));
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
    return this.#update((db) => appendEntry(db, { ...draft, hashVersion: 2 }));
  }

  correctEntry({ entryId, boatId, quantity, correctionToken }) {
    return this.#update((db) => {
      const entry = db.entries.find((e) => e.id === entryId && e.boatId === boatId && !e.correctsEntryId);
      if (!entry) throw new HttpError(404, 'This entry does not belong to that boat.');
      const now = new Date();
      if (!entry.correctionTokenHash || now.getTime() - Date.parse(entry.at) > CORRECTION_WINDOW_MS) {
        throw new HttpError(409, 'This entry is no longer open for corrections.');
      }
      if (!timingSafeEqual(Buffer.from(entry.correctionTokenHash), Buffer.from(hashToken(correctionToken)))) {
        throw new HttpError(403, 'Only the crew who saved this entry can correct it.');
      }
      const previous = db.entries.findLast((e) => e.correctsEntryId === entryId);
      if (previous?.quantity === quantity) {
        return { entry: projectEntries([entry, previous])[0], correction: previous, changed: false };
      }
      if (!previous && entry.quantity === quantity) throw new HttpError(409, 'The entry already has that quantity.');
      const correction = appendEntry(db, { boatId, at: now.toISOString(), correctsEntryId: entryId, quantity });
      return { entry: projectEntries([entry, correction])[0], correction, changed: true };
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
