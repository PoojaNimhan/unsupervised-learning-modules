function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function fuzzyMembershipFromFocus(focusPercent) {
  const normalized = clamp(Number(focusPercent), 0, 100) / 100;
  const tech = Math.round((0.2 + normalized * 0.6) * 100);
  return {
    tech,
    style: 100 - tech,
  };
}

export function buildHybridAd(baseRow, focusPercent) {
  const normalized = clamp(Number(focusPercent), 0, 100) / 100;
  const memberships = fuzzyMembershipFromFocus(focusPercent);
  return {
    ...baseRow,
    tech_score: Number((30 + normalized * 50).toFixed(1)),
    style_score: Number((80 - normalized * 45).toFixed(1)),
    focus_percent: Math.round(normalized * 100),
    memberships,
  };
}

export function buildFuzzyPlotPoints(rows, focusPercent) {
  return rows.map((row) =>
    row.role === "hybrid"
      ? buildHybridAd(row, focusPercent)
      : { ...row, memberships: row.ad_group === "Tech" ? { tech: 100, style: 0 } : { tech: 0, style: 100 } }
  );
}
