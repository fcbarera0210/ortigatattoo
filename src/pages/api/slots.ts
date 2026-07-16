import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getActiveBusiness } from '../../lib/business';
import { buildSlotContext, getAvailableBookingDates } from '../../lib/booking/conflicts';
import { computeAvailableSlots } from '../../lib/booking/slots';
import { db } from '../../lib/db';
import { flashDesigns } from '../../lib/db/schema';
import { checkRateLimit } from '../../lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const ip = clientAddress ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Espera un momento.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const date = url.searchParams.get('date');
  const serviceId = url.searchParams.get('serviceId');
  const flashDesignId = url.searchParams.get('flashDesignId');
  const excludeBookingId = url.searchParams.get('excludeBookingId') ?? undefined;

  if (!serviceId) {
    return new Response(JSON.stringify({ error: 'serviceId requerido' }), { status: 400 });
  }

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  let durationMin: number | undefined;
  if (flashDesignId) {
    const [flash] = await db
      .select()
      .from(flashDesigns)
      .where(eq(flashDesigns.id, flashDesignId))
      .limit(1);

    if (!flash || flash.businessId !== biz.id || !flash.active) {
      return new Response(JSON.stringify({ error: 'Diseño flash no disponible' }), { status: 404 });
    }
    durationMin = flash.durationMin;
  }

  const options = { durationMin, excludeBookingId };

  if (!date) {
    const dates = await getAvailableBookingDates(biz.id, serviceId, options);
    return new Response(
      JSON.stringify({ serviceId, flashDesignId, dates, maxAdvanceDays: biz.maxAdvanceDays }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const ctx = await buildSlotContext(biz.id, date, serviceId, options);
  if (!ctx) {
    return new Response(JSON.stringify({ error: 'Servicio no encontrado' }), { status: 404 });
  }

  const slots = computeAvailableSlots(ctx);

  return new Response(
    JSON.stringify({ date, serviceId, flashDesignId, slots, maxAdvanceDays: biz.maxAdvanceDays }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
