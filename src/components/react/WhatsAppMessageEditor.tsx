import { useRef, useState } from 'react';

export type WhatsAppVariable = {
  key: string;
  token: string;
  label: string;
  description: string;
};

export const BOOKING_WHATSAPP_VARIABLES: WhatsAppVariable[] = [
  { key: 'nombre', token: '{nombre}', label: 'nombre', description: 'Nombre del cliente al que escribes.' },
  { key: 'negocio', token: '{negocio}', label: 'negocio', description: 'Nombre de tu estudio.' },
  { key: 'servicio', token: '{servicio}', label: 'servicio', description: 'Nombre del servicio o flash reservado.' },
  { key: 'fecha', token: '{fecha}', label: 'fecha', description: 'Fecha y hora del turno formateada.' },
];

export const CLIENT_WHATSAPP_VARIABLES: WhatsAppVariable[] = [
  { key: 'nombre', token: '{nombre}', label: 'nombre', description: 'Nombre del cliente al que escribes.' },
  { key: 'negocio', token: '{negocio}', label: 'negocio', description: 'Nombre de tu estudio.' },
];

type WhatsAppMessageEditorProps = {
  label: string;
  value: string;
  placeholder: string;
  variables: WhatsAppVariable[];
  onChange: (value: string) => void;
};

function wrapWithMarker(
  value: string,
  start: number,
  end: number,
  marker: string,
): { next: string; cursorStart: number; cursorEnd: number } {
  const selected = value.slice(start, end);
  if (selected) {
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    return { next, cursorStart: start + marker.length, cursorEnd: end + marker.length };
  }
  const next = value.slice(0, start) + marker + marker + value.slice(end);
  const cursor = start + marker.length;
  return { next, cursorStart: cursor, cursorEnd: cursor };
}

export function WhatsAppMessageEditor({
  label,
  value,
  placeholder,
  variables,
  onChange,
}: WhatsAppMessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  function focusTextarea() {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function applyTextUpdate(
    updater: (current: string, start: number, end: number) => {
      next: string;
      cursorStart: number;
      cursorEnd: number;
    },
  ) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const { next, cursorStart, cursorEnd } = updater(value, start, end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function insertToken(token: string) {
    if (!isEditing) return;
    applyTextUpdate((current, start, end) => {
      const next = current.slice(0, start) + token + current.slice(end);
      const cursor = start + token.length;
      return { next, cursorStart: cursor, cursorEnd: cursor };
    });
  }

  function applyFormat(marker: string) {
    if (!isEditing) return;
    applyTextUpdate((current, start, end) => wrapWithMarker(current, start, end, marker));
  }

  const displayValue = value || '';
  const previewText = displayValue || placeholder;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm text-muted">{label}</label>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              focusTextarea();
            }}
            className="admin-chip admin-chip-inactive text-xs"
          >
            Editar mensaje
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="admin-chip admin-chip-active text-xs"
          >
            Listo
          </button>
        )}
      </div>

      {isEditing && (
        <div className="wa-editor-toolbar flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
          <span className="text-xs text-muted">Formato:</span>
          <button type="button" onClick={() => applyFormat('*')} className="wa-format-btn font-bold" title="Negrita (*texto*)" aria-label="Negrita">
            B
          </button>
          <button type="button" onClick={() => applyFormat('_')} className="wa-format-btn italic" title="Cursiva (_texto_)" aria-label="Cursiva">
            I
          </button>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <span className="text-xs text-muted">Variables:</span>
          {variables.map((variable) => (
            <button
              key={variable.key}
              type="button"
              onClick={() => insertToken(variable.token)}
              className="wa-var-chip"
              data-tooltip={variable.description}
              aria-label={`Insertar ${variable.token}`}
            >
              {variable.token}
            </button>
          ))}
        </div>
      )}

      {!isEditing && (
        <div className="flex flex-wrap gap-1.5">
          {variables.map((variable) => (
            <span key={variable.key} className="wa-var-chip wa-var-chip-readonly" data-tooltip={variable.description}>
              {variable.token}
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={displayValue}
        readOnly={!isEditing}
        onChange={(e) => isEditing && onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-field min-h-[90px] text-sm ${!isEditing ? 'wa-textarea-readonly' : ''}`}
      />

      {!isEditing && (
        <p className="text-xs text-muted">
          Vista previa: <span className="text-ink/80">{previewText}</span>
        </p>
      )}

      {isEditing && (
        <p className="text-xs text-muted">
          WhatsApp usa <code>*negrita*</code> y <code>_cursiva_</code>. Haz clic en una variable para insertarla donde
          está el cursor.
        </p>
      )}
    </div>
  );
}
