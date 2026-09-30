import { resolve } from "node:path";

export const ROOT = resolve(".");
export const CONTENT_SOURCE_DIR = resolve("content/de");
export const DATA_SOURCE_DIR = resolve("data");
export const GENERATED_RUNTIME_DIR = resolve("generated/runtime");
export const GENERATED_DATA_DIR = resolve(GENERATED_RUNTIME_DIR, "datasets");
export const EXPORT_ROOT = resolve("inf-schule-export");
export const EXPORT_FEATURE_NAME = "clustering-applet";
export const EXPORT_CHAPTER_ROOT = resolve(
  EXPORT_ROOT,
  "content",
  "90_entwuerfe",
  "10_clusterbildung-verstehen"
);
export const EXPORT_ASSET_JS_DIR = resolve(
  EXPORT_ROOT,
  "assets",
  "thirdparty",
  EXPORT_FEATURE_NAME,
  "js"
);
export const EXPORT_FEATURES_CONFIG = resolve(
  EXPORT_ROOT,
  "site",
  "plugins",
  "inf-schule",
  "config",
  "features.json"
);
export const DIST_INDEX = resolve("dist-infschule/index.js");

export const MODULE_FOLDER_ORDER = [
  ["start", "10_start"],
  ["module1", "20_unueberwachtes-lernen"],
  ["module2", "30_immobilienmakler"],
  ["module3", "40_kmeans-schulhof"],
  ["module4", "50_werbeagentur"],
];
