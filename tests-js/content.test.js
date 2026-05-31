import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const navigation = JSON.parse(
  readFileSync(resolve("generated/runtime/navigation.de.json"), "utf8")
);

test("publishes exactly four core modules with the standard phase contract", () => {
  expect(navigation.modules).toHaveLength(4);
  expect(navigation.phaseContract).toEqual([
    { id: "exploration", slug: "erkundung" },
    { id: "structuring", slug: "strukturierung" },
    { id: "concept", slug: "fachkonzept" },
    { id: "exercises", slug: "uebungen" },
  ]);

  for (const module of navigation.modules) {
    expect(module.phases.map((phase) => phase.id)).toEqual([
      "exploration",
      "structuring",
      "concept",
      "exercises",
    ]);
  }
});

test("generates route order and previous-next links for the lesson sequence", () => {
  expect(navigation.pages[0].route).toBe("/");
  expect(navigation.pages[1].route).toBe("/unueberwachtes-lernen/erkundung");
  expect(navigation.pages.at(-1).route).toBe("/werbeagentur/uebungen");

  const firstPhase = navigation.pages.find(
    (page) => page.route === "/unueberwachtes-lernen/erkundung"
  );
  const secondPhase = navigation.pages.find(
    (page) => page.route === "/unueberwachtes-lernen/strukturierung"
  );

  expect(firstPhase.previousRoute).toBe("/");
  expect(firstPhase.nextRoute).toBe(secondPhase.route);
  expect(secondPhase.previousRoute).toBe(firstPhase.route);
});

test("keeps interactive custom element blocks in generated phase pages", () => {
  const module1Exploration = navigation.pages.find(
    (page) => page.route === "/unueberwachtes-lernen/erkundung"
  );
  const module2Exploration = navigation.pages.find(
    (page) => page.route === "/immobilienmakler/erkundung"
  );
  const module3Structuring = navigation.pages.find(
    (page) => page.route === "/kmeans-schulhof/strukturierung"
  );
  const module4Concept = navigation.pages.find(
    (page) => page.route === "/werbeagentur/fachkonzept"
  );

  expect(module1Exploration.html).toContain("<cluster-food-sorter");
  expect(module2Exploration.html).toContain("<cluster-real-estate-explorer");
  expect(module3Structuring.html).toContain("<cluster-kmeans-stepper");
  expect(module4Concept.html).toContain("<cluster-density-comparison");
});

test("generates breadcrumbs and compact section metadata for phase pages", () => {
  const page = navigation.pages.find(
    (entry) => entry.route === "/kmeans-schulhof/fachkonzept"
  );

  expect(page.breadcrumbs).toEqual([
    "Startseite",
    "Konzepte des unüberwachten Lernens",
    "K-Means auf dem Schulhof",
    "Fachkonzept",
  ]);
  expect(page.sections.length).toBeGreaterThan(2);
  expect(page.sections[0]).toEqual({
    id: "section-1",
    title: "Das mathematische Herzstück von K-Means",
  });
});
