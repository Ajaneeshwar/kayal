import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Boat, Entry, Facility } from './api.ts';
import { KIND_LABELS, LEVEL_LABELS, LEVEL_TONE, WASTE_LABELS, ago, esc, whereText } from './format.ts';

const ALAPPUZHA: L.LatLngTuple = [9.53, 76.38];
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** A brass token for a collection point: a drop when open, struck through when closed. */
function facilityIcon(f: Facility) {
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
    html: `<span class="kl-fac ${f.open ? 'is-open' : 'is-closed'}" aria-label="${esc(f.name)}, ${f.open ? 'open' : 'closed'}">
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6c2.9 3.6 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2.1-5.4 5-9z"/>${
        f.open ? '' : '<path class="kl-fac-x" d="M3.5 16.5 16.5 3.5"/>'
      }</svg></span>`,
  });
}

function entryIcon(e: Entry, fresh: boolean) {
  const tone = LEVEL_TONE[e.verification.level];
  return L.divIcon({
    className: '',
    iconSize: [16, 16],
    // Entries logged at a point sit on the token's lower edge instead of hiding under it.
    iconAnchor: [-2, -2],
    html: `<span class="kl-entry is-${tone}${fresh ? ' is-fresh' : ''}"></span>`,
  });
}

function facilityPopup(f: Facility) {
  return `<div class="kl-pop"><strong>${esc(f.name)}</strong>
    <span class="kl-pop-meta">${f.open ? 'Open' : 'Closed'} · ${esc(f.accepts.map((a) => WASTE_LABELS[a]).join(', '))}</span>
    ${f.operator ? `<span class="kl-pop-meta">${esc(f.operator)}</span>` : ''}
    ${f.note ? `<span class="kl-pop-note">${esc(f.note)}</span>` : ''}</div>`;
}

function entryPopup(e: Entry, boat: Boat | undefined) {
  return `<div class="kl-pop"><strong>${esc(boat?.name ?? 'Unknown boat')}</strong>
    <span class="kl-pop-meta">${esc(KIND_LABELS[e.kind])} · ${esc(ago(e.at))}</span>
    <span class="kl-pop-meta">${esc(LEVEL_LABELS[e.verification.level])} · ${esc(whereText(e))}</span></div>`;
}

interface Props {
  facilities: Facility[];
  entries: Entry[];
  boats: Map<string, Boat>;
  fresh: ReadonlySet<string>;
  /** Called with the map once, so the add-point dialog can start from its centre. */
  onCentre?: (centre: L.LatLngTuple) => void;
}

export function MapPanel({ facilities, entries, boats, fresh, onCentre }: Props) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const flown = useRef<string | null>(null);

  useEffect(() => {
    if (!node.current) return;
    const m = L.map(node.current, { zoomControl: false, scrollWheelZoom: true }).setView(ALAPPUZHA, 11);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.tileLayer(TILES, { maxZoom: 18, attribution: ATTRIBUTION }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;
    group.clearLayers();
    for (const f of facilities) {
      L.circle([f.lat, f.lon], {
        radius: f.radiusM,
        className: `kl-radius ${f.open ? 'is-open' : 'is-closed'}`,
        interactive: false,
      }).addTo(group);
      L.marker([f.lat, f.lon], { icon: facilityIcon(f), zIndexOffset: 500, keyboard: true, title: f.name })
        .bindPopup(facilityPopup(f))
        .addTo(group);
    }
    // Oldest first, so the newest entries draw on top.
    const located = entries.filter((e) => e.location).slice(0, 60).reverse();
    for (const e of located) {
      const isFresh = fresh.has(e.id);
      L.marker([e.location!.lat, e.location!.lon], { icon: entryIcon(e, isFresh), zIndexOffset: isFresh ? 1000 : 600 })
        .bindPopup(entryPopup(e, boats.get(e.boatId)))
        .addTo(group);
    }

    if (!fitted.current && facilities.length) {
      const points: L.LatLngTuple[] = facilities.map((f) => [f.lat, f.lon]);
      m.fitBounds(L.latLngBounds(points).pad(0.3), { maxZoom: 13 });
      fitted.current = true;
      const c = m.getCenter();
      onCentre?.([c.lat, c.lng]);
    }

    // Bring a newly arrived entry into view, so the room sees it land.
    const newest = entries.find((e) => fresh.has(e.id) && e.location);
    if (newest && flown.current !== newest.id) {
      flown.current = newest.id;
      const at = L.latLng(newest.location!.lat, newest.location!.lon);
      if (!m.getBounds().pad(-0.1).contains(at)) m.flyTo(at, Math.max(m.getZoom(), 12), { duration: 1.1 });
    }
  }, [facilities, entries, boats, fresh, onCentre]);

  return <div ref={node} className="kl-map size-full" role="region" aria-label="Map of collection points and recent entries" />;
}
