# Self-Hosted Clustering Learning Site

This repository now builds a standalone German learning site for clustering.
The site is served from `/` and is designed to visually follow the inf-schule
theme and navigation style without depending on inf-schule hosting, `inhalt.txt`
files, iframe embedding, or `/playground`.

## Current Stack

- `Vue 3` + `Vite` for the self-hosted site shell
- `Vue Custom Elements` for interactive learning widgets
- `YAML` and `CSV` as editable source material
- generated runtime JSON for content, navigation, and datasets
- `Vitest` for JavaScript logic, component, content, and site tests

## Setup

```bash
npm install
```

## Main Commands

Generate runtime JSON from YAML and CSV:

```bash
npm run generate:runtime
```

Start the local site:

```bash
npm run dev
```

Then open:

- `http://127.0.0.1:4173/`

Build the static site:

```bash
npm run build
```

Run tests and a production build:

```bash
npm test
```

## Content Model

The learner-facing site exposes one topic, `Konzepte des unüberwachten Lernens`, with four
published modules. Each module is rendered as four standard phase routes:

- `Erkundung`
- `Strukturierung`
- `Fachkonzept`
- `Übungen`

The runtime navigation is generated from the YAML content and module config into
[generated/runtime/navigation.de.json](/Users/amanmulani/workspace/personal/mthesis/generated/runtime/navigation.de.json).

Adding a future module should usually mean:

1. add the module YAML content
2. add the module to the published module config in the generator
3. provide the four standard phase keys
4. add a custom element only if the module needs a new interaction

## Repository Overview

- [index.html](/Users/amanmulani/workspace/personal/mthesis/index.html): root Vite entry
- [ce-src/site](/Users/amanmulani/workspace/personal/mthesis/ce-src/site): self-hosted site shell, navigation, and theme
- [ce-src/components](/Users/amanmulani/workspace/personal/mthesis/ce-src/components): interactive custom elements
- [ce-src/lib](/Users/amanmulani/workspace/personal/mthesis/ce-src/lib): shared browser-side logic
- [content/de](/Users/amanmulani/workspace/personal/mthesis/content/de): German YAML source content
- [data](/Users/amanmulani/workspace/personal/mthesis/data): CSV source datasets
- [generated/runtime](/Users/amanmulani/workspace/personal/mthesis/generated/runtime): generated JSON runtime assets
- [scripts](/Users/amanmulani/workspace/personal/mthesis/scripts): generation helpers
- [tests-js](/Users/amanmulani/workspace/personal/mthesis/tests-js): JavaScript test suite

## Historical Notes

Older inf-schule export scripts and docs may still exist as migration history,
but the primary production target is now the self-hosted root site.
