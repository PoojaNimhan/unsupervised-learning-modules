import { mount } from "@vue/test-utils";

import ClusterAdFuzzyExplorer from "../ce-src/components/ClusterAdFuzzyExplorer.ce.vue";
import ClusterAdHierarchyExplorer from "../ce-src/components/ClusterAdHierarchyExplorer.ce.vue";
import ClusterFoodSorter from "../ce-src/components/ClusterFoodSorter.ce.vue";
import ClusterKmeansDistanceExercise from "../ce-src/components/ClusterKmeansDistanceExercise.ce.vue";
import ClusterKmeansStepper from "../ce-src/components/ClusterKmeansStepper.ce.vue";
import ClusterDensityComparison from "../ce-src/components/ClusterDensityComparison.ce.vue";
import ClusterRealEstateExplorer from "../ce-src/components/ClusterRealEstateExplorer.ce.vue";

test("renders the module 1 food sorter and reset control", () => {
  const wrapper = mount(ClusterFoodSorter);
  expect(wrapper.text()).toContain("Sortierung zuruecksetzen");
  expect(wrapper.findAll(".chip").length).toBeGreaterThan(0);
});

test("renders the module 2 explorer controls", () => {
  const wrapper = mount(ClusterRealEstateExplorer);
  expect(wrapper.text()).toContain("Ruine gezielt hervorheben");
  expect(wrapper.findAll("select").length).toBe(2);
});

test("renders the module 3 stepper buttons without the old distance helper", () => {
  const wrapper = mount(ClusterKmeansStepper);
  expect(wrapper.text()).toContain("Initialisieren");
  expect(wrapper.text()).toContain("Zuordnung und Rechnung");
  expect(wrapper.text()).not.toContain("Distanzhelfer");
  expect(wrapper.findAll("button").length).toBeGreaterThan(3);
});

test("renders the module 3 distance exercise inputs", () => {
  const wrapper = mount(ClusterKmeansDistanceExercise);
  expect(wrapper.text()).toContain("Distanzmatrix selbst berechnen");
  expect(wrapper.text()).toContain("Anzahl der Cluster (k)");
  expect(wrapper.text()).toContain("Datenpunkt hinzufuegen");
  expect(wrapper.text()).toContain("Berechnen");
  expect(wrapper.findAll("input[type='number']").length).toBeGreaterThan(4);
});

test("adds and removes data points in the distance exercise", async () => {
  const wrapper = mount(ClusterKmeansDistanceExercise);
  const initialRemoveButtons = wrapper
    .findAll("button")
    .filter((button) => button.text() === "Entfernen");

  expect(initialRemoveButtons).toHaveLength(2);

  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Datenpunkt hinzufuegen")
    .trigger("click");

  expect(
    wrapper.findAll("button").filter((button) => button.text() === "Entfernen")
  ).toHaveLength(3);

  await wrapper
    .findAll("button")
    .filter((button) => button.text() === "Entfernen")[2]
    .trigger("click");

  expect(
    wrapper.findAll("button").filter((button) => button.text() === "Entfernen")
  ).toHaveLength(2);
});

test("calculates the expected distance table in the exercise", async () => {
  const wrapper = mount(ClusterKmeansDistanceExercise);
  const inputs = wrapper.findAll("input[type='number']");

  await inputs[1].setValue("0");
  await inputs[2].setValue("0");
  await inputs[3].setValue("3");
  await inputs[4].setValue("4");
  await inputs[5].setValue("3");
  await inputs[6].setValue("4");
  await inputs[7].setValue("0");
  await inputs[8].setValue("0");

  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Berechnen")
    .trigger("click");

  expect(wrapper.text()).toContain("Distanztabelle");
  expect(wrapper.text()).toContain("P1 = (3|4)");
  expect(wrapper.text()).toContain("P2 = (0|0)");
  expect(wrapper.text()).toContain("5");
  expect(wrapper.text()).toContain("0");
});

test("shows assignment distances and recompute formulas during the step flow", async () => {
  const wrapper = mount(ClusterKmeansStepper);
  await wrapper.find("select").setValue("3");
  const buttons = wrapper.findAll("button");

  await buttons[0].trigger("click");
  await buttons[1].trigger("click");

  expect(wrapper.findAll(".distance-label").length).toBeGreaterThan(0);
  expect(wrapper.text()).toContain("Punkte zuordnen");

  await buttons[2].trigger("click");

  expect(wrapper.text()).toContain("Mittelwert-Rechnung");
  expect(wrapper.text()).toContain("mu1,x");

  await buttons[3].trigger("click");

  expect(wrapper.text()).toContain("Naechste Iteration vorbereitet");
});

test("disables initialize while the current simulation is already active", async () => {
  const wrapper = mount(ClusterKmeansStepper);
  const buttons = wrapper.findAll("button");

  expect(buttons[0].element.disabled).toBe(false);

  await buttons[0].trigger("click");

  expect(wrapper.findAll("button")[0].element.disabled).toBe(true);

  const selects = wrapper.findAll("select");
  await selects[0].setValue("3");

  expect(wrapper.findAll("button")[0].element.disabled).toBe(false);
});

test("renders the fuzzy explorer slider and membership labels", () => {
  const wrapper = mount(ClusterAdFuzzyExplorer);
  expect(wrapper.text()).toContain("Targeting-Fokus der Smartwatch");
  expect(wrapper.text()).toContain("Tech-Gruppe");
  expect(wrapper.text()).toContain("Smartwatch-Hybrid");
  expect(wrapper.findAll("input[type='range']")).toHaveLength(1);
});

test("renders the hierarchy explorer controls and merge list", () => {
  const wrapper = mount(ClusterAdHierarchyExplorer);
  expect(wrapper.text()).toContain("Schnitthoehe im Anzeigenbaum");
  expect(wrapper.text()).toContain("Fusionsreihenfolge");
  expect(wrapper.text()).toContain("Fusionsabstand");
  expect(wrapper.findAll("li").length).toBeGreaterThan(5);
});

test("renders the density comparison with both views", () => {
  const wrapper = mount(ClusterDensityComparison);
  expect(wrapper.text()).toContain("Zentrumsbasierte Sicht");
  expect(wrapper.text()).toContain("Dichtebasierte Sicht");
  expect(wrapper.findAll("svg").length).toBe(2);
});
