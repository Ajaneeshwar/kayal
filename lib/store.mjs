import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GENESIS_HASH, entryHash } from './logic.mjs';

export class Store {
  #file;
  #db = { boats: [], facilities: [], entries: [] };
  #pending = Promise.resolve();

  constructor(file) {
    this.#file = file;
  }

  static async open(dir, seed) {
    await mkdir(dir, { recursive: true });
    const store = new Store(path.join(dir, 'db.json'));
    try {
      store.#db = JSON.parse(await readFile(store.#file, 'utf8'));
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

  boat(id) {
    return this.#db.boats.find((b) => b.id === id) ?? null;
  }

  entriesFor(boatId) {
    return this.#db.entries.filter((e) => e.boatId === boatId);
  }

  async addBoat({ id, name, registration }) {
    const boat = { id: id ?? `b-${randomUUID().slice(0, 8)}`, name, registration };
    this.#db.boats.push(boat);
    await this.#save();
    return boat;
  }

  async addFacility({ id, name, operator = null, accepts, lat, lon, radiusM, open = true, note = null }) {
    const facility = { id: id ?? `f-${randomUUID().slice(0, 8)}`, name, operator, accepts, lat, lon, radiusM, open, note };
    this.#db.facilities.push(facility);
    await this.#save();
    return facility;
  }

  async setFacilityOpen(id, open) {
    const facility = this.#db.facilities.find((f) => f.id === id);
    if (!facility) return null;
    facility.open = open;
    await this.#save();
    return facility;
  }

  async addEntry(draft) {
    const prevHash = this.#db.entries.at(-1)?.hash ?? GENESIS_HASH;
    const entry = { ...draft, id: draft.id ?? randomUUID(), prevHash };
    entry.hash = entryHash(prevHash, entry);
    this.#db.entries.push(entry);
    await this.#save();
    return entry;
  }

  #save() {
    const write = async () => {
      const tmp = `${this.#file}.tmp`;
      await writeFile(tmp, JSON.stringify(this.#db, null, 1));
      await rename(tmp, this.#file);
    };
    const run = this.#pending.then(write);
    // One failed write must not block every later one.
    this.#pending = run.catch(() => {});
    return run;
  }
}
