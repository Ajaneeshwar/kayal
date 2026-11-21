const DAY_MS = 86_400_000;

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
];

function sampleEntry(now, { boatId, daysAgo, kind, summaryEn, quantity = null, facility = null, level }) {
  return {
    boatId,
    at: new Date(now.getTime() - daysAgo * DAY_MS).toISOString(),
    kind,
    summaryEn,
    quantity,
    facilityMentioned: facility?.name ?? null,
    heard: { original: summaryEn, language: 'en-IN', english: summaryEn },
    location: facility ? { lat: facility.lat, lon: facility.lon, accuracy: 15 } : null,
    verification: facility
      ? { level, facilityId: facility.id, facilityName: facility.name, distanceM: 0, reason: null }
      : { level: 'declared', facilityId: null, facilityName: null, distanceM: null, reason: 'no_location' },
    photo: null,
    source: 'sample',
  };
}

export async function seed(store, now = new Date()) {
  for (const facility of FACILITIES) await store.addFacility(facility);
  for (const boat of BOATS) await store.addBoat(boat);

  const [kumarakom, , , punnamada] = FACILITIES;
  const drafts = [
    { boatId: 'punnamada-star', daysAgo: 130, kind: 'sewage_pumpout', summaryEn: 'Emptied the toilet tank at the Kumarakom plant.', facility: kumarakom, level: 'location' },
    { boatId: 'vembanad-queen', daysAgo: 35, kind: 'sewage_pumpout', summaryEn: 'Gave the toilet tank waste to a private tanker.', quantity: '1000 litres' },
    { boatId: 'kayal-rani', daysAgo: 12, kind: 'sewage_pumpout', summaryEn: 'Emptied the toilet tank at the Kumarakom plant.', quantity: '800 litres', facility: kumarakom, level: 'receipt' },
    { boatId: 'kayal-rani', daysAgo: 1, kind: 'solid_waste', summaryEn: 'Handed over four bags of plastic and dry waste at Punnamada.', quantity: '4 bags', facility: punnamada, level: 'location' },
  ];
  for (const draft of drafts) await store.addEntry(sampleEntry(now, draft));
}
