<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getInsights } from '../api/menuApi'
import type { InsightsReport } from '../api/menuApi'

const report = ref<InsightsReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    report.value = await getInsights()
  } catch {
    error.value = 'Could not load insights — check your connection and try again.'
  } finally {
    loading.value = false
  }
})

function pct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}
</script>

<template>
  <section class="insights">
    <h1>Insights</h1>

    <p v-if="loading" class="hint">Loading…</p>
    <p v-else-if="error" class="hint error">{{ error }}</p>
    <p v-else-if="report && report.mostCooked.length === 0" class="hint">Plan a few weeks to see insights here.</p>

    <template v-else-if="report">
      <section class="panel">
        <h2>Most cooked</h2>
        <ul class="rank-list">
          <li
            v-for="(d, i) in report.mostCooked"
            :key="d.name"
            class="rank-item"
            :class="{ ordered: d.sources.ordered, ateOut: d.sources.ateOut }"
          >
            <span class="rank-index">{{ i + 1 }}</span>
            <span class="rank-name">{{ d.name }}</span>
            <span v-if="d.sources.ordered" class="rank-badge ordered">Order</span>
            <span v-if="d.sources.ateOut" class="rank-badge ateOut">Eat out</span>
            <span class="rank-count">{{ d.count }}×</span>
          </li>
        </ul>
      </section>

      <section v-if="report.repeatWarnings.length" class="panel">
        <h2>Getting repetitive</h2>
        <ul class="warning-list">
          <li v-for="w in report.repeatWarnings" :key="w.label + w.name" class="warning-item">
            <strong>{{ w.name }}</strong> is {{ w.count }} of your last {{ w.total }} {{ w.label.toLowerCase() }}s
            ({{ Math.round(w.share * 100) }}%)
          </li>
        </ul>
      </section>

      <section class="panel">
        <h2>Variety by meal</h2>
        <ul class="variety-list">
          <li v-for="v in report.varietyByType" :key="v.type" class="variety-item">
            <span class="variety-label">{{ v.label }}</span>
            <span class="variety-bar-track">
              <span class="variety-bar-fill" :style="{ width: pct(v.unique, v.total) + '%' }"></span>
            </span>
            <span class="variety-value">{{ v.unique }} dishes / {{ v.total }} meals</span>
          </li>
        </ul>
      </section>

      <section class="panel">
        <h2>How you're eating</h2>
        <div class="source-summary">
          <div class="source-stat">
            <span class="source-stat-value">{{ pct(report.sourceBreakdown.home, report.sourceBreakdown.total) }}%</span>
            <span class="source-stat-label">Home cooked</span>
          </div>
          <div class="source-stat">
            <span class="source-stat-value">{{ pct(report.sourceBreakdown.ordered, report.sourceBreakdown.total) }}%</span>
            <span class="source-stat-label">Ordered</span>
          </div>
          <div class="source-stat">
            <span class="source-stat-value">{{ pct(report.sourceBreakdown.ateOut, report.sourceBreakdown.total) }}%</span>
            <span class="source-stat-label">Eat out</span>
          </div>
        </div>
      </section>

      <section v-if="report.onlyOnce.length" class="panel">
        <h2>Only made once</h2>
        <p class="hint small">
          Tried once, never repeated — might mean it didn't land, or just hasn't come back around yet.
        </p>
        <div class="chip-list">
          <span v-for="d in report.onlyOnce" :key="d.name" class="chip">{{ d.name }}</span>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.insights {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

h1 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.hint {
  opacity: 0.7;
}

.hint.error {
  color: #dc2626;
  opacity: 1;
}

.hint.small {
  font-size: 0.8rem;
  margin: 0 0 0.6rem;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  padding: 1rem;
  margin-bottom: 1rem;
}

.panel h2 {
  font-size: 1rem;
  margin: 0 0 0.75rem;
  color: var(--text-h);
}

.rank-list,
.warning-list,
.variety-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.rank-item.ordered {
  background: rgba(77, 124, 15, 0.12);
}

.rank-item.ateOut {
  background: rgba(3, 105, 161, 0.12);
}

.rank-index {
  width: 1.4rem;
  flex-shrink: 0;
  opacity: 0.6;
  font-size: 0.8rem;
}

.rank-name {
  flex: 1;
  color: var(--text-h);
}

.rank-count {
  font-weight: 600;
  color: var(--accent);
  font-size: 0.85rem;
}

.rank-badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: white;
}

.rank-badge.ordered {
  background: #4d7c0f;
}

.rank-badge.ateOut {
  background: #0369a1;
}

.warning-item {
  font-size: 0.9rem;
  color: var(--text);
  padding: 0.5rem 0.6rem;
  background: var(--accent-bg);
  border-radius: 6px;
}

.warning-item strong {
  color: var(--text-h);
}

.variety-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
}

.variety-label {
  width: 4.5rem;
  flex-shrink: 0;
  color: var(--text-h);
  font-weight: 600;
}

.variety-bar-track {
  flex: 1;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--bg-muted);
  overflow: hidden;
}

.variety-bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.variety-value {
  flex-shrink: 0;
  opacity: 0.7;
  font-size: 0.78rem;
  white-space: nowrap;
}

.source-summary {
  display: flex;
  gap: 1rem;
}

.source-stat {
  flex: 1;
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: var(--bg-muted);
  border-radius: 8px;
}

.source-stat-value {
  display: block;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-h);
}

.source-stat-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 0.2rem;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--bg-muted);
  border: 1px solid var(--border-muted);
  color: var(--text);
}

@media (min-width: 1024px) {
  .insights {
    max-width: 900px;
  }
}
</style>
