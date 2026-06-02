<script setup>
import { computed, ref } from "vue";

import BaseScatterPlot from "./internal/BaseScatterPlot.vue";
import { moduleContent } from "@/lib/content.js";
import { loadDataset } from "@/lib/datasets.js";
import { axisLabel, formatPriceEur } from "@/lib/formatters.js";
import { compareScaledPropertyGroupings } from "@/lib/module2-kmeans.js";

const content = moduleContent("module2");
const listings = loadDataset("real_estate_broker");
const clusterDemo = loadDataset("real_estate_cluster_demo");
const neighborhood = loadDataset("neighborhood_planner");
const comparisonResults = compareScaledPropertyGroupings(clusterDemo);

const xAxis = ref("area_sqm");
const yAxis = ref("price_eur");
const highlightOutlier = ref(false);
const activeExerciseTab = ref("line");

const outlier = listings.find((listing) => listing.is_outlier);
const xOptions = ["area_sqm", "rooms", "price_eur"];
const yOptions = ["rooms", "price_eur", "condition_score"];

const linePoints = computed(() =>
  neighborhood.map((house) => ({
    ...house,
    cluster: house.living_area_unit < 6 ? "links" : "rechts",
  }))
);

function listingColor(listing) {
  if (highlightOutlier.value && listing.is_outlier) {
    return "#dc2626";
  }
  if (listing.condition_score === 3) return "#7c3aed";
  if (listing.condition_score === 2) return "#2563eb";
  return "#f97316";
}

function pointTitle(listing) {
  return `${listing.display_name}: ${listing.description}`;
}
</script>

