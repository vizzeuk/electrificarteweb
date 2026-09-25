import {
  ADVISORY_PHONE_COLUMN,
  ADVISORY_START_FALLBACK,
  ADVISORY_TABLE,
  ASESORIA_WINDOW_DAYS,
  getSupabase,
  inicioAsesoria,
  isRowActive,
  normalizePhone,
} from "@/lib/whatsapp/subscription";

export { ASESORIA_WINDOW_DAYS };

// ─── Ciclo de vida de la asesoría $4.990 ──────────────────────────────────────
// La asesoría IA por WhatsApp se activa cuando el cliente paga los $4.990 y dura
// EXACTAMENTE 10 días. En el día 9 (último día, 1 día restante) el bot envía un
// recordatorio proactivo: "aún nos queda 1 día, ¿te puedo ayudar en algo?".
//
// Este módulo solo hace el cálculo temporal + la consulta a Supabase. El envío
// (Kapso) y la orquestación (cron + dedup) viven en outbound.ts y en la route.

const DAY_MS = 24 * 60 * 60 * 1000;

// Ventana total (ASESORIA_WINDOW_DAYS, en subscription.ts). Aviso el penúltimo
// día → 1 día restante. El inicio es `paid_at` (o el respaldo): ver inicioAsesoria.
export const ASESORIA_REMINDER_DAY = Number(process.env.ASESORIA_REMINDER_DAY ?? 9);

export interface AsesoriaLifecycle {
  phone: string;
  startedAt: Date;
  dayNumber: number;   // 1 = primer día, 10 = último
  daysLeft: number;    // días restantes hasta que expira la ventana
}

/** Días transcurridos (enteros) desde la activación hasta ahora. */
export function daysElapsed(startedAt: Date, now = new Date()): number {
  return Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS);
}

/**
 * Asesorías que HOY están en el día del recordatorio (por defecto día 9 de 10,
 * es decir 1 día restante). Se seleccionan las filas cuya activación cae en la
 * ventana [inicio - REMINDER_DAY - 1, inicio - REMINDER_DAY): así el cron diario
 * captura cada suscripción exactamente una vez cuando entra al último día.
 */
export async function findAsesoriaReminderDue(now = new Date()): Promise<AsesoriaLifecycle[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[lifecycle] Supabase no configurado — no se pueden calcular recordatorios");
    return [];
  }

  // Día 9 cumplido ⇔ activación ocurrió hace [9, 10) días.
  const olderThan = new Date(now.getTime() - ASESORIA_REMINDER_DAY * DAY_MS);       // hace 9 días
  const newerThan = new Date(now.getTime() - (ASESORIA_REMINDER_DAY + 1) * DAY_MS); // hace 10 días

  try {
    // El inicio puede estar en `paid_at` o en la columna de respaldo, y PostgREST
    // no sabe hacer coalesce en un filtro. Se trae un superconjunto (cualquiera
    // de las dos dentro de los últimos 10 días) y el corte exacto se hace abajo.
    const cols = [...new Set(["paid_at", ADVISORY_START_FALLBACK])];
    const { data, error } = await supabase
      .from(ADVISORY_TABLE)
      .select("*")
      .or(cols.map((c) => `${c}.gt.${newerThan.toISOString()}`).join(","));

    if (error) {
      console.warn("[lifecycle] error consultando asesorías por vencer:", error.message);
      return [];
    }

    const due: AsesoriaLifecycle[] = [];
    const vistos = new Set<string>();
    for (const row of data ?? []) {
      if (!isRowActive(row)) continue; // respeta status pendiente/cancelado/expirado
      const startedAt = inicioAsesoria(row as Record<string, unknown>);
      const rawPhone = (row as Record<string, unknown>)[ADVISORY_PHONE_COLUMN];
      if (!startedAt || !rawPhone) continue;
      // Día 9 cumplido ⇔ el inicio cayó hace [9, 10) días.
      if (startedAt <= newerThan || startedAt > olderThan) continue;

      const phone = normalizePhone(String(rawPhone));
      if (!phone || phone.length < 6 || vistos.has(phone)) continue;
      vistos.add(phone);

      const elapsed = daysElapsed(startedAt, now);
      due.push({
        phone,
        startedAt,
        dayNumber: elapsed + 1, // día 1 = mismo día del pago
        daysLeft: Math.max(0, ASESORIA_WINDOW_DAYS - elapsed),
      });
    }
    return due;
  } catch (err) {
    console.warn(
      "[lifecycle] excepción consultando asesorías por vencer:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
