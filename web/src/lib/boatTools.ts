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
