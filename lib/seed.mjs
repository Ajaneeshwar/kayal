import { randomUUID } from 'node:crypto';
import { verify } from './logic.mjs';
import { saveWithPhoto } from './uploads.mjs';

const DAY_MS = 86_400_000;

// A 96 × 56 PNG labeled SAMPLE, shared by the synthetic receipts and reports.
const SAMPLE_PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAAA4CAMAAAA1mw2QAAAABlBMVEX579VdRDNjVb5PAAAAf0lEQVRYw+2TUQqAIBQE3ftfOiKfbzUCRfubIUpMdnLDUgAAAADgE93EaHyqvpdN58x8vjLPBi7QhuC1lfziJ7euMsFiQ6n6Q+CFlEiOwObZqMiC7Nau/Z/capIl9YKxzMWKsh1Z69IpgaeWCG+bGgTDyZgX9IfsrAAAAABgnQvncAEpP7sxoAAAAABJRU5ErkJggg==',
  'base64',
);

// Coordinates are OpenStreetMap place centres, not surveyed plant locations, and
// open/closed states come from 2023 press reports. Confirm both with the DTPC
// before relying on them.
const FACILITIES = [
  {
    id: 'kumarakom-stp', name: 'Kumarakom STP', operator: 'Kottayam DTPC',
    accepts: ['sewage'], lat: 9.5965, lon: 76.4292, radiusM: 400, open: true,
    note: 'Approximate position. Reported as the only working plant in 2023.',
  },
  {
    id: 'h-block-stp', name: 'H Block (Kunnumma) STP', operator: 'Alappuzha DTPC',
    accepts: ['sewage'], lat: 9.4753, lon: 76.4499, radiusM: 400, open: false,
    note: 'Approximate position. Reported closed since 2019.',
  },
  {
    id: 'vattakayal-stp', name: 'Vattakayal STP', operator: 'Alappuzha DTPC',
    accepts: ['sewage'], lat: 9.4847, lon: 76.4251, radiusM: 400, open: false,
    note: 'Approximate position. Reported defunct in 2023.',
  },
  {
    id: 'punnamada-collection', name: 'Punnamada waste collection point', operator: 'Alappuzha DTPC contractor',
    accepts: ['solid'], lat: 9.5223, lon: 76.3536, radiusM: 400, open: true,
    note: 'Approximate position. Dry and plastic waste only.',
  },
];

const BOATS = [
  { id: 'kayal-rani', name: 'Kayal Rani', registration: 'SAMPLE-ALP-0101' },
  { id: 'vembanad-queen', name: 'Vembanad Queen', registration: 'SAMPLE-ALP-0102' },
  { id: 'punnamada-star', name: 'Punnamada Star', registration: 'SAMPLE-ALP-0103' },
  { id: 'kuttanad-pearl', name: 'Kuttanad Pearl', registration: 'SAMPLE-ALP-0104' },
  { id: 'pathiramanal-breeze', name: 'Pathiramanal Breeze', registration: 'SAMPLE-ALP-0105' },
  { id: 'marthanda-rani', name: 'Marthanda Rani', registration: 'SAMPLE-ALP-0106' },
  { id: 'pallathuruthy-mist', name: 'Pallathuruthy Mist', registration: 'SAMPLE-ALP-0107' },
  { id: 'nedumudy-swan', name: 'Nedumudy Swan', registration: 'SAMPLE-ALP-0108' },
  { id: 'kainakary-lotus', name: 'Kainakary Lotus', registration: 'SAMPLE-ALP-0109' },
  { id: 'muhamma-moon', name: 'Muhamma Moon', registration: 'SAMPLE-ALP-0110' },
  { id: 'chavara-grace', name: 'Chavara Grace', registration: 'SAMPLE-ALP-0111' },
  { id: 'alappuzha-heron', name: 'Alappuzha Heron', registration: 'SAMPLE-ALP-0112' },
];

const [kumarakom, hBlock, , punnamada] = FACILITIES;
const westLake = { name: 'a tender on the Punnamada side of the lake', lat: 9.542, lon: 76.371 };
const centralLake = { name: 'a service boat on Vembanad Lake', lat: 9.572, lon: 76.396, method: 'mobile_pump' };
const hBlockPickup = { name: 'a tanker alongside H Block', lat: hBlock.lat, lon: hBlock.lon - 0.002 };
const noFix = { name: 'a private tanker' };

