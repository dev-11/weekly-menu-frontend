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

type SourceKey = 'home' | 'ordered' | 'ateOut'

// The app-wide "Order" color, matching MealCell, HistoryView and
// PlannerView's source-badge colors — a cleaner, more saturated green than
// the old olive, and distinct enough from the app's teal accent (used for
// "Home cooked") that the two never get mistaken for one ring's shades.
const SOURCE_RGB: Record<SourceKey, string> = {
  home: '5, 150, 105',
  ordered: '22, 163, 74',
  ateOut: '3, 105, 161',
}

// Each ring's wedges share one hue at decreasing opacity (dominant slice
// first) rather than a distinct color per slice — avoids any hue-clash
// (e.g. green next to blue) regardless of which categories end up adjacent,
// and reads as one coherent ring instead of a mix of unrelated colors.
const SEGMENT_OPACITIES = [1, 0.6, 0.35, 0.2]

// A thin gap between wedges — matching the ring's own hole color — gives
// every wedge a visible boundary even where two shades of the same hue sit
// next to each other.
const DONUT_GAP_PCT = 2

function conicRing(colors: string[], shares: number[]): string {
  if (!shares.length) return 'var(--bg-elevated)'
  // One gap per wedge, not per wedge-minus-one — the ring is a closed loop,
  // so the last wedge also needs a gap before it wraps around to meet the
  // first one at the top, or that seam renders with no visible boundary.
  const totalGap = shares.length > 1 ? DONUT_GAP_PCT * shares.length : 0
  let cursor = 0
  const parts: string[] = []
  shares.forEach((share, i) => {
    const size = Math.max(0, share * (100 - totalGap))
    const start = cursor
    const end = start + size
    parts.push(`${colors[i]} ${start}% ${end}%`)
    cursor = end
    if (shares.length > 1) {
      const gapEnd = cursor + DONUT_GAP_PCT
      parts.push(`var(--bg-muted) ${cursor}% ${gapEnd}%`)
      cursor = gapEnd
    }
  })
  return `conic-gradient(${parts.join(', ')})`
}

function donutBackground(items: { share: number }[], source: SourceKey): string {
  return conicRing(
    items.map((_, i) => segmentColor(source, i)),
    items.map((b) => b.share),
  )
}

// Shared by the ring's conic-gradient stops and the legend dots, so each
// legend row's swatch is the exact shade of its wedge in the ring.
function segmentColor(source: SourceKey, index: number): string {
  const opacity = SEGMENT_OPACITIES[index] ?? SEGMENT_OPACITIES[SEGMENT_OPACITIES.length - 1]
  return `rgba(${SOURCE_RGB[source]}, ${opacity})`
}

// The inverse breakdown (per meal type, by source) mixes three genuinely
// different categories in one ring — rather than giving each its own hue
// (which meant a wedge boundary could still land green-next-to-blue), it
// uses the same single-hue-at-decreasing-opacity treatment as the source
// panel above, keyed by rank instead of by source.
function typeSegmentColor(index: number): string {
  const opacity = SEGMENT_OPACITIES[index] ?? SEGMENT_OPACITIES[SEGMENT_OPACITIES.length - 1]
  return `rgba(${SOURCE_RGB.home}, ${opacity})`
}

