<script setup>
import { computed, onMounted, ref, watch } from "vue";

import BaseScatterPlot from "./internal/BaseScatterPlot.vue";
import { moduleContent } from "@/lib/content.js";
import { loadDataset } from "@/lib/datasets.js";
import { formatNumber, formatPoint } from "@/lib/formatters.js";
import { advanceKmeansIteration, assignKmeansStep, initializeKmeansStepper, recomputeKmeansStep } from "@/lib/kmeans-stepper.js";
import { buildAssignmentConnections, buildCenterTeachingCards } from "@/lib/kmeans-teaching.js";
import { trackTelemetryEvent } from "@/lib/telemetry.js";

const content = moduleContent("module3");
const schoolyard2d = loadDataset("schoolyard_2d");
const schoolyardK3 = loadDataset("schoolyard_k3_2d");

const selectedK = ref(2);
const selectedPresetKey = ref("iterative");
const showLabels = ref(false);
const showDistances = ref(true);
const stepperState = ref(null);
const telemetryBase = {
  moduleId: "module3",
  sectionId: "structuring",
  componentId: "cluster-kmeans-stepper",
};

const presets = computed(() => content.structuring.stepper.presets[selectedK.value]);
const activePreset = computed(() => presets.value.find((preset) => preset.key === selectedPresetKey.value) ?? presets.value[0]);
const activeDataset = computed(() => (selectedK.value === 2 ? schoolyard2d : schoolyardK3));
const activePoints = computed(() => activeDataset.value.map((visitor) => [visitor.x, visitor.y]));
const axisTicks = computed(() => Array.from({ length: 13 }, (_, index) => index));
const chartConnections = computed(() => buildAssignmentConnections(activeDataset.value, stepperState.value?.currentCenters, stepperState.value?.assignments));
const teachingCards = computed(() => buildCenterTeachingCards(activeDataset.value, stepperState.value?.currentCenters, stepperState.value?.assignments, stepperState.value?.previousCenters));
const isAssignedStage = computed(() => stepperState.value?.stage === "assigned");
const isRecomputedStage = computed(() => stepperState.value?.stage === "recomputed");
const hasPendingConfigurationChange = computed(() => {
  if (!stepperState.value) return true;
  return (
    stepperState.value.k !== selectedK.value ||
    stepperState.value.presetKey !== activePreset.value.key
  );
});
const statusMessage = computed(() => {
  if (stepperState.value && hasPendingConfigurationChange.value) {
    return content.structuring.stepper.controls.changed_selection_notice;
  }
  if (!stepperState.value) return content.structuring.stepper.status_messages.not_started;
  if (stepperState.value.converged) return content.structuring.stepper.status_messages.stable;
  return content.structuring.stepper.status_messages[stepperState.value.stage];
});
const currentStepLabel = computed(() => {
  if (!stepperState.value) return content.structuring.stepper.controls.initialize_label;
  return content.structuring.stepper.summaries.current_step_values[stepperState.value.lastAction];
});
const teachingIntro = computed(() => {
  if (!stepperState.value) return content.structuring.stepper.teaching_panel.initialize_intro;
  if (stepperState.value.converged) return content.structuring.stepper.teaching_panel.converged_intro;
  if (stepperState.value.stage === "assigned") return content.structuring.stepper.teaching_panel.assigned_intro;
  if (stepperState.value.stage === "recomputed") return content.structuring.stepper.teaching_panel.recomputed_intro;
  return content.structuring.stepper.teaching_panel.initialize_intro;
});

onMounted(() => {
  trackTelemetryEvent("component_view", telemetryBase);
});

watch(selectedK, (value, oldValue) => {
  selectedPresetKey.value = content.structuring.stepper.presets[value][0].key;
  stepperState.value = null;
  trackTelemetryEvent("parameter_changed", {
    ...telemetryBase,
    controlId: "k",
    controlType: "select",
    oldValue,
    newValue: value,
  });
});

watch(selectedPresetKey, (value, oldValue) => {
  trackTelemetryEvent("parameter_changed", {
    ...telemetryBase,
    controlId: "preset",
    controlType: "select",
    oldValue,
    newValue: value,
  });
});

function resetStepper() {
  stepperState.value = null;
  trackTelemetryEvent("component_reset", telemetryBase);
}

function initialize() {
  stepperState.value = initializeKmeansStepper(activePreset.value.centers, { k: selectedK.value, presetKey: activePreset.value.key });
  trackTelemetryEvent("cluster_step_advanced", {
    ...telemetryBase,
    action: "initialize",
    k: selectedK.value,
    presetKey: activePreset.value.key,
  });
}

function assign() {
  stepperState.value = assignKmeansStep(stepperState.value, activePoints.value);
  trackTelemetryEvent("cluster_step_advanced", {
    ...telemetryBase,
    action: "assign",
    iteration: stepperState.value.iteration,
  });
}

