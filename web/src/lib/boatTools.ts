import type { Boat, Level } from '../pages/dashboard/api.ts';
import { en as dashboard } from '../pages/dashboard/strings.ts';
import { en as boatStrings } from '../pages/boat/strings.ts';
import { en as shared } from '../i18n/strings.ts';

export interface SearchableBoat {
  name: string;
  registration: string;
  status: { state: string };
}

export function filterBoats<T extends SearchableBoat>(boats: readonly T[], query: string, state = 'all'): T[] {
  const term = query.trim().toLocaleLowerCase();
  return boats.filter((boat) =>
    (state === 'all' || boat.status.state === state) &&
    (!term || boat.name.toLocaleLowerCase().includes(term) || boat.registration.toLocaleLowerCase().includes(term)),
  );
}

const PROOF: Record<Level, string> = { receipt: boatStrings.levelReceipt, location: boatStrings.levelLocation, declared: boatStrings.levelDeclared };

function csvCell(value: string | number | null | undefined) {
  let text = String(value ?? '');
  if (typeof value === 'string' && (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function boatsCsv(boats: readonly Boat[]): string {
  const rows: (string | number | null | undefined)[][] = [[
    dashboard.csvName, dashboard.csvRegistration, dashboard.csvState, dashboard.csvDays,
    dashboard.csvSewageDate, dashboard.csvSewageProof, dashboard.csvSewagePlace,
    dashboard.csvSolidDate, dashboard.csvSolidProof, dashboard.csvSolidPlace,
  ]];
  for (const boat of boats) {
    const { lastSewage: sewage, lastSolid: solid } = boat.status;
    rows.push([
      boat.name, boat.registration, shared[boat.status.state], sewage?.daysAgo,
      sewage?.at, sewage ? PROOF[sewage.level] : '', sewage?.facilityName,
      solid?.at, solid ? PROOF[solid.level] : '', solid?.facilityName,
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
