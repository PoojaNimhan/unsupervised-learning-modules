<script setup>
import { computed, onMounted, ref, watch } from "vue";

import { moduleContent } from "@/lib/content.js";
import { formatDecimal } from "@/lib/formatters.js";
import { buildDistanceMatrix } from "@/lib/kmeans-distance.js";
import { trackTelemetryEvent } from "@/lib/telemetry.js";

const content = moduleContent("module3").exercises.distance_helper;
const telemetryBase = {
  moduleId: "module3",
  sectionId: "exercises",
  componentId: "cluster-kmeans-distance-exercise",
  exerciseId: "distance-helper",
};

function createCoordinateRows(count, previousRows = []) {
  return Array.from({ length: count }, (_, index) => ({
    x: previousRows[index]?.x ?? "",
    y: previousRows[index]?.y ?? "",
  }));
}

function createPointRow() {
  return { x: "", y: "" };
}

const clusterCount = ref(2);
const centers = ref(createCoordinateRows(clusterCount.value));
const points = ref([createPointRow(), createPointRow()]);
const results = ref(null);
const validationMessage = ref("");

onMounted(() => {
  trackTelemetryEvent("component_view", telemetryBase);
});

watch(clusterCount, (nextCount) => {
  centers.value = createCoordinateRows(nextCount, centers.value);
  results.value = null;
  validationMessage.value = "";
});

function addPoint() {
  points.value = [...points.value, createPointRow()];
  results.value = null;
  validationMessage.value = "";
  trackTelemetryEvent("component_interaction", {
    ...telemetryBase,
    action: "add_point",
    pointCount: points.value.length,
  });
}

function removePoint(index) {
  if (points.value.length === 1) return;
  points.value = points.value.filter((_, pointIndex) => pointIndex !== index);
  results.value = null;
  validationMessage.value = "";
  trackTelemetryEvent("component_interaction", {
    ...telemetryBase,
    action: "remove_point",
    pointCount: points.value.length,
  });
}

function sanitizeClusterCount(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(5, Math.max(1, parsed));
}

function setClusterCount(value) {
  const oldValue = clusterCount.value;
  clusterCount.value = sanitizeClusterCount(value);
  trackTelemetryEvent("parameter_changed", {
    ...telemetryBase,
    controlId: "cluster_count",
    controlType: "number",
    oldValue,
    newValue: clusterCount.value,
  });
}

function parseCoordinates(rows) {
  return rows.map((row) => [Number(row.x), Number(row.y)]);
}

const pointLabels = computed(() =>
  points.value.map((_, index) =>
    content.point_label_template.replace("{index}", String(index + 1))
  )
);

function calculateDistances() {
  trackTelemetryEvent("exercise_started", telemetryBase);
  const hasIncompleteCenter = centers.value.some((center) => center.x === "" || center.y === "");
  const hasIncompletePoint = points.value.some((point) => point.x === "" || point.y === "");
  if (hasIncompleteCenter || hasIncompletePoint) {
    validationMessage.value = content.validation_missing_coordinates;
    results.value = null;
    trackTelemetryEvent("exercise_answered", {
      ...telemetryBase,
      result: "invalid",
      reason: "missing_coordinates",
    });
    return;
  }

  const parsedCenters = parseCoordinates(centers.value);
  const parsedPoints = parseCoordinates(points.value);
  const hasInvalidValue = [...parsedCenters, ...parsedPoints].some((row) =>
    row.some((value) => Number.isNaN(value))
  );
  if (hasInvalidValue) {
    validationMessage.value = content.validation_invalid_numbers;
    results.value = null;
    trackTelemetryEvent("exercise_answered", {
      ...telemetryBase,
      result: "invalid",
      reason: "invalid_numbers",
    });
    return;
  }

  validationMessage.value = "";
  results.value = buildDistanceMatrix(parsedPoints, parsedCenters);
  trackTelemetryEvent("exercise_answered", {
    ...telemetryBase,
    result: "valid",
    centerCount: centers.value.length,
    pointCount: points.value.length,
  });
  trackTelemetryEvent("exercise_completed", telemetryBase);
}

function onCoordinateInput() {
  results.value = null;
  validationMessage.value = "";
  trackTelemetryEvent("component_interaction", {
    ...telemetryBase,
    action: "coordinate_input",
  });
}

function formatNumber(value) {
  return formatDecimal(value).replace(/,0$/, "");
}
</script>

