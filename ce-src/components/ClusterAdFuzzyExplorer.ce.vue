<script setup>
import { computed, ref } from "vue";

import BaseScatterPlot from "./internal/BaseScatterPlot.vue";
import { moduleContent } from "@/lib/content.js";
import { loadDataset } from "@/lib/datasets.js";
import { buildFuzzyPlotPoints } from "@/lib/module4-fuzzy.js";

const content = moduleContent("module4");
const baseAds = loadDataset("ads_fuzzy");
const focusPercent = ref(50);

const points = computed(() => buildFuzzyPlotPoints(baseAds, focusPercent.value));
const hybridAd = computed(() => points.value.find((point) => point.role === "hybrid"));

function pointColor(point) {
  if (point.role === "hybrid") return "#7c3aed";
  return point.ad_group === "Tech" ? "#2563eb" : "#f59e0b";
}

function labelX(point, scaleX) {
  return point.tech_score >= 70 ? scaleX(point.tech_score) - 14 : scaleX(point.tech_score) + 12;
}

function labelAnchor(point) {
  return point.tech_score >= 70 ? "end" : "start";
}

function barStyle(value, color) {
  return {
    width: `${value}%`,
    background: color,
  };
}
</script>

<template>
  <section class="shell">
    <div class="card">
      <h4>{{ content.exploration.interactive.heading }}</h4>
      <label class="slider-row">
        <span>{{ content.exploration.interactive.slider_left }}</span>
        <input v-model="focusPercent" type="range" min="0" max="100" />
        <span>{{ content.exploration.interactive.slider_right }}</span>
      </label>
      <p class="small">
        {{ content.exploration.interactive.slider_label }}: {{ focusPercent }}%
      </p>
      <div class="legend-row">
        <span class="legend-pill"><span class="legend-dot style-dot" /> Style-Anker</span>
        <span class="legend-pill"><span class="legend-dot tech-dot" /> Tech-Anker</span>
        <span class="legend-pill"><span class="legend-dot hybrid-dot" /> Smartwatch-Hybrid</span>
      </div>

      <BaseScatterPlot
        :points="points"
        x-key="tech_score"
        y-key="style_score"
        x-label="Technikinteresse"
        y-label="Stilinteresse"
        :x-domain="[0, 100]"
        :y-domain="[0, 100]"
        :width="620"
        :height="380"
      >
        <template #default="{ scaleX, scaleY }">
          <g v-for="point in points" :key="point.ad_id">
            <circle
              :cx="scaleX(point.tech_score)"
              :cy="scaleY(point.style_score)"
              r="10"
              :fill="pointColor(point)"
              stroke="#ffffff"
              stroke-width="2"
            />
            <text
              :x="labelX(point, scaleX)"
              :y="scaleY(point.style_score) - 8"
              class="annotation"
              :text-anchor="labelAnchor(point)"
            >
              {{ point.display_name_de }}
            </text>
          </g>
        </template>
      </BaseScatterPlot>
      <p class="small">{{ content.exploration.interactive.plot_caption }}</p>
    </div>

    <div class="card">
      <h4>{{ content.exploration.interactive.membership_heading }}</h4>
      <div class="bar-group">
        <strong>{{ content.exploration.interactive.tech_label }}</strong>
        <div class="bar-shell"><div class="bar-fill" :style="barStyle(hybridAd.memberships.tech, '#2563eb')" /></div>
        <span>{{ hybridAd.memberships.tech }}%</span>
      </div>
      <div class="bar-group">
        <strong>{{ content.exploration.interactive.style_label }}</strong>
        <div class="bar-shell"><div class="bar-fill" :style="barStyle(hybridAd.memberships.style, '#f59e0b')" /></div>
        <span>{{ hybridAd.memberships.style }}%</span>
      </div>
      <p class="small">
        {{
          content.exploration.interactive.explanation_template
            .replace("{tech}", String(hybridAd.memberships.tech))
            .replace("{style}", String(hybridAd.memberships.style))
        }}
      </p>
      <p class="small">
        Smartwatch-Position: ({{ hybridAd.tech_score }}, {{ hybridAd.style_score }})
      </p>
    </div>
  </section>
</template>

<style scoped>
.shell {
  display: grid;
  gap: 1rem;
}

.card {
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: #f8fbfe;
  padding: 1rem;
}

.slider-row,
.bar-group {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.slider-row input {
  width: 100%;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: 1px solid #d6e2ed;
  background: #ffffff;
  padding: 0.3rem 0.7rem;
  color: #31475f;
  font-size: 0.95rem;
}

.legend-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  display: inline-block;
}

.style-dot {
  background: #f59e0b;
}

.tech-dot {
  background: #2563eb;
}

.hybrid-dot {
  background: #7c3aed;
}

.bar-group + .bar-group {
  margin-top: 0.85rem;
}

.bar-shell {
  min-height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: #dce8f4;
}

.bar-fill {
  min-height: 14px;
  border-radius: 999px;
}

.annotation,
.small {
  color: #31475f;
  fill: #31475f;
}
</style>
