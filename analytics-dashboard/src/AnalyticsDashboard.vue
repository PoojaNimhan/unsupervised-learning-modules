<script setup>
import { computed, onMounted, ref } from "vue";

import {
  emptySummary,
  fetchSummary,
  formatActiveTime,
  formatDateLabel,
  formatSessionId,
  formatTimestamp,
  getDateDetail,
  getDefaultDate,
  getDefaultSession,
  getSessionDetail,
} from "./dashboard.js";

const endpoint =
  import.meta.env?.VITE_ANALYTICS_SUMMARY_ENDPOINT ??
  "http://127.0.0.1:54321/functions/v1/analytics-summary";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "date", label: "By Date" },
  { id: "session", label: "By Session" },
];

const loading = ref(true);
const error = ref("");
const summary = ref(emptySummary());
const activeTab = ref("overview");
const selectedDate = ref("");
const selectedSessionId = ref("");

const cards = computed(() => {
  if (activeTab.value === "date") {
    const detail = getDateDetail(summary.value, selectedDate.value);
    return [
      { label: "Datum", value: formatDateLabel(selectedDate.value) },
      { label: "Sessions", value: detail.totals.sessions },
      { label: "Events", value: detail.totals.events },
      { label: "Aktive Zeit", value: formatActiveTime(detail.totals.activeMinutes) },
      { label: "Abgeschlossene Übungen", value: detail.totals.completedExercises },
    ];
  }

  if (activeTab.value === "session") {
    const detail = getSessionDetail(summary.value, selectedSessionId.value);
    return [
      { label: "Session", value: formatSessionId(selectedSessionId.value) },
      { label: "Events", value: detail.totals.events },
      { label: "Aktive Zeit", value: formatActiveTime(detail.totals.activeMinutes) },
      { label: "Abgeschlossene Übungen", value: detail.totals.completedExercises },
    ];
  }

  return [
    { label: "Sessions", value: summary.value.totals.sessions },
    { label: "Events", value: summary.value.totals.events },
    { label: "Aktive Zeit", value: formatActiveTime(summary.value.totals.activeMinutes) },
    { label: "Abgeschlossene Übungen", value: summary.value.totals.completedExercises },
  ];
});

const selectedDateDetail = computed(() => getDateDetail(summary.value, selectedDate.value));
const selectedSessionDetail = computed(() => getSessionDetail(summary.value, selectedSessionId.value));

function syncSelections() {
  const nextDate = summary.value.dates.some((entry) => entry.date === selectedDate.value)
    ? selectedDate.value
    : getDefaultDate(summary.value);
  const nextSession = summary.value.sessions.some((entry) => entry.session_id === selectedSessionId.value)
    ? selectedSessionId.value
    : getDefaultSession(summary.value);

  selectedDate.value = nextDate;
  selectedSessionId.value = nextSession;
}

