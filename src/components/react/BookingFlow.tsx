import { useEffect, useMemo, useState } from 'react';
import { formatPriceLabel, type PriceDisplay } from '../../lib/format';
import { formatDate, parseLocalDateTime, TIMEZONE } from '../../lib/datetime';
import { toast } from '../../lib/toast';
import { useBookingBusiness } from '../../hooks/useBookingBusiness';
import { buildClientToStudioMessage, buildWhatsAppUrl } from '../../lib/whatsapp';
import { optimizeImage } from '../../lib/image-upload';

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  priceDisplay: PriceDisplay;
};

type Flash = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  durationMin: number;
  priceCents: number;
  priceDisplay: PriceDisplay;
  reserved: boolean;
};

type Selection = {
  kind: 'service' | 'flash';
  serviceId: string;
  flashDesignId?: string;
  name: string;
  durationMin: number;
  priceCents: number;
  priceDisplay: PriceDisplay;
  imageUrl?: string;
};

type BookingFlowProps = {
  initialServiceId?: string;
  initialFlashId?: string;
};

function pickServiceForFlash(services: Service[], flashDuration: number): Service | null {
  if (services.length === 0) return null;
  const suitable = services
    .filter((s) => s.durationMin >= flashDuration)
    .sort((a, b) => a.durationMin - b.durationMin);
  return suitable[0] ?? [...services].sort((a, b) => a.durationMin - b.durationMin)[0];
}

