import navigation from "@generated/navigation.de.json";

export const siteNavigation = navigation;

export function normalizePath(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

export function pageForPath(pathname) {
  const path = normalizePath(pathname);
  return (
    siteNavigation.pages.find((page) => page.route === path) ??
    siteNavigation.pages.find((page) => page.route === "/")
  );
}

export function moduleForPage(page) {
  return siteNavigation.modules.find((module) => module.id === page.moduleId);
}

export function pageTitle(page) {
  if (page.route === "/") return page.title;
  return `${page.phaseTitle} - ${page.moduleTitle}`;
}