async function refresh() {
  loading.value = true;
  error.value = "";
  try {
    summary.value = await fetchSummary(endpoint);
    syncSelections();
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

    <nav class="tabs" aria-label="Dashboard-Ansichten">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab-button"
        :class="{ 'tab-button--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section class="cards" :aria-label="activeTab === 'overview' ? 'Zusammenfassung' : 'Drilldown-Zusammenfassung'">
      <article v-for="card in cards" :key="card.label" class="metric-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <template v-if="activeTab === 'overview'">
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
                <td>{{ formatSessionId(row.session_id) }}</td>
                <td>{{ row.event_count }}</td>
                <td>{{ formatActiveTime(row.active_minutes) }}</td>
                <td>{{ formatTimestamp(row.last_seen_at) }}</td>
              </tr>
              <tr v-if="summary.recentSessions.length === 0"><td colspan="4">Noch keine Sessions.</td></tr>
            </tbody>
          </table>
        </article>
      </section>
    </template>

    <template v-else-if="activeTab === 'date'">
      <section class="panel detail-panel">
        <div class="selector-row">
          <label for="date-select">Datum</label>
          <select id="date-select" v-model="selectedDate" :disabled="summary.dates.length === 0">
            <option v-for="row in summary.dates" :key="row.date" :value="row.date">
              {{ formatDateLabel(row.date) }} · {{ row.events }} Events
            </option>
          </select>
        </div>

        <p v-if="summary.dates.length === 0" class="empty-state">Noch keine Datumsdaten.</p>

        <table v-else>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Event</th>
              <th>Session</th>
              <th>Modul</th>
              <th>Abschnitt</th>
              <th>Komponente</th>
              <th>Übung</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in selectedDateDetail.timeline" :key="`${row.id}-${row.occurred_at}`">
              <td>{{ formatTimestamp(row.occurred_at) }}</td>
              <td>{{ row.event_name }}</td>
              <td>{{ row.session_short_id }}</td>
              <td>{{ row.module_id || "—" }}</td>
              <td>{{ row.section_label || "—" }}</td>
              <td>{{ row.component_label || "—" }}</td>
              <td>{{ row.exercise_label || "—" }}</td>
            </tr>
            <tr v-if="selectedDateDetail.timeline.length === 0"><td colspan="7">Keine Events für dieses Datum.</td></tr>
          </tbody>
        </table>
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
              <tr v-for="row in selectedDateDetail.modules" :key="row.module_id">
                <td>{{ row.module_id }}</td>
                <td>{{ formatActiveTime(row.active_minutes) }}</td>
                <td>{{ row.interaction_count }}</td>
                <td>{{ row.exercise_completions }}</td>
              </tr>
              <tr v-if="selectedDateDetail.modules.length === 0"><td colspan="4">Noch keine Moduldaten.</td></tr>
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
              <tr v-for="row in selectedDateDetail.sections" :key="`${row.module_id}-${row.section_id}`">
                <td>{{ row.section_title || row.block_title || row.section_id }}</td>
                <td>{{ row.module_id }}</td>
                <td>{{ row.view_count }}</td>
                <td>{{ formatActiveTime(row.active_minutes) }}</td>
              </tr>
              <tr v-if="selectedDateDetail.sections.length === 0"><td colspan="4">Noch keine Abschnittsdaten.</td></tr>
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
              <tr v-for="row in selectedDateDetail.components" :key="`${row.module_id}-${row.component_id}`">
                <td>{{ row.component_title || row.component_id }}</td>
                <td>{{ row.view_count }}</td>
                <td>{{ row.interaction_count }}</td>
                <td>{{ row.parameter_change_count }}</td>
              </tr>
              <tr v-if="selectedDateDetail.components.length === 0"><td colspan="4">Noch keine Komponentendaten.</td></tr>
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
              <tr v-for="row in selectedDateDetail.exercises" :key="`${row.component_id}-${row.exercise_id}`">
                <td>{{ row.exercise_title || row.exercise_id }}</td>
                <td>{{ row.starts }}</td>
                <td>{{ row.attempts }}</td>
                <td>{{ row.completion_rate }}%</td>
              </tr>
              <tr v-if="selectedDateDetail.exercises.length === 0"><td colspan="4">Noch keine Übungsdaten.</td></tr>
            </tbody>
          </table>
        </article>

        <article class="panel">
          <h2>Sessions</h2>
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
              <tr v-for="row in selectedDateDetail.recentSessions" :key="row.session_id">
                <td>{{ formatSessionId(row.session_id) }}</td>
                <td>{{ row.event_count }}</td>
                <td>{{ formatActiveTime(row.active_minutes) }}</td>
                <td>{{ formatTimestamp(row.last_seen_at) }}</td>
              </tr>
              <tr v-if="selectedDateDetail.recentSessions.length === 0"><td colspan="4">Noch keine Sessions.</td></tr>
            </tbody>
          </table>
        </article>
      </section>
    </template>

    <template v-else>
      <section class="panel detail-panel">
        <div class="selector-row">
          <label for="session-select">Session</label>
          <select id="session-select" v-model="selectedSessionId" :disabled="summary.sessions.length === 0">
            <option v-for="row in summary.sessions" :key="row.session_id" :value="row.session_id">
              {{ formatSessionId(row.session_id) }} · {{ formatTimestamp(row.last_seen_at) }}
            </option>
          </select>
        </div>

        <div v-if="summary.sessions.length > 0" class="session-meta">
          <span><strong>Gestartet:</strong> {{ formatTimestamp(selectedSessionDetail.started_at) }}</span>
          <span><strong>Beendet:</strong> {{ selectedSessionDetail.ended_at ? formatTimestamp(selectedSessionDetail.ended_at) : "—" }}</span>
          <span><strong>Zuletzt gesehen:</strong> {{ formatTimestamp(selectedSessionDetail.last_seen_at) }}</span>
        </div>

        <p v-if="summary.sessions.length === 0" class="empty-state">Noch keine Sessions.</p>

        <table v-else>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Event</th>
              <th>Modul</th>
              <th>Abschnitt</th>
              <th>Komponente</th>
              <th>Übung</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in selectedSessionDetail.timeline" :key="`${row.id}-${row.occurred_at}`">
              <td>{{ formatTimestamp(row.occurred_at) }}</td>
              <td>{{ row.event_name }}</td>
              <td>{{ row.module_id || "—" }}</td>
              <td>{{ row.section_label || "—" }}</td>
              <td>{{ row.component_label || "—" }}</td>
              <td>{{ row.exercise_label || "—" }}</td>
            </tr>
            <tr v-if="selectedSessionDetail.timeline.length === 0"><td colspan="6">Keine Events für diese Session.</td></tr>
          </tbody>
        </table>
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
              <tr v-for="row in selectedSessionDetail.modules" :key="row.module_id">
                <td>{{ row.module_id }}</td>
                <td>{{ formatActiveTime(row.active_minutes) }}</td>
                <td>{{ row.interaction_count }}</td>
                <td>{{ row.exercise_completions }}</td>
              </tr>
              <tr v-if="selectedSessionDetail.modules.length === 0"><td colspan="4">Noch keine Moduldaten.</td></tr>
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
              <tr v-for="row in selectedSessionDetail.sections" :key="`${row.module_id}-${row.section_id}`">
                <td>{{ row.section_title || row.block_title || row.section_id }}</td>
                <td>{{ row.module_id }}</td>
                <td>{{ row.view_count }}</td>
                <td>{{ formatActiveTime(row.active_minutes) }}</td>
              </tr>
              <tr v-if="selectedSessionDetail.sections.length === 0"><td colspan="4">Noch keine Abschnittsdaten.</td></tr>
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
              <tr v-for="row in selectedSessionDetail.components" :key="`${row.module_id}-${row.component_id}`">
                <td>{{ row.component_title || row.component_id }}</td>
                <td>{{ row.view_count }}</td>
                <td>{{ row.interaction_count }}</td>
                <td>{{ row.parameter_change_count }}</td>
              </tr>
              <tr v-if="selectedSessionDetail.components.length === 0"><td colspan="4">Noch keine Komponentendaten.</td></tr>
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
              <tr v-for="row in selectedSessionDetail.exercises" :key="`${row.component_id}-${row.exercise_id}`">
                <td>{{ row.exercise_title || row.exercise_id }}</td>
                <td>{{ row.starts }}</td>
                <td>{{ row.attempts }}</td>
                <td>{{ row.completion_rate }}%</td>
              </tr>
              <tr v-if="selectedSessionDetail.exercises.length === 0"><td colspan="4">Noch keine Übungsdaten.</td></tr>
            </tbody>
          </table>
        </article>

        <article class="panel">
          <h2>Sessions</h2>
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
              <tr v-for="row in selectedSessionDetail.recentSessions" :key="row.session_id">
                <td>{{ formatSessionId(row.session_id) }}</td>
                <td>{{ row.event_count }}</td>
                <td>{{ formatActiveTime(row.active_minutes) }}</td>
                <td>{{ formatTimestamp(row.last_seen_at) }}</td>
              </tr>
              <tr v-if="selectedSessionDetail.recentSessions.length === 0"><td colspan="4">Noch keine Sessions.</td></tr>
            </tbody>
          </table>
        </article>
      </section>
    </template>
  </main>
</template>
