/*
  How waste was handed over, shared by the crew page, the boat record and the dashboard.
  Labels live in each page's strings.ts, so each page translates its own words.
*/

export type Method = 'collection_point' | 'suction_truck' | 'mobile_pump' | 'waste_collector' | 'waste_bin';

/** Older entries carry no method and read as a collection point (docs/API.md). */
export function methodOf(entry: { method?: Method | null }): Method {
  return entry.method ?? 'collection_point';
}

/** A truck, pump or collector: someone took the waste, so a slip or a number plate can prove it. */
export function isMobileHandover(method: Method) {
  return method === 'suction_truck' || method === 'mobile_pump' || method === 'waste_collector';
}

const PATHS: Record<Method, string[]> = {
  // A treatment plant: a building with a stack, on the ground line.
  collection_point: ['M3 20h18', 'M5 20V11l4.5 2.5V11l4.5 2.5V7.5h4.5V20', 'M15.5 7.5V4.5h2V7.5'],
  // A suction tanker: a round tank on a chassis, a cab and two wheels.
  suction_truck: [
    'M2.5 16V10.5a3.5 3.5 0 0 1 3.5-3.5h5.5a3.5 3.5 0 0 1 3.5 3.5V16',
    'M15 10h3.2l3.3 3.6V16',
    'M2.5 16h2.2M9.8 16h5.4M20.2 16h1.3',
    'M7.25 18.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5zM17.75 18.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z',
  ],
  // A pump on a small boat, with its hose.
  mobile_pump: ['M2.5 14.5h19l-2.6 4.5H5.1z', 'M6.5 14.5V9.5h6v5', 'M12.5 11.5h3.5a2 2 0 0 1 2 2v1', 'M8.5 9.5V7.5h2v2'],
  // A person with a sack.
  waste_collector: [
    'M8.5 8.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5z',
    'M3.5 20.5v-4a5 5 0 0 1 8.4-3.6',
    'M14 12.5h6.5l-.9 8h-4.7z',
    'M15.8 12.5a1.45 1.45 0 0 1 2.9 0',
  ],
  // A bin with a lid.
  waste_bin: ['M4.5 7h15', 'M9.5 7V4.5h5V7', 'M6.5 7l1 13.5h9l1-13.5', 'M10 11v6M14 11v6'],
};

/** One outline icon per handover method, drawn in the text colour. */
export function MethodIcon({ method, size = 18, className = '' }: { method: Method; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {PATHS[method].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
