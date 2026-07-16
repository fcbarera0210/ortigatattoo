import { formatDateTime } from './datetime';
import { formatPhoneForWhatsApp } from './phone';

export const DEFAULT_WHATSAPP_BOOKING_TEMPLATE =
  'Hola {nombre}, te escribo de *{negocio}* respecto a tu cita de *{servicio}* el {fecha}.';

export const DEFAULT_WHATSAPP_CLIENT_TEMPLATE =
  'Hola {nombre}, te escribo de *{negocio}*. ¿En qué puedo ayudarte?';

export const DEFAULT_CLIENT_TO_STUDIO_TEMPLATE = `Hola! Acabo de solicitar una reserva en *{negocio}*.

*Fecha:* {fecha}
*Servicio:* {servicio}
{flash}*Zona:* {zona}
*Tamaño:* {tamano}
*Descripción:* {descripcion}
*Instagram:* {instagram}
*Email:* {email}
*Tel:* {telefono}

Quedo atenta/o a la confirmación.`;

type TemplateVars = {
  nombre: string;
  negocio: string;
  servicio?: string;
  fecha?: string;
  flash?: string;
  zona?: string;
  tamano?: string;
  descripcion?: string;
  instagram?: string;
  email?: string;
  telefono?: string;
};

export function renderWhatsAppTemplate(
  template: string | null | undefined,
  vars: TemplateVars,
  fallback: string,
): string {
  const source = template?.trim() || fallback;
  return source
    .replaceAll('{nombre}', vars.nombre)
    .replaceAll('{negocio}', vars.negocio)
    .replaceAll('{servicio}', vars.servicio ?? '')
    .replaceAll('{fecha}', vars.fecha ?? '')
    .replaceAll('{flash}', vars.flash ?? '')
    .replaceAll('{zona}', vars.zona ?? '')
    .replaceAll('{tamano}', vars.tamano ?? '')
    .replaceAll('{descripcion}', vars.descripcion ?? '')
    .replaceAll('{instagram}', vars.instagram ?? '')
    .replaceAll('{email}', vars.email ?? '')
    .replaceAll('{telefono}', vars.telefono ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type BookingWhatsAppInput = {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  startAt: Date;
  businessName: string;
  template?: string | null;
};

type ClientWhatsAppInput = {
  clientName: string;
  businessName: string;
  template?: string | null;
};

export function buildBookingWhatsAppMessage(input: BookingWhatsAppInput): string {
  return renderWhatsAppTemplate(
    input.template,
    {
      nombre: input.clientName,
      negocio: input.businessName,
      servicio: input.serviceName,
      fecha: formatDateTime(input.startAt),
    },
    DEFAULT_WHATSAPP_BOOKING_TEMPLATE,
  );
}

export function buildClientWhatsAppMessage(input: ClientWhatsAppInput): string {
  return renderWhatsAppTemplate(
    input.template,
    {
      nombre: input.clientName,
      negocio: input.businessName,
    },
    DEFAULT_WHATSAPP_CLIENT_TEMPLATE,
  );
}

export function buildClientToStudioMessage(input: {
  businessName: string;
  serviceName: string;
  startAt: Date;
  flashTitle?: string | null;
  bodyZone?: string | null;
  sizeNotes?: string | null;
  description?: string | null;
  instagramHandle?: string | null;
  email: string;
  phone: string;
}): string {
  const flash = input.flashTitle ? `*Flash:* ${input.flashTitle}\n` : '';
  return renderWhatsAppTemplate(
    DEFAULT_CLIENT_TO_STUDIO_TEMPLATE,
    {
      nombre: '',
      negocio: input.businessName,
      servicio: input.serviceName,
      fecha: formatDateTime(input.startAt),
      flash,
      zona: input.bodyZone || '—',
      tamano: input.sizeNotes || '—',
      descripcion: input.description || '—',
      instagram: input.instagramHandle ? `@${input.instagramHandle}` : '—',
      email: input.email,
      telefono: input.phone,
    },
    DEFAULT_CLIENT_TO_STUDIO_TEMPLATE,
  );
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppUrl(phone: string, message: string): void {
  if (typeof window === 'undefined') return;
  window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
}
