<script setup>
import { computed, ref } from "vue";

import { moduleContent } from "@/lib/content.js";
import { loadDataset } from "@/lib/datasets.js";
import {
  buildAdHierarchy,
  buildHierarchyDendrogram,
  groupsAtCutPercent,
} from "@/lib/module4-hierarchy.js";

const content = moduleContent("module4");
const ads = loadDataset("ads_hierarchical");
const cutPercent = ref(35);
const hierarchy = buildAdHierarchy(ads);

const activeCut = computed(() => groupsAtCutPercent(hierarchy, cutPercent.value));
const dendrogram = computed(() => buildHierarchyDendrogram(hierarchy, activeCut.value));

const chartWidth = 760;
const chartHeight = 360;
const margin = { top: 28, right: 24, bottom: 132, left: 72 };

function colorFor(index) {
  return ["#2563eb", "#f97316", "#7c3aed", "#16a34a", "#dc2626"][index] ?? "#2563eb";
}

function scaleX(leafIndex) {
  const plotWidth = chartWidth - margin.left - margin.right;
  const steps = Math.max(dendrogram.value.leafCount - 1, 1);
  return margin.left + (leafIndex / steps) * plotWidth;
}

function scaleY(distance) {
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const maxDistance = Math.max(dendrogram.value.maxDistance, 1);
  return chartHeight - margin.bottom - (distance / maxDistance) * plotHeight;
}
</script>

<template>
  <section class="shell">
    <div class="card">
      <h4>{{ content.structuring.interactive.heading }}</h4>
      <label class="slider-label">
        {{ content.structuring.interactive.slider_label }}: {{ cutPercent }}%
        <input v-model="cutPercent" type="range" min="0" max="100" />
      </label>
      <div class="stats">
        <div class="pill">
          <strong>{{ content.structuring.interactive.cluster_count_label }}</strong>
          <span>{{ activeCut.groups.length }}</span>
        </div>
        <div class="pill">
          <strong>{{ content.structuring.interactive.threshold_label }}</strong>
          <span>{{ activeCut.threshold }}</span>
        </div>
      </div>
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="tree-plot">
        <line
          v-for="tick in 5"
          :key="`tick-${tick}`"
          :x1="margin.left"
          :x2="chartWidth - margin.right"
          :y1="margin.top + ((chartHeight - margin.top - margin.bottom) * (tick - 1)) / 4"
          :y2="margin.top + ((chartHeight - margin.top - margin.bottom) * (tick - 1)) / 4"
          class="grid"
        />
        <line
          :x1="margin.left"
          :x2="margin.left"
          :y1="margin.top"
          :y2="chartHeight - margin.bottom"
          class="axis"
        />
        <line
          :x1="margin.left"
          :x2="chartWidth - margin.right"
          :y1="chartHeight - margin.bottom"
          :y2="chartHeight - margin.bottom"
          class="axis"
        />

        <g v-for="tick in 5" :key="`label-${tick}`">
          <text
            :x="margin.left - 10"
            :y="margin.top + ((chartHeight - margin.top - margin.bottom) * (tick - 1)) / 4 + 4"
            text-anchor="end"
            class="tick"
          >
            {{
              (
                dendrogram.maxDistance -
                (dendrogram.maxDistance * (tick - 1)) / 4
              ).toFixed(1)
            }}
          </text>
        </g>

        <line
          :x1="margin.left"
          :x2="chartWidth - margin.right"
          :y1="scaleY(activeCut.threshold)"
          :y2="scaleY(activeCut.threshold)"
          class="cut-line"
        />

        <line
          v-for="segment in dendrogram.segments"
          :key="segment.id"
          :x1="scaleX(segment.x1)"
          :y1="scaleY(segment.y1)"
          :x2="scaleX(segment.x2)"
          :y2="scaleY(segment.y2)"
          :class="segment.isActive ? 'segment-active' : 'segment-muted'"
        />

        <g v-for="leaf in dendrogram.leaves" :key="leaf.id">
          <circle
            :cx="scaleX(leaf.x)"
            :cy="chartHeight - margin.bottom"
            r="7"
            :fill="colorFor(leaf.colorIndex)"
            stroke="#ffffff"
            stroke-width="2"
          />
          <text
            :x="scaleX(leaf.x)"
            :y="chartHeight - margin.bottom + 20"
            class="leaf-label"
            :style="{ fill: colorFor(leaf.colorIndex) }"
            text-anchor="end"
            :transform="`rotate(-35 ${scaleX(leaf.x)} ${chartHeight - margin.bottom + 20})`"
          >
            {{ leaf.label }}
          </text>
        </g>

        <text
          :x="20"
          :y="chartHeight / 2"
          class="axis-label"
          :transform="`rotate(-90 20 ${chartHeight / 2})`"
        >
          Fusionsabstand
        </text>
      </svg>
    </div>

    <div class="detail-grid">
      <div class="card">
        <h4>{{ content.structuring.interactive.groups_heading }}</h4>
        <div v-for="group in activeCut.groups" :key="group.id" class="group-card">
          <strong :style="{ color: colorFor(group.colorIndex) }">Cluster {{ group.colorIndex + 1 }}</strong>
          <span>{{ group.labels.join(", ") }}</span>
        </div>
      </div>
      <div class="card">
        <h4>{{ content.structuring.interactive.merges_heading }}</h4>
        <ol class="merge-list">
          <li
            v-for="merge in hierarchy.merges"
            :key="merge.id"
            :class="{ active: merge.distance <= activeCut.threshold }"
          >
            Schritt {{ merge.step }}: {{ merge.labels.join(" + ") }} ({{ merge.distance }})
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<style scoped>
.shell,
.detail-grid {
  display: grid;
  gap: 1rem;
}

.detail-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.card,
.group-card {
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: #f8fbfe;
  padding: 1rem;
}

.tree-plot {
  width: 100%;
  display: block;
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f7fbff);
}

.slider-label,
.group-card {
  display: grid;
  gap: 0.6rem;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.8rem 0 1rem;
}

.pill {
  border-radius: 999px;
  background: white;
  border: 1px solid #c6d7e6;
  padding: 0.5rem 0.85rem;
}

.group-card + .group-card {
  margin-top: 0.75rem;
}

.merge-list {
  padding-left: 1.2rem;
}

.merge-list li {
  color: #64748b;
  margin-bottom: 0.55rem;
}

.grid {
  stroke: #d8e2ee;
  stroke-width: 1;
}

.axis {
  stroke: #546e7a;
  stroke-width: 1.2;
}

.cut-line {
  stroke: #dc2626;
  stroke-width: 2;
  stroke-dasharray: 7 6;
}

.segment-active {
  stroke: #18324c;
  stroke-width: 3;
}

.segment-muted {
  stroke: #9db0c3;
  stroke-width: 2;
}

.leaf-label,
.axis-label,
.merge-list li.active,
.tick {
  color: #31475f;
  fill: #31475f;
}

.leaf-label {
  font-size: 13px;
  font-weight: 600;
}

.axis-label {
  font-size: 13px;
  font-weight: 600;
}
</style>
