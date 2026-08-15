// Utilidades de fecha. La zona horaria de referencia es Argentina (UTC-3),
// que es donde opera el gimnasio.

const ARG_OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3

// Fija una fecha "solo día" al mediodía UTC para evitar corrimientos de día
// cuando MongoDB la serializa y el cliente la rehidrata. Usa los componentes
// UTC para no depender de la zona horaria del servidor.
function atNoonUTC(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Fecha inválida");
  }
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      12,
      0,
      0
    )
  );
}

// Devuelve { start, end } (Date en UTC) del día calendario argentino de `date`.
function dayRangeInArgentina(date = new Date()) {
  const normalized = new Date(date.getTime() + ARG_OFFSET_MS);
  const y = normalized.getUTCFullYear();
  const m = normalized.getUTCMonth();
  const d = normalized.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - ARG_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - ARG_OFFSET_MS);
  return { start, end };
}

// Suma un mes a una fecha manteniendo el día del mes original
// (ajusta al último día si el mes siguiente es más corto).
function addMonthKeepingDay(currentDueDate) {
  const next = new Date(currentDueDate);
  const originalDay = next.getDate();
  next.setMonth(next.getMonth() + 1);
  const daysInNextMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0
  ).getDate();
  next.setDate(originalDay > daysInNextMonth ? daysInNextMonth : originalDay);
  return next;
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

module.exports = {
  ARG_OFFSET_MS,
  atNoonUTC,
  dayRangeInArgentina,
  addMonthKeepingDay,
  isValidDate,
};