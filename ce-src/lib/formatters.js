export function formatDecimal(value, digits = 1) {
  return Number(value).toFixed(digits).replace(".", ",");
}

export function formatPriceEur(value) {
  return `${Number(value).toLocaleString("de-DE")} €`;
}

export function foodLabel(row) {
  return `${row.emoji} ${row.display_name_de}`;
}

export function snackLabel(row) {
  return `${row.emoji} ${row.display_name_de}`;
}

export function axisLabel(key) {
  return {
    area_sqm: "Fläche (m²)",
    rooms: "Zimmer",
    price_eur: "Preis (€)",
    condition_score: "Zustand",
  }[key];
}
