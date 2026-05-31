<script setup>
import { computed, ref } from "vue";

import BaseScatterPlot from "./internal/BaseScatterPlot.vue";
import { moduleContent } from "@/lib/content.js";
import { loadDataset } from "@/lib/datasets.js";
import { buildDensityComparison, summarizeDensityPatterns } from "@/lib/module4-density.js";

const content = moduleContent("module4");
const rows = loadDataset("density_examples");
const showNoise = ref(true);

const summary = summarizeDensityPatterns(rows);
const points = computed(() => buildDensityComparison(rows, { showNoise: showNoise.value }));

function centerColor(point) {
  return point.center_cluster === "links" ? "#2563eb" : "#f97316";
}

function densityColor(point) {
  if (point.density_cluster === "Kompakte Wolke") return "#2563eb";
  if (point.density_cluster === "Kettenstruktur") return "#16a34a";
  return "#dc2626";
}
</script>

<template>
  <section class="shell">
    <div class="toolbar card">
      <label class="toggle">
        <input v-model="showNoise" type="checkbox" />
        {{ content.concept.interactive.toggle_label }}
      </label>
      <span>{{ content.concept.interactive.compact_label }}: {{ summary.compact }}</span>
      <span>{{ content.concept.interactive.chain_label }}: {{ summary.chain }}</span>
      <span>{{ content.concept.interactive.noise_label }}: {{ summary.noise }}</span>
    </div>

    <div class="comparison-grid">
      <article class="card">
        <h4>{{ content.concept.interactive.center_heading }}</h4>
        <BaseScatterPlot
          :points="points"
          x-key="x"
          y-key="y"
          x-label="Merkmal X"
          y-label="Merkmal Y"
          :x-domain="[0, 12]"
          :y-domain="[0, 10]"
          :width="460"
          :height="320"
        >
          <template #default="{ scaleX, scaleY }">
            <g v-for="point in points" :key="`center-${point.point_id}`">
              <circle
                :cx="scaleX(point.x)"
                :cy="scaleY(point.y)"
                r="8"
                :fill="centerColor(point)"
                :stroke="point.is_noise ? '#111827' : '#ffffff'"
                stroke-width="2"
              />
            </g>
          </template>
        </BaseScatterPlot>
        <p class="small">{{ content.concept.interactive.center_caption }}</p>
      </article>

      <article class="card">
        <h4>{{ content.concept.interactive.density_heading }}</h4>
        <BaseScatterPlot
          :points="points"
          x-key="x"
          y-key="y"
          x-label="Merkmal X"
          y-label="Merkmal Y"
          :x-domain="[0, 12]"
          :y-domain="[0, 10]"
          :width="460"
          :height="320"
        >
          <template #default="{ scaleX, scaleY }">
            <g v-for="point in points" :key="`density-${point.point_id}`">
              <circle
                :cx="scaleX(point.x)"
                :cy="scaleY(point.y)"
                r="8"
                :fill="densityColor(point)"
                :stroke="point.is_noise ? '#111827' : '#ffffff'"
                stroke-width="2"
              />
            </g>
          </template>
        </BaseScatterPlot>
        <p class="small">{{ content.concept.interactive.density_caption }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shell,
.comparison-grid {
  display: grid;
  gap: 1rem;
}

.comparison-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.card {
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: #f8fbfe;
  padding: 1rem;
}

.toolbar,
.toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.small {
  color: #31475f;
}
</style>
