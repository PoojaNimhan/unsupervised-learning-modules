import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  DIST_INDEX,
  EXPORT_CHAPTER_ROOT,
  EXPORT_FEATURES_CONFIG,
  MODULE_FOLDER_ORDER,
} from "./native/constants.mjs";

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

  const chapterRootPath = resolve(EXPORT_CHAPTER_ROOT, "inhalt.txt");
  const chapterRootContents = await readFile(chapterRootPath, "utf8");
  for (const needle of ["Title:", "Menutitle:", "Text:", "Uuid:"]) {
    if (!chapterRootContents.includes(needle)) {
      throw new Error(`Missing ${needle} in ${chapterRootPath}`);
    }
  }

  await Promise.all(
    MODULE_FOLDER_ORDER.map(async ([name, folder]) => {
      const filePath = resolve(EXPORT_CHAPTER_ROOT, folder, "inhalt.txt");
      const contents = await readFile(filePath, "utf8");
      if (!contents.includes("Title:")) {
        throw new Error(`Missing Title in ${filePath}`);
      }
      if (!contents.includes("Menutitle:")) {
        throw new Error(`Missing Menutitle in ${filePath}`);
      }
      if (!contents.includes("Text:")) {
        throw new Error(`Missing Text in ${filePath}`);
      }
      if (!contents.includes("Uuid:")) {
        throw new Error(`Missing Uuid in ${filePath}`);
      }
      const hasCustomElement = manifest.customElements.some((tag) => contents.includes(`<${tag}`));
      if (["module1", "module2", "module3", "module4"].includes(name)) {
        if (!contents.includes(`Features: ${manifest.featureName}`)) {
          throw new Error(`Missing Features attribute in ${filePath}`);
        }
        if (!hasCustomElement) {
          throw new Error(`Expected a custom element in ${filePath}`);
        }
      }
    })
  );

  for (const tag of manifest.customElements) {
    await assertFileContains(DIST_INDEX, tag);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
