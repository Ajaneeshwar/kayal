import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import { Button } from '../../components/Button.tsx';
import { MethodIcon, type Method } from '../../components/MethodIcon.tsx';
import { Bi } from '../../components/Bi.tsx';
import { usePick } from '../../i18n/language.ts';
import { fill } from '../boat/data.ts';
import { addBoat, addFacility, addOperator, type Boat, type Facility, type Operator, type OperatorType, type Waste } from './api.ts';
import { Dialog, Field, FormError, inputClass } from './Dialog.tsx';
import { WASTE_LABELS } from './format.ts';
import type { MapView } from './MapPanel.tsx';
import { d } from './i18n.ts';
import type { DashKey } from './strings.ts';

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

/** Receiver types, in the order the inspector meets them, with the icon and label each one uses. */
export const RECEIVER_TYPES: { type: OperatorType; icon: Method; label: DashKey }[] = [
  { type: 'plant', icon: 'collection_point', label: 'receiverPlant' },
  { type: 'suction_truck', icon: 'suction_truck', label: 'methodTruck' },
  { type: 'mobile_pump', icon: 'mobile_pump', label: 'receiverPump' },
  { type: 'waste_collector', icon: 'waste_collector', label: 'methodCollector' },
];

// No 0, O, 1, I or L, so a code read aloud or copied by hand comes out the same.
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_LETTERS[b % CODE_LETTERS.length]).join('');
}

const CODE_RULE = /^[A-Za-z0-9-]{4,8}$/;
const VEHICLE_RULE = /^[A-Za-z0-9 -]{1,40}$/;

export function AddReceiverDialog({ facilities, onClose, onAdded }: { facilities: Facility[]; onClose: () => void; onAdded: (op: Operator) => void }) {
  const pick = usePick();
  const plants = facilities.filter((f) => f.accepts.includes('sewage'));
  const [name, setName] = useState('');
  const [type, setType] = useState<OperatorType>('plant');
  const [facilityId, setFacilityId] = useState(plants[0]?.id ?? '');
  const [vehicle, setVehicle] = useState('');
  const [code, setCode] = useState(newCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ operator: Operator; code: string } | null>(null);
  const needsVehicle = type === 'suction_truck' || type === 'mobile_pump';

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (!name.trim()) return setError('Enter the receiver’s name.');
    if (type === 'plant' && !facilityId) return setError('Choose the collection point this desk works at.');
    if (needsVehicle && !VEHICLE_RULE.test(vehicle.trim())) return setError('Enter the vehicle number with letters, digits, spaces or hyphens, as in KL-04-AB-1234.');
    if (!CODE_RULE.test(trimmedCode)) return setError('Use a sign-in code of 4 to 8 letters or digits, or press Generate.');
    setBusy(true);
    setError(null);
    try {
      const { operator } = await addOperator({
        name: name.trim(),
        type,
        ...(type === 'plant' ? { facilityId } : {}),
        ...(needsVehicle ? { vehicleNumber: vehicle.trim() } : {}),
        code: trimmedCode,
      });
      setAdded({ operator, code: trimmedCode });
      onAdded(operator);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (added) {
    const kind = RECEIVER_TYPES.find((r) => r.type === added.operator.type) ?? RECEIVER_TYPES[0];
    const where = added.operator.vehicleNumber ?? facilities.find((f) => f.id === added.operator.facilityId)?.name ?? null;
    return (
      <Dialog title={fill(d('receiverAdded'), { name: added.operator.name })} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/20 text-gold-ink">
              <MethodIcon method={kind.icon} size={22} />
            </span>
            <div className="min-w-0">
              <p className="break-words font-semibold leading-snug">{added.operator.name}</p>
              <p className="text-caption text-ink-muted">
                {[pick(d(kind.label)), where].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="rounded-control border border-dashed border-gold-edge bg-white/60 px-4 py-4 text-center">
            <p className="text-caption font-semibold text-ink-muted">Sign-in code</p>
            <p className="mt-1 select-all font-display text-[2rem] font-semibold leading-none tracking-[0.18em] tabular-nums">{added.code}</p>
          </div>
          <div className="space-y-1">
            <Bi as="p" text={d('receiverCodeNote')} className="text-small" mlClassName="mt-0.5 text-ink-muted" />
            <p className="text-small text-ink-muted">
              They sign in at <span className="font-semibold text-ink">/operator</span>, choose their name and enter the code.
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={onClose}>
              <Bi text={d('callDone')} layout="inline" />
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={d('addReceiver')} subtitle="A receiver confirms the handovers a boat logs with them." onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus placeholder="Kumarakom morning desk" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-small font-semibold">Type</legend>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            {RECEIVER_TYPES.map((r) => {
              const on = type === r.type;
              return (
                <label
                  key={r.type}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 text-small font-semibold transition-colors duration-150 has-focus-visible:outline-3 has-focus-visible:outline-focus ${
                    on ? 'border-gold-ink bg-gold/25 text-ink' : 'border-field-border text-ink-muted hover:border-ink-muted'
                  } py-1.5`}
                >
                  <input type="radio" name="receiver-type" className="sr-only" checked={on} onChange={() => { setType(r.type); setError(null); }} />
                  <MethodIcon method={r.icon} size={18} className={on ? 'text-gold-ink' : ''} />
                  <Bi text={d(r.label)} className="min-w-0 leading-snug" mlClassName="text-caption font-medium" />
                </label>
              );
            })}
          </div>
        </fieldset>
        {type === 'plant' && (
          <Field label="Collection point" hint={plants.length ? 'Only points that take sewage are listed.' : undefined}>
            {plants.length ? (
              <span className="relative block">
                <select className={`${inputClass} appearance-none pe-10`} value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                  {plants.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.open ? '' : ' (closed now)'}
                    </option>
                  ))}
                </select>
                <svg viewBox="0 0 16 16" className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </span>
            ) : (
              <span className="block rounded-control bg-surface px-3.5 py-2.5 text-small text-ink-muted">No collection point takes sewage yet. Add one first.</span>
            )}
          </Field>
        )}
        {needsVehicle && (
          <Field label="Vehicle number">
            <input className={`${inputClass} uppercase tabular-nums placeholder:normal-case`} value={vehicle} onChange={(e) => setVehicle(e.target.value)} maxLength={40} required placeholder="KL-04-AB-1234" />
          </Field>
        )}
        <Field label="Sign-in code" hint="4 to 8 letters or digits. The receiver types it to sign in.">
          <span className="flex gap-2">
            <input
              className={`${inputClass} min-w-0 flex-1 font-semibold uppercase tracking-[0.18em] tabular-nums`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              maxLength={8}
              required
              autoComplete="off"
              spellCheck={false}
            />
            <Button variant="secondary" className="shrink-0 px-4" onClick={() => setCode(newCode())}>
              Generate
            </Button>
          </span>
        </Field>
        <FormError message={error} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy} disabled={type === 'plant' && !plants.length}>
            Add receiver
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