// Days back, boat ID, waste kind, amount, handover site, and optional receipt.
const SEWAGE = 'sewage_pumpout';
const SOLID = 'solid_waste';
const OIL = 'engine_oil';
const HANDOVERS = [
  [115.2, 'kayal-rani', SEWAGE, 750, kumarakom, true],
  [65, 'kayal-rani', SOLID, 5, punnamada],
  [12, 'kayal-rani', SEWAGE, 800, kumarakom, true],
  [1.3, 'kayal-rani', SOLID, 4, punnamada],

  [108.4, 'vembanad-queen', SEWAGE, 900, kumarakom],
  [51, 'vembanad-queen', SOLID, 6, punnamada, true],
  [35.2, 'vembanad-queen', SEWAGE, 1000, noFix],
  [4, 'vembanad-queen', OIL, 6, westLake],

  [117, 'punnamada-star', SEWAGE, 680, kumarakom],
  [72.3, 'punnamada-star', SOLID, 4, punnamada],
  [37.1, 'punnamada-star', OIL, 5, centralLake],
  [9, 'punnamada-star', SOLID, 3, punnamada],

  [103.2, 'kuttanad-pearl', SEWAGE, 560, kumarakom, true],
  [60, 'kuttanad-pearl', SOLID, 3, punnamada],
  [21.2, 'kuttanad-pearl', SOLID, 2, punnamada],
  [6, 'kuttanad-pearl', OIL, 4, westLake],

  [112, 'pathiramanal-breeze', SOLID, 5, punnamada],
  [77.4, 'pathiramanal-breeze', SEWAGE, 1100, kumarakom],
  [30, 'pathiramanal-breeze', SOLID, 5, punnamada],
  [2.4, 'pathiramanal-breeze', SEWAGE, 1250, kumarakom, true],

  [98.1, 'marthanda-rani', SOLID, 4, punnamada],
  [87, 'marthanda-rani', SEWAGE, 720, kumarakom],
  [43.3, 'marthanda-rani', SOLID, 4, westLake],
  [8, 'marthanda-rani', SOLID, 3, punnamada],

  [101, 'pallathuruthy-mist', SEWAGE, 850, kumarakom],
  [58.4, 'pallathuruthy-mist', SOLID, 5, punnamada],
  [26, 'pallathuruthy-mist', SEWAGE, 900, centralLake],
  [3.1, 'pallathuruthy-mist', SOLID, 4, punnamada],

  [94, 'nedumudy-swan', SOLID, 3, punnamada],
  [38.2, 'nedumudy-swan', SEWAGE, 620, kumarakom, true],
  [5.4, 'nedumudy-swan', SOLID, 4, punnamada, true],

  [83.1, 'kainakary-lotus', SOLID, 4, punnamada],
  [47, 'kainakary-lotus', SEWAGE, 780, hBlockPickup],
  [13.4, 'kainakary-lotus', SOLID, 3, punnamada],

  [79.3, 'muhamma-moon', SOLID, 5, punnamada],
  [24, 'muhamma-moon', SEWAGE, 1050, kumarakom],
  [7.2, 'muhamma-moon', OIL, 7, centralLake],

  [92, 'chavara-grace', SOLID, 3, punnamada],
  [54.4, 'chavara-grace', SEWAGE, 580, kumarakom],
  [10.2, 'chavara-grace', SOLID, 3, punnamada],
];

function sampleEntry(now, [daysAgo, boatId, kind, amount, site, hasReceipt = false]) {
  const id = randomUUID();
  const at = new Date(now.getTime() - daysAgo * DAY_MS).toISOString();
  const quantity = `${amount} ${kind === SOLID ? 'bags' : 'litres'}`;
  const waste = { [SEWAGE]: 'toilet tank waste', [SOLID]: 'dry waste', [OIL]: 'used engine oil' };
  const summaryEn = `Handed over ${quantity} of ${waste[kind]} ${site.id ? 'at' : 'to'} ${site.name}.`;
  const location = site.lat === undefined ? null : { lat: site.lat, lon: site.lon, accuracy: 15 };
  const method = site.method ?? 'collection_point';
  return {
    id,
    boatId,
    at,
    kind,
    summaryEn,
    quantity,
    method,
    handedTo: site.method ? site.name : null,
    facilityMentioned: site.name,
    heard: { original: summaryEn, language: 'en-IN', english: summaryEn },
    location,
    verification: verify({ kind, method, location, facilities: FACILITIES, hasReceipt }),
    photo: hasReceipt ? {
      file: `${id}.png`, isReceipt: true, issuer: site.name,
      date: at.slice(0, 10), amount: quantity, caption: 'Sample receipt placeholder',
    } : null,
    source: 'sample',
  };
}

export async function seed(store, now = new Date()) {
  for (const facility of FACILITIES) await store.addFacility(facility);
  for (const boat of BOATS) await store.addBoat(boat);

  const entries = HANDOVERS.map((handover) => sampleEntry(now, handover));
  entries.sort((a, b) => a.at.localeCompare(b.at));
  for (const entry of entries) {
    if (entry.photo) {
      await saveWithPhoto(store.uploadsDir, entry.photo.file, SAMPLE_PHOTO, () => store.addEntry(entry));
    } else {
      await store.addEntry(entry);
    }
  }

  const reports = [
    {
      daysAgo: 9, reviewedDaysAgo: 8,
      note: 'Sample report: a visitor saw what looked like litter near the jetty.',
      description: 'Sample scenario: the review found floating leaves.',
      location: { lat: 9.529, lon: 76.36, accuracy: 22 },
      plausibleWasteInWater: false,
    },
    {
      daysAgo: 2, reviewedDaysAgo: null,
      note: 'Sample report: a visitor spotted floating plastic in the lake.',
      description: 'Sample scenario: two plastic bottles were reported near the shore.',
      location: { lat: 9.544, lon: 76.373, accuracy: 18 },
      plausibleWasteInWater: true,
    },
  ];
  for (const { daysAgo, reviewedDaysAgo, ...details } of reports) {
    const id = randomUUID();
    const file = `${id}.png`;
    await saveWithPhoto(store.uploadsDir, file, SAMPLE_PHOTO, () => store.addReport({
      ...details,
      id,
      boatId: null,
      at: new Date(now.getTime() - daysAgo * DAY_MS).toISOString(),
      reviewedAt: reviewedDaysAgo === null ? null : new Date(now.getTime() - reviewedDaysAgo * DAY_MS).toISOString(),
      photo: { file, mime: 'image/png' },
    }));
  }
}