function sourceDonutBackground(sources: { share: number }[]): string {
  return conicRing(
    sources.map((_, i) => typeSegmentColor(i)),
    sources.map((s) => s.share),
  )
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
            <div v-if="report.sourceByType.home.length" class="source-detail">
              <div class="source-detail-donut" :style="{ background: donutBackground(report.sourceByType.home, 'home') }"></div>
              <ul class="source-detail-legend">
                <li v-for="(b, i) in report.sourceByType.home" :key="b.type">
                  <span class="source-detail-dot" :style="{ background: segmentColor('home', i) }"></span>
                  {{ b.label }} {{ Math.round(b.share * 100) }}%
                </li>
              </ul>
            </div>
          </div>
          <div class="source-stat">
            <span class="source-stat-value">{{ pct(report.sourceBreakdown.ordered, report.sourceBreakdown.total) }}%</span>
            <span class="source-stat-label">Ordered</span>
            <div v-if="report.sourceByType.ordered.length" class="source-detail">
              <div class="source-detail-donut" :style="{ background: donutBackground(report.sourceByType.ordered, 'ordered') }"></div>
              <ul class="source-detail-legend">
                <li v-for="(b, i) in report.sourceByType.ordered" :key="b.type">
                  <span class="source-detail-dot" :style="{ background: segmentColor('ordered', i) }"></span>
                  {{ b.label }} {{ Math.round(b.share * 100) }}%
                </li>
              </ul>
            </div>
          </div>
          <div class="source-stat">
            <span class="source-stat-value">{{ pct(report.sourceBreakdown.ateOut, report.sourceBreakdown.total) }}%</span>
            <span class="source-stat-label">Eat out</span>
            <div v-if="report.sourceByType.ateOut.length" class="source-detail">
              <div class="source-detail-donut" :style="{ background: donutBackground(report.sourceByType.ateOut, 'ateOut') }"></div>
              <ul class="source-detail-legend">
                <li v-for="(b, i) in report.sourceByType.ateOut" :key="b.type">
                  <span class="source-detail-dot" :style="{ background: segmentColor('ateOut', i) }"></span>
                  {{ b.label }} {{ Math.round(b.share * 100) }}%
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>How each meal is made</h2>
        <div class="type-summary">
          <div v-for="t in report.typeSourceBreakdown" :key="t.type" class="type-stat">
            <span class="type-stat-value">{{ t.total }}</span>
            <span class="type-stat-label">{{ t.label }}</span>
            <div class="type-detail">
              <div class="type-detail-donut" :style="{ background: sourceDonutBackground(t.sources) }"></div>
              <ul class="type-detail-legend">
                <li v-for="(s, i) in t.sources" :key="s.key">
                  <span class="type-detail-dot" :style="{ background: typeSegmentColor(i) }"></span>
                  {{ s.label }} {{ Math.round(s.share * 100) }}%
                </li>
              </ul>
            </div>
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
  background: rgba(22, 163, 74, 0.12);
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
  color: var(--text-h);
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
  background: #16a34a;
}

.rank-badge.ateOut {
  background: #0369a1;
}

.warning-item {
  font-size: 0.9rem;
  color: var(--text);
  padding: 0.5rem 0.6rem;
  background: var(--bg-muted);
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

.source-detail {
  margin: 0.6rem 0 0;
  padding-top: 0.6rem;
  border-top: 1px dashed var(--border-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.source-detail-donut {
  position: relative;
  flex-shrink: 0;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 50%;
}

.source-detail-donut::after {
  content: '';
  position: absolute;
  inset: 0.55rem;
  border-radius: 50%;
  background: var(--bg-muted);
}

.source-detail-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  font-size: 0.6rem;
  line-height: 1.15;
  opacity: 0.85;
}

.source-detail-legend li {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  white-space: nowrap;
}

.source-detail-dot {
  flex-shrink: 0;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
}

.source-stat-label {
  display: block;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0.7;
  margin-top: 0.2rem;
}

.type-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.type-stat {
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: var(--bg-muted);
  border-radius: 8px;
}

.type-stat-value {
  display: block;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-h);
}

.type-stat-label {
  display: block;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0.7;
  margin-top: 0.2rem;
}

.type-detail {
  margin: 0.6rem 0 0;
  padding-top: 0.6rem;
  border-top: 1px dashed var(--border-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.type-detail-donut {
  flex-shrink: 0;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 50%;
  position: relative;
}

.type-detail-donut::after {
  content: '';
  position: absolute;
  inset: 0.55rem;
  border-radius: 50%;
  background: var(--bg-muted);
}

.type-detail-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  font-size: 0.6rem;
  line-height: 1.15;
  opacity: 0.85;
}

.type-detail-legend li {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  white-space: nowrap;
}

.type-detail-dot {
  flex-shrink: 0;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
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
