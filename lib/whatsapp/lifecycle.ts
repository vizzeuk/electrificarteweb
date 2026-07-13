import {
  ADVISORY_TABLE,
  ADVISORY_PHONE_COLUMN,
  getSupabase,
  isRowActive,
  normalizePhone,
} from "@/lib/whatsapp/subscription";

// ─── Ciclo de vida de la asesoría $4.990 ──────────────────────────────────────
// La asesoría IA por WhatsApp se activa cuando el cliente paga los $4.990 y dura
// EXACTAMENTE 10 días. En el día 9 (último día, 1 día restante) el bot envía un
// recordatorio proactivo: "aún nos queda 1 día, ¿te puedo ayudar en algo?".
//
// Este módulo solo hace el cálculo temporal + la consulta a Supabase. El envío
// (Kapso) y la orquestación (cron + dedup) viven en outbound.ts y en la route.

const DAY_MS = 24 * 60 * 60 * 1000;

// Ventana total de la asesoría (días). Aviso el penúltimo día → 1 día restante.
export const ASESORIA_WINDOW_DAYS = Number(process.env.ASESORIA_WINDOW_DAYS ?? 10);
export const ASESORIA_REMINDER_DAY = Number(process.env.ASESORIA_REMINDER_DAY ?? 9);

// Columna con la fecha de activación (pago). Configurable por si el esquema real
// usa otro nombre (ej: "paid_at", "fecha_pago"). Default "created_at".
const CREATED_COLUMN = process.env.SUPABASE_SUBSCRIPTION_CREATED_COLUMN ?? "created_at";

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
    const { data, error } = await supabase
      .from(ADVISORY_TABLE)
      .select("*")
      .gt(CREATED_COLUMN, newerThan.toISOString())
      .lte(CREATED_COLUMN, olderThan.toISOString());

    if (error) {
      console.warn("[lifecycle] error consultando asesorías por vencer:", error.message);
      return [];
    }

    const due: AsesoriaLifecycle[] = [];
    for (const row of data ?? []) {
      if (!isRowActive(row)) continue; // respeta status cancelado/expirado
      const rawStart = (row as Record<string, unknown>)[CREATED_COLUMN];
      const rawPhone = (row as Record<string, unknown>)[ADVISORY_PHONE_COLUMN];
      if (!rawStart || !rawPhone) continue;

      const startedAt = new Date(rawStart as string);
      if (Number.isNaN(startedAt.getTime())) continue;
      const phone = normalizePhone(String(rawPhone));
      if (!phone || phone.length < 6) continue;

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
