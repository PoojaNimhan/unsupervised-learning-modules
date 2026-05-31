import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  GENERATED_DATA_DIR,
  GENERATED_RUNTIME_DIR,
} from "./native/constants.mjs";
import {
  renderModule1Page,
  renderModule2Page,
  renderModule3Page,
  renderModule4Page,
  renderStartPage,
} from "./native/content-renderers.mjs";
import {
  loadAllDatasets,
  loadAllGermanModules,
} from "./native/source-loader.mjs";

const PUBLISHED_MODULES = [
  {
    id: "module1",
    number: "1.",
    slug: "unueberwachtes-lernen",
    renderer: renderModule1Page,
  },
  {
    id: "module2",
    number: "2.",
    slug: "immobilienmakler",
    renderer: renderModule2Page,
  },
  {
    id: "module3",
    number: "3.",
    slug: "kmeans-schulhof",
    renderer: renderModule3Page,
  },
  {
    id: "module4",
    number: "4.",
    slug: "werbeagentur",
    renderer: renderModule4Page,
  },
];

const PHASES = [
  { id: "exploration", number: "1.", slug: "erkundung", title: "Erkundung" },
  { id: "structuring", number: "2.", slug: "strukturierung", title: "Strukturierung" },
  { id: "concept", number: "3.", slug: "fachkonzept", title: "Fachkonzept" },
  { id: "exercises", number: "4.", slug: "uebungen", title: "Übungen" },
];

function withNormalizedBooleans(rows) {
  return rows.map((row) => {
    const normalized = { ...row };
    if ("is_outlier" in normalized) {
      normalized.is_outlier =
        normalized.is_outlier === true || normalized.is_outlier === "True";
    }
    if ("is_noise" in normalized) {
      normalized.is_noise =
        normalized.is_noise === true || normalized.is_noise === "True";
    }
    return normalized;
  });
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function stripModulePrefix(title) {
  return title.replace(/^Modul \d+:\s*/, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitPageAtPhaseHeadings(html, phases) {
  const matches = phases
    .map((phase) => {
      const headingPattern = escapeRegExp(phase.headingTitle);
      const pattern = new RegExp(
        `<h3(?:\\s+class="[^"]*")?>${headingPattern}<\\/h3>`,
        "i"
      );
      const match = pattern.exec(html);
      return match
        ? { ...phase, index: match.index, matchText: match[0] }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.index - right.index);

  if (matches.length !== phases.length) {
    const found = matches.map((match) => match.id).join(", ");
    throw new Error(`Could not find all phase headings. Found: ${found}`);
  }

  return matches.map((match, index) => {
    const beforeFirstHeading = index === 0 ? html.slice(0, match.index).trim() : "";
    const nextMatch = matches[index + 1];
    const body = html.slice(
      match.index + match.matchText.length,
      nextMatch ? nextMatch.index : html.length
    );
    return {
      ...match,
      html: [beforeFirstHeading, body.trim()].filter(Boolean).join("\n\n"),
    };
  });
}

function sectionTitlesForPhase(html) {
  return [...html.matchAll(/<h4>(.*?)<\/h4>/g)].map((match, index) => ({
    id: `section-${index + 1}`,
    title: match[1].replace(/<[^>]+>/g, ""),
  }));
}

function wrapExerciseSections(html) {
  const headingMatches = [...html.matchAll(/^<h4>.*?<\/h4>/gm)];
  if (headingMatches.length === 0) return html;

  const intro = html.slice(0, headingMatches[0].index).trim();
  const cards = headingMatches.map((match, index) => {
    const nextMatch = headingMatches[index + 1];
    const sectionHtml = html.slice(
      match.index,
      nextMatch ? nextMatch.index : html.length
    );
    return `<section class="am-cluster-task-card">\n${sectionHtml.trim()}\n</section>`;
  });

  return [intro, ...cards].filter(Boolean).join("\n\n");
}

function buildNavigation(modules) {
  const startHtml = renderStartPage(modules.start);
  const pages = [
    {
      id: "start",
      route: "/",
      title: modules.start.title,
      moduleId: "start",
      html: startHtml,
      breadcrumbs: ["Startseite", "Konzepte des unüberwachten Lernens"],
    },
  ];

  const moduleEntries = PUBLISHED_MODULES.map((module) => {
    const moduleContent = modules[module.id];
    const phases = PHASES.map((phase) => ({
      ...phase,
      headingTitle: moduleContent[phase.id].heading,
    }));
    const phaseHtml = splitPageAtPhaseHeadings(module.renderer(moduleContent), phases);

    return {
      id: module.id,
      number: module.number,
      title: stripModulePrefix(moduleContent.title),
      route: `/${module.slug}/${PHASES[0].slug}`,
      phases: phaseHtml.map((phase) => {
        const route = `/${module.slug}/${phase.slug}`;
        const pageHtml =
          phase.id === "exercises" ? wrapExerciseSections(phase.html) : phase.html;
        pages.push({
          id: `${module.id}-${phase.id}`,
          route,
          title: `${moduleContent.title}: ${phase.title}`,
          moduleId: module.id,
          moduleTitle: stripModulePrefix(moduleContent.title),
          phaseId: phase.id,
          phaseTitle: phase.title,
          html: pageHtml,
          sections: sectionTitlesForPhase(pageHtml),
          breadcrumbs: [
            "Startseite",
            "Konzepte des unüberwachten Lernens",
            stripModulePrefix(moduleContent.title),
            phase.title,
          ],
        });
        return {
          id: phase.id,
          number: phase.number,
          title: phase.title,
          route,
        };
      }),
    };
  });

  const orderedPages = pages.map((page, index) => ({
    ...page,
    previousRoute: pages[index - 1]?.route ?? null,
    nextRoute: pages[index + 1]?.route ?? null,
  }));

  return {
    topic: {
      title: "Konzepte des unüberwachten Lernens",
      shortTitle: "Clusterbildung",
      number: "1.",
      route: "/",
    },
    home: {
      title: "Startseite",
      route: "/",
    },
    modules: moduleEntries,
    pages: orderedPages,
    phaseContract: PHASES.map(({ id, slug }) => ({ id, slug })),
  };
}

async function main() {
  await rm(GENERATED_RUNTIME_DIR, { recursive: true, force: true });
  await mkdir(GENERATED_DATA_DIR, { recursive: true });

  const [modules, datasets] = await Promise.all([
    loadAllGermanModules(),
    loadAllDatasets(),
  ]);

  await writeJson(resolve(GENERATED_RUNTIME_DIR, "content.de.json"), modules);
  await writeJson(resolve(GENERATED_RUNTIME_DIR, "navigation.de.json"), buildNavigation(modules));

  await Promise.all(
    Object.entries(datasets).map(([name, rows]) =>
      writeJson(resolve(GENERATED_DATA_DIR, `${name}.json`), withNormalizedBooleans(rows))
    )
  );

  await writeJson(resolve(GENERATED_RUNTIME_DIR, "component-manifest.json"), {
    featureName: "clustering-applet",
    customElements: [
      "cluster-food-sorter",
      "cluster-snack-map",
      "cluster-real-estate-explorer",
      "cluster-kmeans-stepper",
      "cluster-kmeans-distance-exercise",
      "cluster-ad-fuzzy-explorer",
      "cluster-ad-hierarchy-explorer",
      "cluster-density-comparison",
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