function recompute() {
  stepperState.value = recomputeKmeansStep(stepperState.value, activePoints.value);
  trackTelemetryEvent("cluster_step_advanced", {
    ...telemetryBase,
    action: "recompute",
    iteration: stepperState.value.iteration,
  });
}

function nextIteration() {
  stepperState.value = advanceKmeansIteration(stepperState.value);
  trackTelemetryEvent("cluster_step_advanced", {
    ...telemetryBase,
    action: "next_iteration",
    iteration: stepperState.value.iteration,
  });
}

function trackToggle(controlId, value) {
  trackTelemetryEvent("parameter_changed", {
    ...telemetryBase,
    controlId,
    controlType: "checkbox",
    newValue: value,
  });
}

function clusterColor(index) {
  return ["#2563eb", "#f97316", "#7c3aed"][index] ?? "#2563eb";
}
</script>

<template>
  <section class="shell">
    <div class="card controls-card">
      <h4>{{ content.structuring.algorithm_heading }}</h4>
      <div class="controls">
        <label>{{ content.structuring.stepper.controls.k_label }} <select v-model="selectedK"><option :value="2">2</option><option :value="3">3</option></select></label>
        <label>{{ content.structuring.stepper.controls.preset_label }} <select v-model="selectedPresetKey"><option v-for="preset in presets" :key="preset.key" :value="preset.key">{{ preset.label }}</option></select></label>
        <label><input v-model="showLabels" type="checkbox" @change="trackToggle('show_labels', showLabels)" /> {{ content.structuring.stepper.controls.show_labels_label }}</label>
        <label><input v-model="showDistances" type="checkbox" @change="trackToggle('show_distances', showDistances)" /> {{ content.structuring.stepper.controls.show_distance_label }}</label>
      </div>
      <div class="actions">
        <button :disabled="stepperState && !hasPendingConfigurationChange" @click="initialize">{{ content.structuring.stepper.controls.initialize_label }}</button>
        <button :disabled="!stepperState || stepperState.stage !== 'initialized'" @click="assign">{{ content.structuring.stepper.controls.assign_label }}</button>
        <button :disabled="!stepperState || stepperState.stage !== 'assigned'" @click="recompute">{{ content.structuring.stepper.controls.recompute_label }}</button>
        <button :disabled="!stepperState || stepperState.stage !== 'recomputed'" @click="nextIteration">{{ content.structuring.stepper.controls.next_iteration_label }}</button>
        <button @click="resetStepper">{{ content.structuring.stepper.controls.reset_label }}</button>
      </div>
      <p class="status">{{ statusMessage }}</p>
    </div>

    <div class="teaching-layout">
      <div class="card plot-card">
        <BaseScatterPlot :points="activeDataset" x-key="x" y-key="y" x-label="x-Position auf dem Schulhof" y-label="y-Position auf dem Schulhof" :x-domain="[0, 12]" :y-domain="[0, 12]" :x-ticks="axisTicks" :y-ticks="axisTicks" :width="620" :height="420" :tick-font-size="11" :axis-label-font-size="11">
          <template #default="{ scaleX, scaleY }">
            <template v-if="showDistances && isAssignedStage">
              <g v-for="connection in chartConnections" :key="`distance-${connection.visitor.visitor_id}`">
                <line :x1="scaleX(connection.visitor.x)" :x2="scaleX(connection.center[0])" :y1="scaleY(connection.visitor.y)" :y2="scaleY(connection.center[1])" :stroke="clusterColor(connection.centerIndex)" stroke-dasharray="5 4" stroke-width="2" />
                <text :x="(scaleX(connection.visitor.x) + scaleX(connection.center[0])) / 2 + 4" :y="(scaleY(connection.visitor.y) + scaleY(connection.center[1])) / 2 - 4" class="distance-label">{{ formatNumber(connection.distance) }}</text>
              </g>
            </template>

            <g v-for="(visitor, index) in activeDataset" :key="visitor.visitor_id">
              <circle :cx="scaleX(visitor.x)" :cy="scaleY(visitor.y)" r="8" :fill="stepperState?.assignments ? clusterColor(stepperState.assignments[index]) : '#64748b'" />
              <text v-if="showLabels" :x="scaleX(visitor.x)" :y="scaleY(visitor.y) - 12" text-anchor="middle" class="annotation">{{ visitor.visitor_id }}</text>
            </g>

            <g v-if="isRecomputedStage && stepperState?.previousCenters">
              <circle v-for="(center, index) in stepperState.previousCenters" :key="`old-${index}`" :cx="scaleX(center[0])" :cy="scaleY(center[1])" r="10" fill="white" :stroke="clusterColor(index)" stroke-width="3" />
            </g>

            <g v-if="stepperState?.currentCenters">
              <rect v-for="(center, index) in stepperState.currentCenters" :key="`new-${index}`" :x="scaleX(center[0]) - 9" :y="scaleY(center[1]) - 9" width="18" height="18" :fill="clusterColor(index)" rx="4" />
            </g>
          </template>
        </BaseScatterPlot>
      </div>
    </div>

    <div class="stats-grid">
      <div class="card"><strong>{{ content.structuring.stepper.summaries.iteration_label }}</strong><span>{{ stepperState?.iteration ?? 1 }}</span></div>
      <div class="card"><strong>{{ content.structuring.stepper.summaries.current_step_label }}</strong><span>{{ currentStepLabel }}</span></div>
      <div class="card"><strong>{{ content.structuring.stepper.summaries.active_config_label }}</strong><span>k = {{ selectedK }} / {{ activePreset.label }}</span></div>
    </div>

    <div class="details-layout">
      <div class="card narrative-card">
        <h4>{{ content.structuring.stepper.teaching_panel.heading }}</h4>
        <p>{{ teachingIntro }}</p>
        <p class="status">{{ activePreset.description }}</p>
      </div>

      <div class="card center-board">
        <div class="center-grid">
          <div v-for="card in teachingCards.length ? teachingCards : buildCenterTeachingCards(activeDataset, activePreset.centers, null)" :key="`card-${card.centerIndex}`" class="mini-card">
            <strong>C{{ card.centerIndex + 1 }}</strong>
            <span>{{ content.structuring.stepper.teaching_panel.current_center_label }}: {{ formatPoint(card.center[0], card.center[1]) }}</span>
            <span v-if="card.previousCenter">{{ content.structuring.stepper.teaching_panel.previous_center_label }}: {{ formatPoint(card.previousCenter[0], card.previousCenter[1]) }}</span>
            <span v-if="card.visitorIds.length">{{ content.structuring.stepper.teaching_panel.assigned_visitors_label }}: {{ card.visitorIds.join(', ') }}</span>
            <span v-else>{{ content.structuring.stepper.teaching_panel.assigned_visitors_label }}: -</span>
            <template v-if="isRecomputedStage && card.xFormula && card.yFormula">
              <strong>{{ content.structuring.stepper.teaching_panel.formulas_heading }}</strong>
              <span>{{ card.xFormula }}</span>
              <span>{{ card.yFormula }}</span>
            </template>
            <span v-else-if="isRecomputedStage">{{ content.structuring.stepper.teaching_panel.no_points_note }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="stepperState?.history?.length" class="card history-card">
      <h4>{{ content.structuring.stepper.summaries.history_heading }}</h4>
      <p class="status">{{ content.structuring.stepper.summaries.history_intro }}</p>
      <table class="history-table">
        <thead>
          <tr>
            <th>{{ content.structuring.stepper.summaries.history_iteration_label }}</th>
            <th v-for="(center, index) in stepperState.currentCenters" :key="`history-head-${index}`">
              {{ content.structuring.stepper.summaries.history_center_label_template.replace('{index}', String(index + 1)) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in stepperState.history" :key="`history-row-${entry.iteration}`">
            <td>{{ entry.iteration }}</td>
            <td v-for="(delta, index) in entry.deltas" :key="`history-delta-${entry.iteration}-${index}`">
              {{ formatNumber(delta) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="stepperState.converged" class="status">{{ content.structuring.stepper.summaries.history_stable_note }}</p>
    </div>
  </section>
</template>

<style scoped>
.shell, .stats-grid, .center-grid, .details-layout { display: grid; gap: 1rem; }
.teaching-layout { display: grid; grid-template-columns: 1fr; gap: 1rem; align-items: start; }
.stats-grid { grid-template-columns: repeat(3, 1fr); }
.details-layout { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); align-items: start; }
.center-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.card, .mini-card { border: 1px solid #d6e2ed; border-radius: 16px; background: #f8fbfe; padding: 1rem; }
.controls, .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.85rem; }
.actions button { border: 1px solid #c6d7e6; border-radius: 999px; background: white; padding: 0.5rem 0.85rem; font: inherit; }
.status, .annotation, .distance-label { color: #31475f; }
.distance-label {
  font-size: 12px;
  font-weight: 800;
  fill: #102a43;
  stroke: rgba(255, 255, 255, 0.98);
  stroke-width: 4px;
  paint-order: stroke fill;
  letter-spacing: 0.01em;
}
.stats-grid span, .mini-card span { display: block; margin-top: 0.35rem; }
.history-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
.history-table th, .history-table td { border: 1px solid #d6e2ed; padding: 0.6rem 0.75rem; text-align: left; background: #ffffff; }
</style>
