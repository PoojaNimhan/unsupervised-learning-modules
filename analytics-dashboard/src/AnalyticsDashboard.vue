<script setup>
import { computed, onMounted, ref } from "vue";

import { emptySummary, fetchSummary, formatActiveTime } from "./dashboard.js";

const endpoint =
  import.meta.env?.VITE_ANALYTICS_SUMMARY_ENDPOINT ??
  "http://127.0.0.1:54321/functions/v1/analytics-summary";

const loading = ref(true);
const error = ref("");
const summary = ref(emptySummary());

const cards = computed(() => [
  { label: "Sessions", value: summary.value.totals.sessions },
  { label: "Events", value: summary.value.totals.events },
  { label: "Aktive Zeit", value: formatActiveTime(summary.value.totals.activeMinutes) },
  { label: "Abgeschlossene Übungen", value: summary.value.totals.completedExercises },
]);

async function refresh() {
  loading.value = true;
  error.value = "";
  try {
    summary.value = await fetchSummary(endpoint);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Dashboard-Daten konnten nicht geladen werden.";
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <main class="dashboard-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Lokale Lernanalyse</p>
        <h1>Session Analytics Dashboard</h1>
        <p>Diese Ansicht liest nur die lokale Supabase-Instanz und ist nicht im Lernenden-Build verlinkt.</p>
      </div>
      <button type="button" @click="refresh">Aktualisieren</button>
    </header>

    <p v-if="loading" class="status">Lade Metriken...</p>
    <p v-else-if="error" class="status status--error">{{ error }}</p>

    <section class="cards" aria-label="Zusammenfassung">
      <article v-for="card in cards" :key="card.label" class="metric-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>Module</h2>
        <table>
          <thead>
            <tr>
              <th>Modul</th>
              <th>Aktive Zeit</th>
              <th>Interaktionen</th>
              <th>Übungen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.modules" :key="row.module_id">
              <td>{{ row.module_id }}</td>
              <td>{{ formatActiveTime(row.active_minutes) }}</td>
              <td>{{ row.interaction_count }}</td>
              <td>{{ row.exercise_completions }}</td>
            </tr>
            <tr v-if="summary.modules.length === 0"><td colspan="4">Noch keine Moduldaten.</td></tr>
          </tbody>
        </table>
      </article>

      <article class="panel">
        <h2>Abschnitte</h2>
        <table>
          <thead>
            <tr>
              <th>Abschnitt</th>
              <th>Modul</th>
              <th>Views</th>
              <th>Aktive Zeit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.sections" :key="`${row.module_id}-${row.section_id}`">
              <td>{{ row.section_title || row.block_title || row.section_id }}</td>
              <td>{{ row.module_id }}</td>
              <td>{{ row.view_count }}</td>
              <td>{{ formatActiveTime(row.active_minutes) }}</td>
            </tr>
            <tr v-if="summary.sections.length === 0"><td colspan="4">Noch keine Abschnittsdaten.</td></tr>
          </tbody>
        </table>
      </article>

      <article class="panel">
        <h2>Komponenten</h2>
        <table>
          <thead>
            <tr>
              <th>Komponente</th>
              <th>Views</th>
              <th>Interaktionen</th>
              <th>Parameter</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.components" :key="`${row.module_id}-${row.component_id}`">
              <td>{{ row.component_title || row.component_id }}</td>
              <td>{{ row.view_count }}</td>
              <td>{{ row.interaction_count }}</td>
              <td>{{ row.parameter_change_count }}</td>
            </tr>
            <tr v-if="summary.components.length === 0"><td colspan="4">Noch keine Komponentendaten.</td></tr>
          </tbody>
        </table>
      </article>

      <article class="panel">
        <h2>Übungen</h2>
        <table>
          <thead>
            <tr>
              <th>Übung</th>
              <th>Starts</th>
              <th>Versuche</th>
              <th>Abschlussrate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.exercises" :key="`${row.component_id}-${row.exercise_id}`">
              <td>{{ row.exercise_title || row.exercise_id }}</td>
              <td>{{ row.starts }}</td>
              <td>{{ row.attempts }}</td>
              <td>{{ row.completion_rate }}%</td>
            </tr>
            <tr v-if="summary.exercises.length === 0"><td colspan="4">Noch keine Übungsdaten.</td></tr>
          </tbody>
        </table>
      </article>

      <article class="panel">
        <h2>Letzte Sessions</h2>
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Events</th>
              <th>Aktive Zeit</th>
              <th>Zuletzt gesehen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.recentSessions" :key="row.session_id">
              <td>{{ String(row.session_id).slice(0, 8) }}</td>
              <td>{{ row.event_count }}</td>
              <td>{{ formatActiveTime(row.active_minutes) }}</td>
              <td>{{ row.last_seen_at }}</td>
            </tr>
            <tr v-if="summary.recentSessions.length === 0"><td colspan="4">Noch keine Sessions.</td></tr>
          </tbody>
        </table>
      </article>
    </section>
  </main>
</template>
