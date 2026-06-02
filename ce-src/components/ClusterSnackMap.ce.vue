<script setup>
import { computed, ref } from "vue";

import BaseScatterPlot from "./internal/BaseScatterPlot.vue";
import { moduleContent } from "@/lib/content.js";
import { loadDataset } from "@/lib/datasets.js";
import { snackLabel } from "@/lib/formatters.js";

const content = moduleContent("module1");
const snacks = loadDataset("snacks");
const selectedSnack = ref("fruit_yogurt");
const quizAnswers = ref({});

const predefinedSnacks = computed(() =>
  snacks.filter((snack) => snack.example_type === "predefined")
);
const lostSnacks = computed(() => snacks.filter((snack) => snack.example_type === "new_example"));
const selectedSummary = computed(
  () =>
    content.exercises.mission_3.examples.find(
      (example) => example.snack_name === selectedSnack.value
    )?.summary ?? ""
);

function pointStyle(snack) {
  if (snack.snack_name === selectedSnack.value) {
    return { fill: "#111827", stroke: "#111827", radius: 8 };
  }
  return snack.example_type === "new_example"
    ? { fill: "#f97316", stroke: "#c2410c", radius: 7 }
    : { fill: "#2563eb", stroke: "#1d4ed8", radius: 7 };
}

function answerQuestion(id, value) {
  quizAnswers.value = { ...quizAnswers.value, [id]: value };
}
</script>

<template>
  <section class="shell">
    <div class="card">
      <h4>{{ content.exercises.mission_1.heading }}</h4>
      <p>{{ content.exercises.mission_1.intro }}</p>
      <table class="table">
        <thead>
          <tr>
            <th>Snack-Abenteurer</th>
            <th>Zucker</th>
            <th>Fett</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="snack in predefinedSnacks" :key="snack.snack_name">
            <td>{{ snackLabel(snack) }}</td>
            <td>{{ snack.sugar_g }}</td>
            <td>{{ snack.fat_g }}</td>
          </tr>
        </tbody>
      </table>
      <BaseScatterPlot
        :points="snacks"
        x-key="sugar_g"
        y-key="fat_g"
        x-label="Zucker (g/100g)"
        y-label="Fett (g/100g)"
        :x-domain="[0, 25]"
        :y-domain="[0, 35]"
        :tick-font-size="7"
        :axis-label-font-size="8"
      >
        <template #default="{ scaleX, scaleY }">
          <g v-for="snack in snacks" :key="snack.snack_name">
            <circle
              :cx="scaleX(snack.sugar_g)"
              :cy="scaleY(snack.fat_g)"
              :r="pointStyle(snack).radius"
              :fill="pointStyle(snack).fill"
              :stroke="pointStyle(snack).stroke"
              stroke-width="1.5"
            />
            <text
              :x="scaleX(snack.sugar_g)"
              :y="scaleY(snack.fat_g) - 8"
              text-anchor="middle"
              class="emoji"
            >
              {{ snack.emoji }}
            </text>
          </g>
        </template>
      </BaseScatterPlot>
      <p class="caption">{{ content.exercises.mission_1.chart_note }}</p>
    </div>

    <div class="card">
      <h4>{{ content.exercises.mission_3.heading }}</h4>
      <p>{{ content.exercises.mission_3.intro }}</p>
      <div class="selector">
        <label v-for="snack in lostSnacks" :key="snack.snack_name">
          <input v-model="selectedSnack" type="radio" name="lost-snack" :value="snack.snack_name" />
          {{ snackLabel(snack) }}
        </label>
      </div>
      <p class="summary">{{ selectedSummary }}</p>
    </div>

    <div class="quiz card">
      <h4>{{ content.exercises.mission_4.heading }}</h4>
      <p>{{ content.exercises.mission_4.intro }}</p>
      <article v-for="question in content.exercises.mission_4.questions" :key="question.id" class="question">
        <strong>{{ question.prompt }}</strong>
        <div class="selector">
          <label v-for="option in question.options" :key="option">
            <input
              type="radio"
              :name="question.id"
              :checked="quizAnswers[question.id] === option"
              @change="answerQuestion(question.id, option)"
            />
            {{ option }}
          </label>
        </div>
        <p v-if="quizAnswers[question.id]" class="feedback">
          {{
            quizAnswers[question.id] === question.correct_option
              ? question.feedback_correct
              : question.feedback_incorrect
          }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shell {
  display: grid;
  gap: 1rem;
  margin: 1rem 0 1.5rem;
}

.card {
  border: 1px solid #d6e2ed;
  border-radius: 16px;
  background: #f8fbfe;
  padding: 1rem;
}

.emoji {
  font-size: 12px;
}

.caption,
.summary,
.feedback {
  color: #31475f;
}

.selector {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.75rem;
}

.question + .question {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #d6e2ed;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  border: 1px solid #d6e2ed;
  padding: 0.55rem 0.7rem;
  text-align: left;
}
</style>
