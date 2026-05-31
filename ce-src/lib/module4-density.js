export function buildDensityComparison(rows, options = {}) {
  const showNoise = options.showNoise ?? true;
  return rows
    .filter((row) => showNoise || !row.is_noise)
    .map((row) => ({
      ...row,
      center_cluster: row.x < 6 ? "links" : "rechts",
      density_cluster:
        row.pattern === "noise"
          ? "Rauschen"
          : row.pattern === "compact"
            ? "Kompakte Wolke"
            : "Kettenstruktur",
    }));
}

export function summarizeDensityPatterns(rows) {
  return rows.reduce(
    (summary, row) => {
      if (row.pattern === "compact") summary.compact += 1;
      if (row.pattern === "chain") summary.chain += 1;
      if (row.pattern === "noise") summary.noise += 1;
      return summary;
    },
    { compact: 0, chain: 0, noise: 0 }
  );
}
