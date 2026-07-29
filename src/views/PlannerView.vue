<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MealCell from '../components/MealCell.vue'
import { useMenuStore } from '../stores/menu'
import { addWeeks, countMealsBySource, formatWeekRange, MEAL_LABELS, MEAL_TYPES, weekStartFor, weekdayLabel } from '../utils/week'

const store = useMenuStore()
const route = useRoute()
const thisWeek = weekStartFor()
const weekStart = ref(typeof route.query.week === 'string' ? route.query.week : thisWeek)

const isCurrentWeek = computed(() => weekStart.value === thisWeek)
const weekRangeLabel = computed(() => formatWeekRange(weekStart.value))
const weekdays = computed(() => store.currentWeek?.days.slice(0, 5) ?? [])
const orderedCount = computed(() => (store.currentWeek ? countMealsBySource(store.currentWeek, 'ordered') : 0))
const ateOutCount = computed(() => (store.currentWeek ? countMealsBySource(store.currentWeek, 'ateOut') : 0))

// Below this width the grid can't show more than 2-3 day columns at once, so we
// switch to a vertical day-by-day list instead — the primary layout on phones.
const isMobile = ref(false)
let mq: MediaQueryList | null = null
let mqHandler: ((e: MediaQueryListEvent) => void) | null = null

onMounted(() => {
  mq = window.matchMedia('(max-width: 700px)')
  isMobile.value = mq.matches
  mqHandler = (e) => (isMobile.value = e.matches)
  mq.addEventListener('change', mqHandler)
})

async function load() {
  await store.loadWeek(weekStart.value)
}

function goToWeek(delta: number) {
  weekStart.value = addWeeks(weekStart.value, delta)
}

function goToThisWeek() {
  weekStart.value = thisWeek
}

watch(weekStart, load)
onMounted(load)

// Autosave shortly after the last edited cell commits, so rapid edits collapse into one save.
let saveTimer: ReturnType<typeof setTimeout> | null = null
const justSaved = ref(false)

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  justSaved.value = false
  saveTimer = setTimeout(async () => {
    await store.saveCurrentWeek()
    justSaved.value = true
  }, 400)
}

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (mq && mqHandler) mq.removeEventListener('change', mqHandler)
})
</script>

<template>
  <section class="planner">
    <header class="week-nav">
      <button type="button" @click="goToWeek(-1)" aria-label="Previous week">‹</button>
      <div class="week-label">
        <strong>{{ weekRangeLabel }}</strong>
        <div v-if="orderedCount || ateOutCount" class="week-counts">
          <span v-if="orderedCount" class="source-badge ordered">{{ orderedCount }} order</span>
          <span v-if="ateOutCount" class="source-badge ateOut">{{ ateOutCount }} eat out</span>
        </div>
        <button v-if="!isCurrentWeek" type="button" class="link" @click="goToThisWeek">
          Back to this week
        </button>
      </div>
      <button type="button" @click="goToWeek(1)" aria-label="Next week">›</button>
    </header>

    <p v-if="store.loading" class="hint">Loading…</p>

    <template v-else-if="store.currentWeek">
      <div v-if="!isMobile" class="timetable-scroll">
        <div class="timetable">
          <div class="corner"></div>
          <div v-for="day in store.currentWeek.days" :key="day.date" class="day-header">
            <strong>{{ weekdayLabel(day.date) }}</strong>
            <span>{{ day.date.slice(5) }}</span>
          </div>

          <template v-for="mealType in MEAL_TYPES" :key="mealType">
            <div class="meal-label">{{ MEAL_LABELS[mealType] }}</div>
            <MealCell
              v-for="day in store.currentWeek.days"
              :key="day.date + mealType"
              :meal="day.meals[mealType]"
              @commit="scheduleSave"
            />
          </template>

          <div class="meal-label">Dessert</div>
          <div v-for="day in weekdays" :key="day.date + '-dessert'" class="cell-na" aria-hidden="true"></div>
          <MealCell
            class="dessert-cell"
            :meal="store.currentWeek.weekendDessert"
            @commit="scheduleSave"
          />
        </div>
      </div>

      <div v-else class="day-list">
        <div v-for="day in store.currentWeek.days" :key="day.date" class="day-block">
          <h2 class="day-block-heading">
            {{ weekdayLabel(day.date) }} <span>{{ day.date.slice(5) }}</span>
          </h2>
          <div v-for="mealType in MEAL_TYPES" :key="mealType" class="meal-row">
            <span class="meal-row-label">{{ MEAL_LABELS[mealType] }}</span>
            <MealCell :meal="day.meals[mealType]" @commit="scheduleSave" />
          </div>
        </div>

        <div class="day-block">
          <h2 class="day-block-heading">Weekend Dessert</h2>
          <div class="meal-row">
            <span class="meal-row-label">Saturday &amp; Sunday</span>
            <MealCell :meal="store.currentWeek.weekendDessert" @commit="scheduleSave" />
          </div>
        </div>
      </div>

      <p class="status">
        <span v-if="store.saving">Saving…</span>
        <span v-else-if="justSaved">Saved</span>
      </p>
    </template>
  </section>
</template>

<style scoped>
.planner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.week-nav button {
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  color: inherit;
}

.week-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.week-label strong {
  color: var(--text-h);
}

.week-counts {
  display: flex;
  gap: 0.4rem;
}

.source-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: white;
}

.source-badge.ordered {
  background: #4d7c0f;
}

.source-badge.ateOut {
  background: #0369a1;
}

.link {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 0.85rem;
  padding: 0;
  cursor: pointer;
}

.hint {
  opacity: 0.7;
}

.timetable-scroll {
  overflow-x: auto;
}

.timetable {
  display: grid;
  grid-template-columns: 5.5rem repeat(7, minmax(8.5rem, 1fr));
  gap: 0.5rem;
  min-width: 780px;
}

.corner {
  /* empty top-left cell above the meal-type column */
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.4rem 0;
  font-size: 0.85rem;
}

.day-header strong {
  color: var(--text-h);
}

.day-header span {
  font-size: 0.7rem;
  opacity: 0.6;
}

.meal-label {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-h);
  padding-right: 0.4rem;
}

.cell-na {
  border-radius: 8px;
  background: repeating-linear-gradient(
    135deg,
    var(--border) 0,
    var(--border) 1px,
    transparent 1px,
    transparent 8px
  );
  opacity: 0.35;
}

.dessert-cell {
  grid-column: span 2;
}

.day-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.day-block-heading {
  font-size: 1rem;
  margin: 0 0 0.6rem;
  color: var(--text-h);
}

.day-block-heading span {
  font-size: 0.8rem;
  font-weight: 400;
  opacity: 0.6;
}

.meal-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.6rem;
}

.meal-row-label {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.6;
}

.status {
  min-height: 1.2rem;
  margin: 0.6rem 0 0;
  font-size: 0.8rem;
  opacity: 0.6;
  text-align: right;
}
</style>