async function uploadReferenceImage(file: File, businessSlug: string): Promise<string> {
  const optimized = await optimizeImage(file);
  const formData = new FormData();
  formData.append('file', optimized);
  formData.append('businessSlug', businessSlug);
  formData.append('kind', 'reference');
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Error al subir la imagen');
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function BookingFlow({ initialServiceId, initialFlashId }: BookingFlowProps) {
  const { businessName, whatsappNumber } = useBookingBusiness();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [businessSlug, setBusinessSlug] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    bodyZone: '',
    sizeNotes: '',
    styleNotes: '',
    description: '',
  });
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectionQuery = useMemo(() => {
    if (!selection) return '';
    const params = new URLSearchParams({ serviceId: selection.serviceId });
    if (selection.flashDesignId) params.set('flashDesignId', selection.flashDesignId);
    return params.toString();
  }, [selection]);

  useEffect(() => {
    Promise.all([fetch('/api/services'), fetch('/api/flash'), fetch('/api/business')])
      .then(async ([servicesRes, flashRes, bizRes]) => {
        const servicesData = await servicesRes.json();
        const flashData = await flashRes.json();
        const bizData = await bizRes.json();
        const svcList: Service[] = servicesData.services ?? [];
        const flashList: Flash[] = flashData.flash ?? flashData.flashes ?? [];
        setServices(svcList);
        setFlashes(flashList);
        setBusinessSlug(bizData.business?.slug ?? '');

        if (initialFlashId) {
          const f = flashList.find((x) => x.id === initialFlashId);
          const svc = f ? pickServiceForFlash(svcList, f.durationMin) : null;
          if (f && svc) {
            setSelection({
              kind: 'flash',
              serviceId: svc.id,
              flashDesignId: f.id,
              name: f.title,
              durationMin: f.durationMin,
              priceCents: f.priceCents,
              priceDisplay: f.priceDisplay,
              imageUrl: f.imageUrl,
            });
            setStep(2);
          }
        } else if (initialServiceId) {
          const s = svcList.find((x) => x.id === initialServiceId);
          if (s) {
            setSelection({
              kind: 'service',
              serviceId: s.id,
              name: s.name,
              durationMin: s.durationMin,
              priceCents: s.priceCents,
              priceDisplay: s.priceDisplay,
            });
            setStep(2);
          }
        }
      })
      .catch(() => toast.error('No se pudo cargar la información de reservas'));
  }, [initialServiceId, initialFlashId]);

  useEffect(() => {
    if (!selection) {
      setAvailableDates([]);
      return;
    }
    setDatesLoading(true);
    setAvailableDates([]);
    setDate('');
    setTime('');
    fetch(`/api/slots?${selectionQuery}`)
      .then((r) => r.json())
      .then((d) => {
        const dates = d.dates ?? [];
        setAvailableDates(dates);
        if (dates.length === 0) toast.info('No hay fechas disponibles por el momento');
      })
      .catch(() => {
        setAvailableDates([]);
        toast.error('No se pudieron cargar las fechas disponibles');
      })
      .finally(() => setDatesLoading(false));
  }, [selection, selectionQuery]);

  useEffect(() => {
    if (!selection || !date) return;
    setSlotsLoading(true);
    setSlots([]);
    setTime('');
    fetch(`/api/slots?date=${date}&${selectionQuery}`)
      .then((r) => r.json())
      .then((d) => {
        const nextSlots = d.slots ?? [];
        setSlots(nextSlots);
        if (nextSlots.length === 0) toast.info('No hay horarios disponibles ese día');
      })
      .catch(() => {
        setSlots([]);
        toast.error('No se pudieron cargar los horarios');
      })
      .finally(() => setSlotsLoading(false));
  }, [selection, date, selectionQuery]);

  function selectService(s: Service) {
    setSelection({
      kind: 'service',
      serviceId: s.id,
      name: s.name,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      priceDisplay: s.priceDisplay,
    });
    setStep(2);
  }

  function selectFlash(f: Flash) {
    const svc = pickServiceForFlash(services, f.durationMin);
    if (!svc) {
      toast.error('No hay servicios configurados para reservar este flash');
      return;
    }
    setSelection({
      kind: 'flash',
      serviceId: svc.id,
      flashDesignId: f.id,
      name: f.title,
      durationMin: f.durationMin,
      priceCents: f.priceCents,
      priceDisplay: f.priceDisplay,
      imageUrl: f.imageUrl,
    });
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selection) return;
    setSubmitting(true);
    try {
      let referenceImageUrl: string | null = null;
      if (referenceFile) {
        try {
          referenceImageUrl = await uploadReferenceImage(referenceFile, businessSlug);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen de referencia');
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selection.serviceId,
          flashDesignId: selection.flashDesignId ?? null,
          date,
          time,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          instagramHandle: form.instagram.trim().replace(/^@/, '') || null,
          bodyZone: form.bodyZone.trim() || null,
          sizeNotes: form.sizeNotes.trim() || null,
          styleNotes: form.styleNotes.trim() || null,
          description: form.description.trim() || null,
          referenceImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Error al enviar la solicitud');
        return;
      }
      toast.success('¡Solicitud enviada! Te confirmaremos a la brevedad.');
      setSuccess(true);
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleStudioWhatsApp() {
    if (!selection || !whatsappNumber) return;
    const startAt = parseLocalDateTime(date, time);
    const message = buildClientToStudioMessage({
      businessName,
      serviceName: selection.name,
      startAt,
      flashTitle: selection.kind === 'flash' ? selection.name : null,
      bodyZone: form.bodyZone,
      sizeNotes: form.sizeNotes,
      description: form.description,
      instagramHandle: form.instagram.replace(/^@/, '') || null,
      email: form.email,
      phone: form.phone,
    });
    window.open(buildWhatsAppUrl(whatsappNumber, message), '_blank', 'noopener,noreferrer');
  }

  if (success) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-success/40 text-3xl text-success">
          ✓
        </div>
        <h2 className="font-heading text-4xl font-semibold">¡Solicitud enviada!</h2>
        <p className="mt-3 text-muted">
          Tu turno para <span className="text-ink">{selection?.name}</span> quedó como <strong>pendiente</strong>.
          {date && time && (
            <>
              {' '}
              Propuesta: {formatDate(parseLocalDateTime(date, time))} a las {time}.
            </>
          )}
          {' '}Te avisaremos cuando esté confirmado.
        </p>
        {whatsappNumber && (
          <button
            type="button"
            onClick={handleStudioWhatsApp}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-whatsapp px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Enviar detalles por WhatsApp
          </button>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/mis-reservas" className="btn-secondary">Ver mis reservas</a>
          <a href="/" className="btn-ghost">Volver al inicio</a>
        </div>
      </div>
    );
  }

  const stepTitles = ['Elegí diseño o servicio', 'Elegí fecha', 'Elegí horario', 'Tus datos'];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <div className="mb-6 flex items-center gap-3">
          <span className="step-badge">{step}</span>
          <h2 className="font-heading text-2xl font-semibold">{stepTitles[step - 1]}</h2>
        </div>

        <div className="mb-6 flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-accent' : 'bg-border'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-8">
            {flashes.length > 0 && (
              <div>
                <h3 className="label-mono mb-3">Flash disponibles</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {flashes.map((f) => {
                    const price = formatPriceLabel(f.priceCents, f.priceDisplay);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={f.reserved}
                        onClick={() => selectFlash(f)}
                        className="gallery-item flex flex-col text-left disabled:opacity-40"
                      >
                        <div className="aspect-square w-full overflow-hidden">
                          <img src={f.imageUrl} alt={f.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-2">
                          <p className="truncate text-sm font-medium">{f.title}</p>
                          <p className="text-xs text-muted">
                            {f.reserved ? 'Reservado' : price ?? `${f.durationMin} min`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {services.length > 0 && (
              <div>
                <h3 className="label-mono mb-3">Servicios</h3>
                <div className="space-y-3">
                  {services.map((s) => {
                    const price = formatPriceLabel(s.priceCents, s.priceDisplay);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectService(s)}
                        className="w-full border border-border bg-surface p-4 text-left transition hover:border-accent"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="font-medium">{s.name}</span>
                            {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
                            <p className="mt-1 text-xs text-muted">{s.durationMin} min</p>
                          </div>
                          {price && <span className="shrink-0 text-sm text-muted">{price}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {services.length === 0 && flashes.length === 0 && (
              <p className="text-muted">No hay opciones disponibles por el momento.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{selection?.name}</p>
            {datesLoading ? (
              <p className="text-muted">Buscando fechas disponibles...</p>
            ) : availableDates.length === 0 ? (
              <p className="text-muted">No hay fechas disponibles. Probá más tarde.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableDates.map((d) => {
                  const label = parseLocalDateTime(d, '12:00').toLocaleDateString('es-AR', {
                    timeZone: TIMEZONE,
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDate(d);
                        setStep(3);
                      }}
                      className="slot-btn"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            <button type="button" onClick={() => setStep(1)} className="btn-ghost text-sm">
              ← Atrás
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{selection?.name}</p>
            {slotsLoading ? (
              <p className="text-muted">Cargando horarios...</p>
            ) : slots.length === 0 ? (
              <p className="text-muted">No hay horarios disponibles ese día.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setTime(slot);
                      setStep(4);
                    }}
                    className={`slot-btn ${time === slot ? 'slot-btn-selected' : ''}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setStep(2)} className="btn-ghost text-sm">
              ← Atrás
            </button>
          </div>
        )}

        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted">
              {selection?.name} · {date} · {time}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-mono mb-1 block" htmlFor="name">
                  Nombre completo
                </label>
                <input id="name" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label-mono mb-1 block" htmlFor="email">
                  Email
                </label>
                <input id="email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label-mono mb-1 block" htmlFor="phone">
                  Teléfono
                </label>
                <input id="phone" type="tel" required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="2211234567" />
              </div>
              <div>
                <label className="label-mono mb-1 block" htmlFor="instagram">
                  Instagram (opcional)
                </label>
                <input id="instagram" value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} className="input-field" placeholder="@usuario" />
              </div>
              <div>
                <label className="label-mono mb-1 block" htmlFor="bodyZone">
                  Zona del cuerpo
                </label>
                <input id="bodyZone" value={form.bodyZone} onChange={(e) => setForm((f) => ({ ...f, bodyZone: e.target.value }))} className="input-field" placeholder="Antebrazo, pierna..." />
              </div>
              <div>
                <label className="label-mono mb-1 block" htmlFor="sizeNotes">
                  Tamaño aprox.
                </label>
                <input id="sizeNotes" value={form.sizeNotes} onChange={(e) => setForm((f) => ({ ...f, sizeNotes: e.target.value }))} className="input-field" placeholder="10 cm, palma de la mano..." />
              </div>
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="styleNotes">
                Estilo
              </label>
              <input id="styleNotes" value={form.styleNotes} onChange={(e) => setForm((f) => ({ ...f, styleNotes: e.target.value }))} className="input-field" placeholder="Fine line, blackwork, color..." />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="description">
                Contanos tu idea
              </label>
              <textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field min-h-[90px]" />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="reference">
                Imagen de referencia (opcional)
              </label>
              <input
                id="reference"
                type="file"
                accept="image/*,.heic,.heif"
                onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
                className="input-field"
              />
              {referenceFile && <p className="mt-1 text-xs text-muted">{referenceFile.name}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="btn-secondary">
                Atrás
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
            <p className="text-xs text-muted">
              Tu turno quedará <strong>pendiente</strong> hasta que el estudio lo confirme.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
