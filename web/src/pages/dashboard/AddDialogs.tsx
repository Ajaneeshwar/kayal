import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import { Button } from '../../components/Button.tsx';
import { addBoat, addFacility, type Boat, type Facility, type Waste } from './api.ts';
import { Dialog, Field, FormError, inputClass } from './Dialog.tsx';
import { WASTE_LABELS } from './format.ts';
import type { MapView } from './MapPanel.tsx';
import { d } from './i18n.ts';

export function AddBoatDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (boat: Boat) => void }) {
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { boat } = await addBoat(name.trim(), registration.trim());
      onAdded(boat);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog title={d('addBoat')} subtitle="The boat starts as overdue until its first pump-out is logged." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Boat name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus placeholder="Kayal Rani" />
        </Field>
        <Field label="Registration number">
          <input className={inputClass} value={registration} onChange={(e) => setRegistration(e.target.value)} maxLength={40} required placeholder="ALP-0101" />
        </Field>
        <FormError message={error} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Add boat
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const WASTES: Waste[] = ['sewage', 'solid', 'oil'];

function PickMap({ view, value, onPick }: { view: MapView; value: L.LatLngTuple; onPick: (p: L.LatLngTuple) => void }) {
  const node = useRef<HTMLDivElement>(null);
  const marker = useRef<L.Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!node.current) return;
    const m = L.map(node.current, { zoomControl: true, attributionControl: false }).setView(view.centre, view.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(m);
    const icon = L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: '<span class="kl-fac is-open is-new"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6c2.9 3.6 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2.1-5.4 5-9z"/></svg></span>' });
    marker.current = L.marker(value, { icon, draggable: true }).addTo(m);
    marker.current.on('dragend', () => {
      const p = marker.current!.getLatLng();
      pick.current([p.lat, p.lng]);
    });
    m.on('click', (e: L.LeafletMouseEvent) => {
      marker.current?.setLatLng(e.latlng);
      pick.current([e.latlng.lat, e.latlng.lng]);
    });
    const t = window.setTimeout(() => m.invalidateSize(), 300);
    return () => {
      window.clearTimeout(t);
      m.remove();
    };
    // Built once; the marker moves itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={node} className="kl-map h-56 w-full overflow-hidden rounded-control border border-field-border" />;
}

export function AddPointDialog({ view, onClose, onAdded }: { view: MapView; onClose: () => void; onAdded: (f: Facility) => void }) {
  const [name, setName] = useState('');
  const [accepts, setAccepts] = useState<Waste[]>(['sewage']);
  const [at, setAt] = useState<L.LatLngTuple>(view.centre);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!accepts.length) return setError('Choose at least one kind of waste this point takes.');
    setBusy(true);
    setError(null);
    try {
      const { facility } = await addFacility({ name: name.trim(), lat: at[0], lon: at[1], accepts });
      onAdded(facility);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const toggle = (w: Waste) => setAccepts((list) => (list.includes(w) ? list.filter((x) => x !== w) : [...list, w]));

  return (
    <Dialog title={d('addPoint')} subtitle="Click the map or drag the marker to where boats hand over waste." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus placeholder="Punnamada jetty pump-out" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-small font-semibold">Takes</legend>
          <div className="flex flex-wrap gap-2">
            {WASTES.map((w) => {
              const on = accepts.includes(w);
              return (
                <label
                  key={w}
                  className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill border px-3.5 text-small font-semibold transition-colors duration-150 has-focus-visible:outline-3 has-focus-visible:outline-focus ${
                    on ? 'border-gold-ink bg-gold/25 text-ink' : 'border-field-border text-ink-muted hover:border-ink-muted'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(w)} />
                  <span aria-hidden="true" className={`grid size-4 place-items-center rounded-full border ${on ? 'border-gold-ink bg-gold-ink text-kasavu' : 'border-field-border'}`}>
                    {on && (
                      <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 6.2l2.2 2.2 4.8-5" />
                      </svg>
                    )}
                  </span>
                  {WASTE_LABELS[w]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div>
          <PickMap view={view} value={at} onPick={setAt} />
          <p className="mt-1.5 text-caption tabular-nums text-ink-muted">
            {at[0].toFixed(5)}, {at[1].toFixed(5)} · boats within 400 m count as here
          </p>
        </div>
        <FormError message={error} />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Add point
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
