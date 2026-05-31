import { mount } from "@vue/test-utils";

import SiteApp from "../ce-src/site/SiteApp.vue";

function mountAt(path) {
  window.history.pushState({}, "", path);
  return mount(SiteApp, {
    attachTo: document.body,
  });
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("renders the root route with topic navigation", () => {
  const wrapper = mountAt("/");

  expect(wrapper.text()).toContain("Interaktives Clustering-Applet");
  expect(wrapper.text()).toContain("Konzepte des unüberwachten Lernens");
  expect(wrapper.text()).toContain("Unueberwachtes Lernen verstehen");
});

test("renders a phase route with breadcrumbs and active menu state", () => {
  const wrapper = mountAt("/kmeans-schulhof/fachkonzept");

  expect(wrapper.text()).toContain("Fachkonzept - K-Means auf dem Schulhof");
  expect(wrapper.text()).toContain("Das mathematische Herzstück von K-Means");
  expect(wrapper.text()).toContain("Konzepte des unüberwachten Lernens");
  expect(wrapper.find(".menulink--current").text()).toContain("Fachkonzept");
});

test("navigates through previous and next controls without leaving the root app", async () => {
  const wrapper = mountAt("/unueberwachtes-lernen/erkundung");
  const nextButton = wrapper
    .findAll(".page-nav button")
    .find((button) => button.text().includes("Strukturierung"));

  await nextButton.trigger("click");

  expect(window.location.pathname).toBe("/unueberwachtes-lernen/strukturierung");
  expect(wrapper.text()).toContain("Strukturierung - Unueberwachtes Lernen verstehen");
});