<template>
  <section class="exercise-shell">
    <h4>{{ content.heading }}</h4>
    <p>{{ content.intro }}</p>

    <div class="card section-card">
      <label class="cluster-count-control">
        <span>{{ content.cluster_count_label }}</span>
        <input
          :value="clusterCount"
          type="number"
          min="1"
          max="5"
          @input="setClusterCount($event.target.value)"
        />
      </label>
    </div>

    <div class="card section-card centers-card">
      <h5>{{ content.centers_heading }}</h5>
      <div class="row-grid row-grid--header centers-row">
        <strong>{{ content.label_column }}</strong>
        <div class="coordinate-pair coordinate-pair--header">
          <strong>{{ content.x_label }}</strong>
          <strong>{{ content.y_label }}</strong>
        </div>
      </div>
      <div v-for="(center, index) in centers" :key="`center-${index}`" class="row-grid centers-row">
        <span>{{ content.center_label_template.replace("{index}", String(index + 1)) }}</span>
        <div class="coordinate-pair">
          <input v-model="center.x" type="number" step="any" @input="onCoordinateInput" />
          <input v-model="center.y" type="number" step="any" @input="onCoordinateInput" />
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="points-header">
        <h5>{{ content.points_heading }}</h5>
        <button type="button" @click="addPoint">{{ content.add_point_label }}</button>
      </div>
      <div class="row-grid row-grid--header points-row">
        <strong>{{ content.label_column }}</strong>
        <div class="coordinate-pair coordinate-pair--header">
          <strong>{{ content.x_label }}</strong>
          <strong>{{ content.y_label }}</strong>
        </div>
        <strong>{{ content.actions_label }}</strong>
      </div>
      <div v-for="(point, index) in points" :key="`point-${index}`" class="row-grid points-row">
        <span>{{ pointLabels[index] }}</span>
        <div class="coordinate-pair">
          <input v-model="point.x" type="number" step="any" @input="onCoordinateInput" />
          <input v-model="point.y" type="number" step="any" @input="onCoordinateInput" />
        </div>
        <button
          type="button"
          :disabled="points.length === 1"
          @click="removePoint(index)"
        >
          {{ content.remove_point_label }}
        </button>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="primary-action" @click="calculateDistances">
        {{ content.calculate_label }}
      </button>
    </div>

    <p v-if="validationMessage" class="validation-message">{{ validationMessage }}</p>

    <div v-if="results" class="card section-card">
      <h5>{{ content.results_heading }}</h5>
      <div class="results-table-wrapper">
        <table class="results-table">
          <thead>
            <tr>
              <th>{{ content.point_column_label }}</th>
              <th v-for="(_, index) in centers" :key="`head-${index}`">
                {{ content.center_label_template.replace("{index}", String(index + 1)) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in results" :key="`row-${rowIndex}`">
              <td>
                {{ pointLabels[rowIndex] }} = ({{ formatNumber(row.point[0]) }}, {{ formatNumber(row.point[1]) }})
              </td>
              <td v-for="item in row.distances" :key="`distance-${rowIndex}-${item.centerIndex}`">
                {{ formatNumber(item.distance) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.exercise-shell,
.section-card {
  display: grid;
  gap: 1rem;
}

.card {
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: #f8fbfe;
  padding: 1rem;
}

.cluster-count-control,
.row-grid {
  display: grid;
  gap: 0.75rem;
  align-items: center;
}

.cluster-count-control {
  max-width: 14rem;
}

.row-grid {
  column-gap: 1.5rem;
  row-gap: 0.9rem;
}

.row-grid--header {
  color: #31475f;
}

.centers-row {
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 24rem);
}

.points-row {
  grid-template-columns: minmax(0, 1fr) minmax(20rem, 24rem) minmax(10rem, 12rem);
}

.coordinate-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(9rem, 1fr));
  gap: 1.5rem;
  align-items: center;
}

.coordinate-pair--header {
  gap: 1.5rem;
}

.points-header,
.actions {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

input,
button {
  font: inherit;
  box-sizing: border-box;
}

input {
  width: 100%;
  min-width: 0;
  border: 1px solid #c6d7e6;
  border-radius: 12px;
  padding: 0.5rem 0.7rem;
  background: #ffffff;
}

button {
  min-width: 0;
  border: 1px solid #c6d7e6;
  border-radius: 999px;
  background: #ffffff;
  padding: 0.5rem 0.85rem;
}

.primary-action {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.validation-message {
  color: #9f1239;
  font-weight: 600;
}

.results-table-wrapper {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th,
.results-table td {
  border: 1px solid #d6e2ed;
  padding: 0.6rem 0.75rem;
  text-align: left;
  background: #ffffff;
}

@media (max-width: 760px) {
  .row-grid,
  .centers-row,
  .points-row,
  .row-grid--header,
  .coordinate-pair {
    grid-template-columns: 1fr;
  }

  .coordinate-pair--header {
    gap: 0.75rem;
  }

  .points-header,
  .actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