<template>
  <section class="shell">
    <div class="card">
      <h4>{{ content.exploration.table_heading }}</h4>
      <div class="controls">
        <label>
          {{ content.exploration.controls.x_axis_label }}
          <select v-model="xAxis">
            <option v-for="option in xOptions" :key="option" :value="option">{{ axisLabel(option) }}</option>
          </select>
        </label>
        <label>
          {{ content.exploration.controls.y_axis_label }}
          <select v-model="yAxis">
            <option v-for="option in yOptions" :key="option" :value="option">{{ axisLabel(option) }}</option>
          </select>
        </label>
        <label class="checkbox">
          <input v-model="highlightOutlier" type="checkbox" />
          {{ content.exploration.controls.highlight_outlier_label }}
        </label>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Anzeige</th>
            <th>Fläche</th>
            <th>Zimmer</th>
            <th>Preis</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="listing in listings" :key="listing.listing_id">
            <td>{{ listing.display_name }}</td>
            <td>{{ listing.area_sqm }}</td>
            <td>{{ listing.rooms }}</td>
            <td>{{ formatPriceEur(listing.price_eur) }}</td>
          </tr>
        </tbody>
      </table>
      <BaseScatterPlot
        :points="listings"
        :x-key="xAxis"
        :y-key="yAxis"
        :x-label="axisLabel(xAxis)"
        :y-label="axisLabel(yAxis)"
        :tick-font-size="8"
        :axis-label-font-size="8"
      >
        <template #default="{ scaleX, scaleY }">
          <g v-for="listing in listings" :key="listing.listing_id">
            <circle
              :cx="scaleX(listing[xAxis])"
              :cy="scaleY(listing[yAxis])"
              r="7"
              :fill="listingColor(listing)"
              stroke="#ffffff"
              stroke-width="1.5"
            >
              <title>{{ pointTitle(listing) }}</title>
            </circle>
            <text v-if="highlightOutlier && listing.is_outlier" :x="scaleX(listing[xAxis]) + 10" :y="scaleY(listing[yAxis]) - 8" class="annotation">
              {{ content.exploration.outlier_annotation_label }}
            </text>
          </g>
        </template>
      </BaseScatterPlot>
      <p class="caption">{{ content.exploration.chart_caption }}</p>
      <p v-if="highlightOutlier" class="warning">
        {{
          content.exploration.outlier_explanation_template
            .replace("{x_label}", axisLabel(xAxis))
            .replace("{y_label}", axisLabel(yAxis))
            .replace("{x_value}", String(outlier[xAxis]))
            .replace("{y_value}", String(outlier[yAxis]))
        }}
      </p>
    </div>

    <div class="comparison-grid">
      <article v-for="result in comparisonResults" :key="result.k" class="card">
        <h4>{{ content.structuring.k_labels[result.k] }}</h4>
        <BaseScatterPlot
          :points="clusterDemo.filter((property) => !property.is_outlier)"
          x-key="living_area_unit"
          y-key="price_unit"
          x-label="Wohnbereich"
          y-label="Preis"
          :x-domain="[0, 10]"
          :y-domain="[0, 10]"
          :tick-font-size="8"
          :axis-label-font-size="8"
        >
          <template #default="{ scaleX, scaleY }">
            <g v-for="(property, index) in clusterDemo.filter((entry) => !entry.is_outlier)" :key="property.property_name">
              <circle
                :cx="scaleX(property.living_area_unit)"
                :cy="scaleY(property.price_unit)"
                r="7"
                :fill="['#2563eb', '#16a34a', '#7c3aed'][result.assignments[index]]"
              />
            </g>
          </template>
        </BaseScatterPlot>
        <p>{{ content.structuring.group_summary_template.replace("{group_sizes}", result.groupSizes.join(", ")) }}</p>
      </article>
    </div>

    <div class="card">
      <h4>{{ content.exercises.dataset_heading }}</h4>
      <p>{{ content.exercises.dataset_intro }}</p>
      <table class="table">
        <thead>
          <tr>
            <th>{{ content.exercises.table_columns[0] }}</th>
            <th>{{ content.exercises.table_columns[1] }}</th>
            <th>{{ content.exercises.table_columns[2] }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="house in neighborhood" :key="house.house_id">
            <td>{{ house.house_id }}</td>
            <td>{{ house.living_area_unit }}</td>
            <td>{{ house.price_unit }}</td>
          </tr>
        </tbody>
      </table>
      <p class="caption">{{ content.exercises.axis_note }}</p>
      <div class="tabs plot-tabs">
        <button
          v-for="tab in ['line', 'circles', 'outlier']"
          :key="tab"
          :class="{ active: activeExerciseTab === tab }"
          @click="activeExerciseTab = tab"
        >
          {{ content.exercises.tabs[tab].label }}
        </button>
      </div>
      <p v-if="content.exercises.tabs[activeExerciseTab].instruction" class="instruction">
        {{ content.exercises.tabs[activeExerciseTab].instruction }}
      </p>
      <p v-if="content.exercises.tabs[activeExerciseTab].intro">
        {{ content.exercises.tabs[activeExerciseTab].intro }}
      </p>
      <ul v-if="content.exercises.tabs[activeExerciseTab].items">
        <li v-for="item in content.exercises.tabs[activeExerciseTab].items" :key="item">
          {{ item }}
        </li>
      </ul>
      <ul v-if="content.exercises.tabs[activeExerciseTab].clusters">
        <li v-for="cluster in content.exercises.tabs[activeExerciseTab].clusters" :key="cluster">
          {{ cluster }}
        </li>
      </ul>
      <p
        v-for="paragraph in content.exercises.tabs[activeExerciseTab].paragraphs || []"
        :key="paragraph"
      >
        {{ paragraph }}
      </p>
      <BaseScatterPlot
        :points="linePoints"
        x-key="living_area_unit"
        y-key="price_unit"
        x-label="Wohnbereich"
        y-label="Preis"
        :x-domain="[0, 10]"
        :y-domain="[0, 10]"
        :tick-font-size="8"
        :axis-label-font-size="8"
      >
        <template #default="{ scaleX, scaleY }">
          <template v-if="activeExerciseTab === 'line'">
            <line :x1="scaleX(0)" :x2="scaleX(7.5)" :y1="scaleY(7.5)" :y2="scaleY(0)" class="separator" />
            <line :x1="scaleX(5)" :x2="scaleX(10)" :y1="scaleY(10)" :y2="scaleY(5)" class="separator" />
          </template>
          <template v-if="activeExerciseTab === 'circles'">
            <circle :cx="scaleX(1.7)" :cy="scaleY(2.3)" :r="42" class="area" />
            <circle :cx="scaleX(5.3)" :cy="scaleY(5.7)" :r="42" class="area" />
            <circle :cx="scaleX(9.3)" :cy="scaleY(9.7)" :r="42" class="area" />
          </template>
          <g v-for="house in neighborhood" :key="house.house_id">
            <circle
              :cx="scaleX(house.living_area_unit)"
              :cy="scaleY(house.price_unit)"
              r="7"
              :fill="activeExerciseTab === 'outlier' && house.is_outlier ? '#dc2626' : '#2563eb'"
            />
            <text :x="scaleX(house.living_area_unit) + 8" :y="scaleY(house.price_unit) - 6" class="annotation neighborhood-label">
              {{ house.house_id }}
            </text>
          </g>
        </template>
      </BaseScatterPlot>
      <p class="caption">{{ content.exercises.tabs[activeExerciseTab].takeaway }}</p>
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
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.card {
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: #f8fbfe;
  padding: 1rem;
}

.controls,
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.controls label,
.tabs button {
  font: inherit;
}

.tabs button {
  border: 1px solid #c6d7e6;
  border-radius: 999px;
  background: white;
  padding: 0.5rem 0.85rem;
}

.tabs button.active {
  background: #18324c;
  border-color: #18324c;
  color: white;
}

.annotation,
.caption {
  fill: #31475f;
  color: #31475f;
}

.warning {
  color: #9a3412;
}

.instruction {
  color: #18324c;
  font-weight: 600;
}

.neighborhood-label {
  font-size: 50%;
}

.separator {
  stroke: #0f172a;
  stroke-width: 2;
  stroke-dasharray: 6 5;
}

.area {
  fill: rgba(37, 99, 235, 0.12);
  stroke: #2563eb;
  stroke-dasharray: 5 4;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.table th,
.table td {
  border: 1px solid #d6e2ed;
  padding: 0.55rem 0.7rem;
  text-align: left;
}
</style>
