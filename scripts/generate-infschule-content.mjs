import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  EXPORT_CHAPTER_ROOT,
  EXPORT_FEATURE_NAME,
  EXPORT_ROOT,
  MODULE_FOLDER_ORDER,
} from "./native/constants.mjs";
import { infSchuleFile } from "./native/html-helpers.mjs";
import {
  renderModule1Page,
  renderModule2Page,
  renderModule3Page,
  renderModule4Page,
  renderStartPage,
} from "./native/content-renderers.mjs";
import { CHAPTER_STYLES } from "./native/chapter-styles.mjs";
import { loadAllGermanModules } from "./native/source-loader.mjs";
import { makeStableUuid } from "./native/uuid.mjs";

function renderModuleHtml(name, content) {
  if (name === "start") return renderStartPage(content);
  if (name === "module1") return renderModule1Page(content);
  if (name === "module2") return renderModule2Page(content);
  if (name === "module3") return renderModule3Page(content);
  if (name === "module4") return renderModule4Page(content);
  throw new Error(`No renderer configured for ${name}.`);
}

function featureValueForModule(name) {
  return ["module1", "module2", "module3", "module4"].includes(name)
    ? EXPORT_FEATURE_NAME
    : "";
}

async function main() {
  await rm(EXPORT_ROOT, { recursive: true, force: true });
  await mkdir(EXPORT_CHAPTER_ROOT, { recursive: true });

  const modules = await loadAllGermanModules();

  const chapterFileText = infSchuleFile({
    title: "Konzepte des unüberwachten Lernens",
    menu: "Clusterbildung",
    html: renderStartPage(modules.start),
    uuid: makeStableUuid("chapter:clusterbildung-verstehen"),
  });
  await writeFile(resolve(EXPORT_CHAPTER_ROOT, "inhalt.txt"), chapterFileText, "utf8");
  await writeFile(resolve(EXPORT_CHAPTER_ROOT, "_stile.css"), CHAPTER_STYLES, "utf8");

  await Promise.all(
    MODULE_FOLDER_ORDER.map(async ([name, folder]) => {
      const moduleContent = modules[name];
      const targetDir = resolve(EXPORT_CHAPTER_ROOT, folder);
      await mkdir(targetDir, { recursive: true });
      const html = renderModuleHtml(name, moduleContent);
      const fileText = infSchuleFile({
        title: moduleContent.title,
        menu: moduleContent.title.replace(/^Modul \d+:\s*/, "").slice(0, 40),
        features: featureValueForModule(name),
        html,
        uuid: makeStableUuid(`${folder}:${moduleContent.title}`),
      });
      await writeFile(resolve(targetDir, "inhalt.txt"), fileText, "utf8");
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
