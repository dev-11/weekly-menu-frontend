<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { DayMenu, MealSource, WeekMenu } from '../types/menu'
import { useMenuStore } from '../stores/menu'
import { countMealsBySource, formatWeekRange, MEAL_LABELS, MEAL_TYPES, weekStartFor, weekdayLabel } from '../utils/week'

const SOURCE_LABEL: Record<MealSource, string> = { home: '', ordered: 'Order', ateOut: 'Eat out' }

const store = useMenuStore()
const thisWeek = weekStartFor()
const expanded = ref<Record<string, boolean>>({})

onMounted(() => store.loadHistory())

const allWeeks = computed(() => store.history)

function toggle(weekStart: string) {
  expanded.value[weekStart] = !expanded.value[weekStart]
}

function totalSlots(week: WeekMenu) {
  return week.days.length * MEAL_TYPES.length + 1 // +1 for the shared weekend dessert
}

function filledCount(week: WeekMenu) {
  const dayMeals = week.days.reduce(
    (sum, d) => sum + Object.values(d.meals).filter((m) => m.dish.trim().length > 0).length,
    0,
  )
  return dayMeals + (week.weekendDessert.dish.trim().length > 0 ? 1 : 0)
}

function mealsFor(day: DayMenu) {
  return MEAL_TYPES.map((type) => ({ type, meal: day.meals[type] }))
}
</script>

<template>
  <section class="history">
    <h1>Weekly history</h1>

    <p v-if="store.loading" class="hint">Loading…</p>
    <p v-else-if="allWeeks.length === 0" class="hint">No weeks yet.</p>

    <ul v-else class="week-list">
      <li
        v-for="week in allWeeks"
        :key="week.weekStart"
        class="week-item"
        :class="{ 'is-current': week.weekStart === thisWeek }"
      >
        <button type="button" class="week-summary" @click="toggle(week.weekStart)">
          <span class="range">{{ formatWeekRange(week.weekStart) }}</span>
          <span v-if="week.weekStart === thisWeek" class="current-tag">This week</span>
          <span v-if="countMealsBySource(week, 'ordered')" class="source-badge ordered">
            {{ countMealsBySource(week, 'ordered') }} order
          </span>
          <span v-if="countMealsBySource(week, 'ateOut')" class="source-badge ateOut">
            {{ countMealsBySource(week, 'ateOut') }} eat out
          </span>
          <span class="count">{{ filledCount(week) }}/{{ totalSlots(week) }} planned</span>
          <span class="chevron" :class="{ open: expanded[week.weekStart] }">›</span>
        </button>

        <ul v-if="expanded[week.weekStart]" class="day-list">
          <li v-for="day in week.days" :key="day.date" class="day-item">
            <span class="day-name">{{ weekdayLabel(day.date) }}</span>
            <ul class="meal-list">
              <li v-for="{ type, meal } in mealsFor(day)" :key="type" class="meal-item" :class="meal.source">
                <span class="meal-type">{{ MEAL_LABELS[type] }}</span>
                <span class="dish">{{ meal.dish || '—' }}</span>
                <span v-if="meal.source !== 'home'" class="source-badge" :class="meal.source">
                  {{ SOURCE_LABEL[meal.source] }}
                </span>
              </li>
            </ul>
          </li>
          <li class="day-item dessert-item">
            <span class="day-name">Weekend</span>
            <ul class="meal-list">
              <li class="meal-item" :class="week.weekendDessert.source">
                <span class="meal-type">Dessert</span>
                <span class="dish">{{ week.weekendDessert.dish || '—' }}</span>
                <span v-if="week.weekendDessert.source !== 'home'" class="source-badge" :class="week.weekendDessert.source">
                  {{ SOURCE_LABEL[week.weekendDessert.source] }}
                </span>
              </li>
            </ul>
          </li>
        </ul>

        <router-link
          v-if="expanded[week.weekStart]"
          :to="{ path: '/', query: { week: week.weekStart } }"
          class="edit-link"
        >
          Edit this week
        </router-link>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.history {
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

.week-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.week-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  overflow: hidden;
}

.week-item.is-current {
  border: 1px solid var(--accent);
}

.current-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: var(--accent);
  background: var(--accent-bg);
}

.week-summary {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
}

.range {
  font-weight: 600;
  color: var(--text-h);
  flex: 1;
}

.count {
  font-size: 0.85rem;
  opacity: 0.7;
}

.chevron {
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.day-list {
  list-style: none;
  margin: 0;
  padding: 0 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dessert-item {
  padding-top: 0.35rem;
  border-top: 1px dashed var(--border);
}

.day-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-h);
  opacity: 0.7;
}

.meal-list {
  list-style: none;
  margin: 0.2rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.meal-item {
  display: grid;
  grid-template-columns: 5.5rem 1fr auto;
  gap: 0.5rem;
  font-size: 0.9rem;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.meal-item.ordered {
  background: rgba(77, 124, 15, 0.12);
}

.meal-item.ateOut {
  background: rgba(3, 105, 161, 0.12);
}

.meal-item.ordered .dish,
.meal-item.ateOut .dish {
  font-weight: 600;
  color: var(--text-h);
}

.meal-type {
  opacity: 0.55;
  font-size: 0.8rem;
}

.source-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: white;
  justify-self: start;
}

.source-badge.ordered {
  background: #4d7c0f;
}

.source-badge.ateOut {
  background: #0369a1;
}

.edit-link {
  display: block;
  padding: 0.5rem 1rem 0.85rem;
  font-size: 0.85rem;
  color: var(--accent);
}
</style>
