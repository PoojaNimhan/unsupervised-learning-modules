<script setup>
import { computed, onMounted, ref } from "vue";

import { loadDataset } from "@/lib/datasets.js";
import {
  defaultFoodGroupState,
  GROUP_KEYS,
  normalizeFoodGroupState,
} from "@/lib/food-groups.js";
import { foodLabel } from "@/lib/formatters.js";
import { moduleContent } from "@/lib/content.js";
import { trackTelemetryEvent } from "@/lib/telemetry.js";

const foods = loadDataset("foods");
const content = moduleContent("module1");
const foodNames = foods.map((food) => food.food_name);
const labels = Object.fromEntries(foods.map((food) => [food.food_name, foodLabel(food)]));

const groups = ref(defaultFoodGroupState(foodNames));
const draggedItem = ref(null);
const telemetryBase = {
  moduleId: "module1",
  sectionId: "exploration",
  componentId: "cluster-food-sorter",
};

onMounted(() => {
  trackTelemetryEvent("component_view", telemetryBase);
});

const tableRows = computed(() =>
  normalizeFoodGroupState(foodNames, groups.value).unassigned
    .concat(groups.value.group_a, groups.value.group_b)
    .map((foodName) => ({
      foodName,
      label: labels[foodName],
      group:
        groups.value.group_a.includes(foodName)
          ? content.exploration.group_a_label
          : groups.value.group_b.includes(foodName)
            ? content.exploration.group_b_label
            : content.exploration.unassigned_label,
    }))
);

function dropInto(groupKey) {
  if (!draggedItem.value) return;
  const normalized = normalizeFoodGroupState(foodNames, groups.value);
  for (const key of GROUP_KEYS) {
    normalized[key] = normalized[key].filter((name) => name !== draggedItem.value);
  }
  normalized[groupKey].push(draggedItem.value);
  groups.value = normalized;
  trackTelemetryEvent("component_interaction", {
    ...telemetryBase,
    action: "drop_food",
    itemId: draggedItem.value,
    targetGroup: groupKey,
  });
  draggedItem.value = null;
}

function resetState() {
  groups.value = defaultFoodGroupState(foodNames);
  trackTelemetryEvent("component_reset", telemetryBase);
}

function groupLabel(groupKey) {
  return {
    unassigned: content.exploration.unassigned_label,
    group_a: content.exploration.group_a_label,
    group_b: content.exploration.group_b_label,
  }[groupKey];
}

function describe(foodName) {
  return content.exploration.food_examples.find((item) => item.food_name === foodName)?.description;
}
</script>

<template>
  <section class="shell">
    <div class="summary-grid">
      <div class="summary-card">
        <strong>{{ content.exploration.unassigned_label }}</strong>
        <span>{{ groups.unassigned.length }}</span>
      </div>
      <div class="summary-card">
        <strong>{{ content.exploration.group_a_label }}</strong>
        <span>{{ groups.group_a.length }}</span>
      </div>
      <div class="summary-card">
        <strong>{{ content.exploration.group_b_label }}</strong>
        <span>{{ groups.group_b.length }}</span>
      </div>
    </div>

    <div class="group-layout">
      <section
        v-for="groupKey in GROUP_KEYS"
        :key="groupKey"
        class="drop-zone"
        @dragover.prevent
        @drop.prevent="dropInto(groupKey)"
      >
        <header>
          <h4>{{ groupLabel(groupKey) }}</h4>
          <span>{{ groups[groupKey].length }}</span>
        </header>
        <div class="chips">
          <button
            v-for="foodName in groups[groupKey]"
            :key="foodName"
            class="chip"
            draggable="true"
            :title="describe(foodName)"
            @dragstart="draggedItem = foodName"
            @dragend="draggedItem = null"
          >
            {{ labels[foodName] }}
          </button>
          <p v-if="groups[groupKey].length === 0" class="placeholder">Hierhin ziehen</p>
        </div>
      </section>
    </div>

    <div class="actions">
      <button class="reset" @click="resetState">
        {{ content.exploration.reset_label }}
      </button>
    </div>

    <table class="summary-table">
      <thead>
        <tr>
          <th>{{ content.exploration.table_columns.food }}</th>
          <th>{{ content.exploration.table_columns.group }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in tableRows" :key="row.foodName">
          <td>{{ row.label }}</td>
          <td>{{ row.group }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.shell {
  display: grid;
  gap: 1rem;
  margin: 1rem 0 1.5rem;
}

.summary-grid,
.group-layout {
  display: grid;
  gap: 0.85rem;
}

.summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.group-layout {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.summary-card,
.drop-zone {
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: #f8fbfe;
  padding: 1rem;
}

.summary-card span {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.5rem;
}

.drop-zone header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 4rem;
}

.chip,
.reset {
  border: 1px solid #c6d7e6;
  border-radius: 999px;
  background: white;
  color: #18324c;
  padding: 0.55rem 0.85rem;
  font: inherit;
}

.chip {
  cursor: grab;
}

.placeholder {
  color: #61788d;
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.summary-table th,
.summary-table td {
  border: 1px solid #d6e2ed;
  padding: 0.55rem 0.7rem;
  text-align: left;
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
