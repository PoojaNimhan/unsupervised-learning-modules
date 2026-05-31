<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { setTelemetryContext, startTelemetry, stopTelemetry, trackTelemetryEvent } from "../lib/telemetry.js";
import { moduleForPage, pageForPath, pageTitle, siteNavigation } from "./navigation.js";

const currentPath = ref(window.location.pathname);
const menuOpen = ref(false);
const lessonHtmlRef = ref(null);
let contentObserver = null;
const observedContentBlocks = new Set();

const currentPage = computed(() => pageForPath(currentPath.value));
const currentModule = computed(() => moduleForPage(currentPage.value));
const previousPage = computed(() =>
  siteNavigation.pages.find((page) => page.route === currentPage.value.previousRoute)
);
const nextPage = computed(() =>
  siteNavigation.pages.find((page) => page.route === currentPage.value.nextRoute)
);

function goTo(route) {
  if (route === currentPath.value) {
    menuOpen.value = false;
    return;
  }
  history.pushState({}, "", route);
  currentPath.value = window.location.pathname;
  menuOpen.value = false;
  if (navigator.userAgent.includes("jsdom")) return;
  try {
    window.scrollTo({ top: 0, behavior: "auto" });
  } catch {
    // jsdom does not implement scrolling; browsers do.
  }
}

function onPopState() {
  currentPath.value = window.location.pathname;
}

function contentBlockType(element) {
  if (element.classList.contains("am-cluster-task-card")) return "task";
  if (element.classList.contains("am-cluster-info")) return "info";
  if (element.classList.contains("am-cluster-note")) return "note";
  if (element.classList.contains("am-cluster-reveal")) return "reveal";
  if (element.tagName === "H3" || element.tagName === "H4") return "heading";
  if (element.tagName.includes("-")) return "interactive_component";
  return "content";
}

function contentBlockTitle(element) {
  const heading = element.matches("h3,h4") ? element : element.querySelector("h3,h4,summary");
  return heading?.textContent?.replace(/\s+/g, " ").trim() || element.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || "Inhaltsblock";
}

function sectionTitleForBlock(page, element) {
  const heading = element.matches("h3,h4") ? element : element.querySelector("h3,h4");
  const title = heading?.textContent?.replace(/\s+/g, " ").trim();
  return page.sections?.find((section) => section.title === title)?.title ?? title ?? page.phaseTitle ?? page.title;
}

function observeContentBlocks(page) {
  contentObserver?.disconnect();
  observedContentBlocks.clear();
  if (!lessonHtmlRef.value || typeof IntersectionObserver === "undefined") return;

  const blocks = lessonHtmlRef.value.querySelectorAll(
    "h3, h4, .am-cluster-task-card, .am-cluster-info, .am-cluster-note, .am-cluster-reveal, cluster-food-sorter, cluster-snack-map, cluster-real-estate-explorer, cluster-kmeans-stepper, cluster-kmeans-distance-exercise, cluster-ad-fuzzy-explorer, cluster-ad-hierarchy-explorer, cluster-density-comparison"
  );

  contentObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) continue;
        const index = Array.from(blocks).indexOf(entry.target);
        const blockId = `${page.phaseId ?? "page"}-block-${index + 1}`;
        const key = `${page.route}:${blockId}`;
        if (observedContentBlocks.has(key)) continue;
        observedContentBlocks.add(key);
        const blockTitle = contentBlockTitle(entry.target);
        const sectionTitle = sectionTitleForBlock(page, entry.target);
        trackTelemetryEvent("content_block_view", {
          moduleId: page.moduleId,
          sectionId: `${page.phaseId ?? "page"}:${blockId}`,
          route: page.route,
          blockId,
          blockType: contentBlockType(entry.target),
          blockTitle,
          sectionTitle,
          title: blockTitle,
        });
      }
    },
    { threshold: [0.35] }
  );

  blocks.forEach((block) => contentObserver.observe(block));
}

watch(
  currentPage,
  (page, previous) => {
    document.title =
      page.route === "/"
        ? "Konzepte des unüberwachten Lernens"
        : `${pageTitle(page)} | Konzepte des unüberwachten Lernens`;
    setTelemetryContext({
      moduleId: page.moduleId,
      sectionId: page.phaseId ?? "start",
      route: page.route,
    });
    if (previous) {
      trackTelemetryEvent("section_exit", {
        moduleId: previous.moduleId,
        sectionId: previous.phaseId,
        route: previous.route,
        sectionTitle: previous.phaseTitle ?? previous.title,
      });
      if (previous.moduleId !== page.moduleId) {
        trackTelemetryEvent("module_exit", {
          moduleId: previous.moduleId,
          route: previous.route,
        });
      }
    }
    if (!previous || previous.moduleId !== page.moduleId) {
      trackTelemetryEvent("module_enter", {
        moduleId: page.moduleId,
        route: page.route,
      });
    }
    trackTelemetryEvent("section_enter", {
      moduleId: page.moduleId,
      sectionId: page.phaseId,
      route: page.route,
      sectionTitle: page.phaseTitle ?? page.title,
    });
    nextTick(() => observeContentBlocks(page));
  },
  { immediate: true }
);

