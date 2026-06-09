<script setup>
import { computed, onMounted, ref } from "vue";

import {
  emptySummary,
  fetchSummary,
  formatActiveTime,
  formatDateLabel,
  formatDurationSeconds,
  formatPercent,
  formatSessionId,
  formatTimestamp,
  getDateDetail,
  getDefaultDate,
  getDefaultSession,
  getSessionDetail,
  getVisibleTimelineEvents,
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

function groupRowsByModule(rows) {
  const groups = new Map();

  for (const row of rows) {
    const moduleId = row.module_id || "unknown";
    const existing = groups.get(moduleId) ?? [];
    existing.push(row);
    groups.set(moduleId, existing);
  }

  return [...groups.entries()].map(([moduleId, moduleRows]) => ({
    moduleId,
    rows: moduleRows,
  }));
}

function buildSectionPanels(rows) {
  const groups = groupRowsByModule(rows);
  if (groups.length === 0) {
    return [
      {
        title: "Sections by Module",
        empty: "Noch keine Abschnittsdaten.",
        rows: [],
        scrollClass: "table-scroll--wide",
        columns: [
          { label: "Abschnitt", render: (row) => row.section_title || row.block_title || row.section_id },
          { label: "Geschätzte Zeit", render: (row) => formatDurationSeconds(row.estimated_seconds) },
          { label: "Anteil", render: (row) => formatPercent(row.estimated_share) },
          { label: "Views", render: (row) => row.view_count },
          { label: "Aktive Zeit", render: (row) => formatActiveTime(row.active_minutes) },
        ],
      },
    ];
  }

  return groups.map((group) => ({
    title: `Sections · ${group.moduleId}`,
    empty: "Noch keine Abschnittsdaten.",
    rows: group.rows,
    scrollClass: "table-scroll--wide",
    columns: [
      { label: "Abschnitt", render: (row) => row.section_title || row.block_title || row.section_id },
      { label: "Geschätzte Zeit", render: (row) => formatDurationSeconds(row.estimated_seconds) },
      { label: "Anteil", render: (row) => formatPercent(row.estimated_share) },
      { label: "Views", render: (row) => row.view_count },
      { label: "Aktive Zeit", render: (row) => formatActiveTime(row.active_minutes) },
    ],
  }));
}

function buildInsightPanels(source, includeSessions = false) {
  const panels = [
    {
      title: "Module by Time",
      empty: "Noch keine Moduldaten.",
      rows: source.modules,
      scrollClass: "table-scroll--wide",
      columns: [
        { label: "Modul", render: (row) => row.module_id || "unknown" },
        { label: "Geschätzte Zeit", render: (row) => formatDurationSeconds(row.estimated_seconds) },
        { label: "Anteil", render: (row) => formatPercent(row.estimated_share) },
        { label: "Aktive Zeit", render: (row) => formatActiveTime(row.active_minutes) },
        { label: "Interaktionen", render: (row) => row.interaction_count },
        { label: "Übungen", render: (row) => row.exercise_completions },
      ],
    },
    {
      title: "Components by Time",
      empty: "Noch keine Komponentendaten.",
      rows: source.components,
      scrollClass: "table-scroll--wide",
      columns: [
        { label: "Komponente", render: (row) => row.component_title || row.component_id },
        { label: "Modul", render: (row) => row.module_id || "unknown" },
        { label: "Geschätzte Zeit", render: (row) => formatDurationSeconds(row.estimated_seconds) },
        { label: "Anteil", render: (row) => formatPercent(row.estimated_share) },
        { label: "Interaktionen", render: (row) => row.interaction_count },
        { label: "Parameter", render: (row) => row.parameter_change_count },
      ],
    },
    {
      title: "Exercises by Time",
      empty: "Noch keine Übungsdaten.",
      rows: source.exercises,
      scrollClass: "table-scroll--wide",
      columns: [
        { label: "Übung", render: (row) => row.exercise_title || row.exercise_id },
        { label: "Komponente", render: (row) => row.component_id || "—" },
        { label: "Geschätzte Zeit", render: (row) => formatDurationSeconds(row.estimated_seconds) },
        { label: "Anteil", render: (row) => formatPercent(row.estimated_share) },
        { label: "Starts", render: (row) => row.starts },
        { label: "Versuche", render: (row) => row.attempts },
        { label: "Abschlussrate", render: (row) => formatPercent(row.completion_rate) },
      ],
    },
  ];

  panels.splice(1, 0, ...buildSectionPanels(source.sections));

  if (includeSessions) {
    panels.push({
      title: "Recent Sessions",
      empty: "Noch keine Sessions.",
      rows: source.recentSessions,
      scrollClass: "table-scroll--narrow",
      columns: [
        { label: "Session", render: (row) => formatSessionId(row.session_id) },
        { label: "Events", render: (row) => row.event_count },
        { label: "Aktive Zeit", render: (row) => formatActiveTime(row.active_minutes) },
        { label: "Zuletzt gesehen", render: (row) => formatTimestamp(row.last_seen_at) },
      ],
    });
  }

  return panels;
}

const selectedDateDetail = computed(() => getDateDetail(summary.value, selectedDate.value));
const selectedSessionDetail = computed(() => getSessionDetail(summary.value, selectedSessionId.value));

const overviewPanels = computed(() => buildInsightPanels(summary.value, true));
const datePanels = computed(() => buildInsightPanels(selectedDateDetail.value, true));
const sessionPanels = computed(() => buildInsightPanels(selectedSessionDetail.value, false));

const visibleDateTimeline = computed(() => getVisibleTimelineEvents(selectedDateDetail.value.timeline));
const visibleSessionTimeline = computed(() => getVisibleTimelineEvents(selectedSessionDetail.value.timeline));

const cards = computed(() => {
  if (activeTab.value === "date") {
    const detail = selectedDateDetail.value;
    return [
      { label: "Datum", value: formatDateLabel(selectedDate.value) },
      { label: "Sessions", value: detail.totals.sessions },
      { label: "Events", value: detail.totals.events },
      { label: "Geschätzte Zeit", value: formatDurationSeconds(detail.totals.estimatedSeconds) },
      { label: "Aktive Zeit", value: formatActiveTime(detail.totals.activeMinutes) },
    ];
  }

  if (activeTab.value === "session") {
    const detail = selectedSessionDetail.value;
    return [
      { label: "Session", value: formatSessionId(selectedSessionId.value) },
      { label: "Events", value: detail.totals.events },
      { label: "Geschätzte Zeit", value: formatDurationSeconds(detail.totals.estimatedSeconds) },
      { label: "Aktive Zeit", value: formatActiveTime(detail.totals.activeMinutes) },
      { label: "Abgeschlossene Übungen", value: detail.totals.completedExercises },
    ];
  }

  return [
    { label: "Sessions", value: summary.value.totals.sessions },
    { label: "Events", value: summary.value.totals.events },
    { label: "Geschätzte Zeit", value: formatDurationSeconds(summary.value.totals.estimatedSeconds) },
    { label: "Aktive Zeit", value: formatActiveTime(summary.value.totals.activeMinutes) },
    { label: "Abgeschlossene Übungen", value: summary.value.totals.completedExercises },
  ];
});

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
        <p>Diese Ansicht priorisiert Zeitfokus pro Modul, Abschnitt, Komponente und Übung.</p>
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
        <article v-for="panel in overviewPanels" :key="panel.title" class="panel">
          <h2>{{ panel.title }}</h2>
          <div class="table-scroll" :class="panel.scrollClass">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="column in panel.columns" :key="column.label">{{ column.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in panel.rows" :key="JSON.stringify(row)">
                  <td v-for="column in panel.columns" :key="column.label">{{ column.render(row) }}</td>
                </tr>
                <tr v-if="panel.rows.length === 0">
                  <td :colspan="panel.columns.length">{{ panel.empty }}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
        <p class="helper-copy">
          Geschätzte Zeit wird aus Ereignisabständen innerhalb einer Session abgeleitet. `session_heartbeat`
          bleibt in der Rechnung enthalten, wird aber im sichtbaren Event-Stream ausgeblendet.
        </p>
      </section>

      <section class="grid">
        <article v-for="panel in datePanels" :key="panel.title" class="panel">
          <h2>{{ panel.title }}</h2>
          <div class="table-scroll" :class="panel.scrollClass">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="column in panel.columns" :key="column.label">{{ column.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in panel.rows" :key="JSON.stringify(row)">
                  <td v-for="column in panel.columns" :key="column.label">{{ column.render(row) }}</td>
                </tr>
                <tr v-if="panel.rows.length === 0">
                  <td :colspan="panel.columns.length">{{ panel.empty }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section class="panel detail-panel">
        <h2>Visible Event Stream</h2>
        <p v-if="summary.dates.length === 0" class="empty-state">Noch keine Datumsdaten.</p>
        <div v-else class="table-scroll table-scroll--timeline">
          <table class="data-table">
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
              <tr v-for="row in visibleDateTimeline" :key="`${row.id}-${row.occurred_at}`">
                <td>{{ formatTimestamp(row.occurred_at) }}</td>
                <td>{{ row.event_name }}</td>
                <td>{{ row.session_short_id }}</td>
                <td>{{ row.module_id || "—" }}</td>
                <td>{{ row.section_label || "—" }}</td>
                <td>{{ row.component_label || "—" }}</td>
                <td>{{ row.exercise_label || "—" }}</td>
              </tr>
              <tr v-if="visibleDateTimeline.length === 0"><td colspan="7">Keine sichtbaren Events für dieses Datum.</td></tr>
            </tbody>
          </table>
        </div>
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

        <p class="helper-copy">
          Diese Ansicht zeigt, worauf eine Session ihre Zeit verteilt hat. Heartbeats bleiben nur als Zeitanker
          im Hintergrund und werden nicht in der Tabelle angezeigt.
        </p>
      </section>

      <section class="grid">
        <article v-for="panel in sessionPanels" :key="panel.title" class="panel">
          <h2>{{ panel.title }}</h2>
          <div class="table-scroll" :class="panel.scrollClass">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="column in panel.columns" :key="column.label">{{ column.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in panel.rows" :key="JSON.stringify(row)">
                  <td v-for="column in panel.columns" :key="column.label">{{ column.render(row) }}</td>
                </tr>
                <tr v-if="panel.rows.length === 0">
                  <td :colspan="panel.columns.length">{{ panel.empty }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section class="panel detail-panel">
        <h2>Visible Event Stream</h2>
        <p v-if="summary.sessions.length === 0" class="empty-state">Noch keine Sessions.</p>
        <div v-else class="table-scroll table-scroll--timeline">
          <table class="data-table">
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
              <tr v-for="row in visibleSessionTimeline" :key="`${row.id}-${row.occurred_at}`">
                <td>{{ formatTimestamp(row.occurred_at) }}</td>
                <td>{{ row.event_name }}</td>
                <td>{{ row.module_id || "—" }}</td>
                <td>{{ row.section_label || "—" }}</td>
                <td>{{ row.component_label || "—" }}</td>
                <td>{{ row.exercise_label || "—" }}</td>
              </tr>
              <tr v-if="visibleSessionTimeline.length === 0"><td colspan="6">Keine sichtbaren Events für diese Session.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>
