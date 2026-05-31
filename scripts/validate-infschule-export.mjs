import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { EXPORT_CHAPTER_ROOT, EXPORT_FEATURES_CONFIG, MODULE_FOLDER_ORDER } from "./native/constants.mjs";

async function assertFileContains(filePath, needle) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.includes(needle)) {
    throw new Error(`Expected '${needle}' in ${filePath}`);
  }
  return contents;
}

async function main() {
  const manifest = JSON.parse(
    await readFile(resolve("generated/runtime/component-manifest.json"), "utf8")
  );
  const featuresText = await readFile(EXPORT_FEATURES_CONFIG, "utf8");
  const features = JSON.parse(featuresText);
  if (!features[manifest.featureName]) {
    throw new Error(`Missing feature registration for ${manifest.featureName}`);
  }

  await Promise.all(
    MODULE_FOLDER_ORDER.map(async ([name, folder]) => {
      const filePath = resolve(EXPORT_CHAPTER_ROOT, folder, "inhalt.txt");
      const contents = await readFile(filePath, "utf8");
      if (!contents.includes("title:")) {
        throw new Error(`Missing title in ${filePath}`);
      }
      if (!contents.includes("uuid:")) {
        throw new Error(`Missing uuid in ${filePath}`);
      }
      const hasCustomElement = manifest.customElements.some((tag) => contents.includes(`<${tag}`));
      if (["module1", "module2", "module3", "module4"].includes(name)) {
        if (!contents.includes(`features: ${manifest.featureName}`)) {
          throw new Error(`Missing features attribute in ${filePath}`);
        }
        if (!hasCustomElement) {
          throw new Error(`Expected a custom element in ${filePath}`);
        }
      }
    })
  );

  for (const tag of manifest.customElements) {
    await assertFileContains(resolve("dist/index.js"), tag);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