onMounted(() => {
  startTelemetry({
    moduleId: currentPage.value.moduleId,
    sectionId: currentPage.value.phaseId,
    route: currentPage.value.route,
  });
  window.addEventListener("popstate", onPopState);
});

onBeforeUnmount(() => {
  contentObserver?.disconnect();
  stopTelemetry();
  window.removeEventListener("popstate", onPopState);
});
</script>

<template>
  <div class="site-shell" :class="{ 'menu-is-open': menuOpen }">
    <header class="site-header">
      <a class="site-logo" href="/" @click.prevent="goTo('/')">
        <span class="logo-node">R</span>
        <span class="logo-link"></span>
        <span class="logo-node">P</span>
        <span class="logo-link"></span>
        <span class="logo-node">T</span>
        <span class="logo-link"></span>
        <span class="logo-node">U</span>
      </a>
    </header>

    <div class="breadcrumb-strip">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <template v-for="(crumb, index) in currentPage.breadcrumbs" :key="`${crumb}-${index}`">
          <button
            class="breadcrumb"
            type="button"
            :disabled="index === currentPage.breadcrumbs.length - 1"
            @click="index === 0 ? goTo('/') : undefined"
          >
            {{ index === 0 ? "1:" : crumb }}
          </button>
          <span v-if="index < currentPage.breadcrumbs.length - 1" class="breadcrumb-divider">/</span>
        </template>
      </nav>
    </div>

    <article class="article-shell">
      <main class="lesson-content">
        <h2>{{ pageTitle(currentPage) }}</h2>
        <h3 v-if="currentPage.phaseId === 'exercises'" class="exercise-label">Aufgaben</h3>
        <div
          ref="lessonHtmlRef"
          class="lesson-html"
          :class="{ 'lesson-html--exercises': currentPage.phaseId === 'exercises' }"
          v-html="currentPage.html"
        ></div>
        <nav class="page-nav" aria-label="Seitenwechsel">
          <button type="button" :disabled="!previousPage" @click="previousPage && goTo(previousPage.route)">
            ‹ {{ previousPage ? previousPage.phaseTitle || previousPage.title : "Vorherige Seite" }}
          </button>
          <button type="button" :disabled="!nextPage" @click="nextPage && goTo(nextPage.route)">
            {{ nextPage ? nextPage.phaseTitle || nextPage.title : "Nächste Seite" }} ›
          </button>
        </nav>
      </main>

      <aside class="side-menu" :class="{ 'side-menu-open': menuOpen }">
        <nav class="mainnav" aria-label="Inhaltsverzeichnis">
          <ul>
            <li class="menuitem">
              <button
                class="menulink menulink-home"
                :class="{ 'menulink--current': currentPage.route === '/' }"
                type="button"
                @click="goTo('/')"
              >
                <span class="menulink__counter">⌂</span>
                <span class="menulink__text">Startseite</span>
              </button>
            </li>
            <li class="menuitem menuitem--open">
              <button class="menulink menulink--path" type="button" @click="goTo('/')">
                <span class="menulink__counter">{{ siteNavigation.topic.number }}</span>
                <span class="menulink__text">{{ siteNavigation.topic.title }}</span>
              </button>
              <ul>
                <li
                  v-for="module in siteNavigation.modules"
                  :key="module.id"
                  class="menuitem"
                  :class="{
                    'menuitem--open': currentModule?.id === module.id,
                    'menuitem--closed': currentModule?.id !== module.id,
                  }"
                >
                  <button
                    class="menulink"
                    :class="{ 'menulink--path': currentModule?.id === module.id }"
                    type="button"
                    @click="goTo(module.route)"
                  >
                    <span class="menuitem__sign">{{ currentModule?.id === module.id ? "-" : "+" }}</span>
                    <span class="menulink__counter">{{ module.number }}</span>
                    <span class="menulink__text">{{ module.title }}</span>
                  </button>
                  <ul v-show="currentModule?.id === module.id">
                    <li v-for="phase in module.phases" :key="phase.id" class="menuitem">
                      <button
                        class="menulink phase-link"
                        :class="{ 'menulink--current': currentPage.route === phase.route }"
                        type="button"
                        @click="goTo(phase.route)"
                      >
                        <span class="menulink__counter">{{ phase.number }}</span>
                        <span class="menulink__text">{{ phase.title }}</span>
                      </button>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </aside>
    </article>
  </div>
</template>
