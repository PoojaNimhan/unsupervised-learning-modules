import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import YAML from "yaml";

import { CONTENT_SOURCE_DIR, DATA_SOURCE_DIR } from "./constants.mjs";

export async function loadYamlSource(name) {
  const filePath = resolve(CONTENT_SOURCE_DIR, `${name}.yaml`);
  const raw = await readFile(filePath, "utf8");
  return YAML.parse(raw);
}

export async function loadCsvSource(name) {
  const filePath = resolve(DATA_SOURCE_DIR, `${name}.csv`);
  const raw = await readFile(filePath, "utf8");
  return parseCsv(raw, {
    columns: true,
    skip_empty_lines: true,
    cast: true,
  });
}

export async function loadAllGermanModules() {
  const names = [
    "start",
    "module1",
    "module2",
    "module3",
    "module4",
  ];
  const entries = await Promise.all(
    names.map(async (name) => [name, await loadYamlSource(name)])
  );
  return Object.fromEntries(entries);
}

export async function loadAllDatasets() {
  const names = [
    "ads_fuzzy",
    "ads_hierarchical",
    "density_examples",
    "foods",
    "snacks",
    "real_estate_broker",
    "real_estate_cluster_demo",
    "neighborhood_planner",
    "schoolyard_1d",
    "schoolyard_2d",
    "schoolyard_k3_2d",
  ];
  const entries = await Promise.all(
    names.map(async (name) => [name, await loadCsvSource(name)])
  );
  return Object.fromEntries(entries);
}
