import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  DIST_INDEX,
  EXPORT_ASSET_JS_DIR,
  EXPORT_FEATURES_CONFIG,
  EXPORT_FEATURE_NAME,
} from "./native/constants.mjs";

async function main() {
  await mkdir(EXPORT_ASSET_JS_DIR, { recursive: true });
  await mkdir(dirname(EXPORT_FEATURES_CONFIG), { recursive: true });

  const bundleTarget = resolve(EXPORT_ASSET_JS_DIR, "index.js");
  await cp(DIST_INDEX, bundleTarget);

  const features = {
    [EXPORT_FEATURE_NAME]: {
      jsModuleFolder: [`assets/thirdparty/${EXPORT_FEATURE_NAME}/js/`],
    },
  };
  await writeFile(
    EXPORT_FEATURES_CONFIG,
    `${JSON.stringify(features, null, 2)}\n`,
    "utf8"
  );

  const readmePath = resolve("inf-schule-export/README.md");
  const readmeText = [
    "# inf-schule Export",
    "",
    "Dieses Verzeichnis spiegelt die Zielstruktur fuer eine native inf-schule-Integration.",
    "",
    "- `content/` enthaelt die generierten Kapitel- und Seitenordner mit `inhalt.txt`.",
    `- \`site/plugins/inf-schule/config/features.json\` registriert das Feature \`${EXPORT_FEATURE_NAME}\`.`,
    `- \`assets/thirdparty/${EXPORT_FEATURE_NAME}/js/index.js\` ist das gebaute Vue-Custom-Element-Bundle.`,
    "",
    "Vor dem Kopieren in das echte inf-schule-Repository sollten die generierten UUIDs und die Zielpfade gegen die dortigen Konventionen geprueft werden.",
    "",
  ].join("\n");
  await writeFile(readmePath, readmeText, "utf8");

  const bundle = await readFile(bundleTarget, "utf8");
  if (!bundle.includes("cluster-food-sorter")) {
    throw new Error("The generated bundle does not appear to include custom elements.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
