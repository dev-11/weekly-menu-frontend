<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LoadingState from '../components/LoadingState.vue'
import type { DayMenu, MealSource, WeekMenu } from '../types/menu'
import { useMenuStore } from '../stores/menu'
import { countMealsBySource, dayMood, formatWeekRange, isLikelyUrl, MEAL_LABELS, MEAL_TYPES, toISO, weekStartFor, weekdayLabel } from '../utils/week'

// 'skipped' is dead code here in practice — mealsFor()/dayHasContent() only
// ever surface meals with dish text, and a skipped meal never has any.
const SOURCE_LABEL: Record<MealSource, string> = { home: '', ordered: 'Order', ateOut: 'Eat out', skipped: '' }

const store = useMenuStore()
const thisWeek = weekStartFor()
const expanded = ref<Record<string, boolean>>({})

onMounted(() => store.loadHistory())

const allWeeks = computed(() => store.history)

function toggle(weekStart: string) {
  expanded.value[weekStart] = !expanded.value[weekStart]
}

function mealsFor(day: DayMenu) {
  return MEAL_TYPES.map((type) => ({ type, meal: day.meals[type] })).filter(({ meal }) => meal.dish.trim())
}

function dayHasContent(day: DayMenu) {
  return Object.values(day.meals).some((m) => m.dish.trim())
}

// One chef per fully home-cooked day, Michelin-star style — reuses dayMood's
// glyph rather than hardcoding the emoji again, so the two stay in sync.
function chefDaysCount(week: WeekMenu) {
  return week.days.filter((day) => dayMood(day) === '🧑‍🍳').length
}

// Same "only judge it once it's actually passed" rule as dayMood — a week
// still in progress just hasn't been filled in yet, that's not the same as
// a fully past week where nothing ever got planned.
function isEmptyWeek(week: WeekMenu) {
  const hasAnyDish =
    week.days.some((day) => Object.values(day.meals).some((m) => m.dish.trim())) ||
    week.weekendDessert.dish.trim().length > 0
  if (hasAnyDish) return false
  const lastDay = week.days[week.days.length - 1]
  return !!lastDay && lastDay.date <= toISO(new Date())
}
</script>

<template>
  <section class="history">
    <h1>Weekly history</h1>

    <LoadingState v-if="store.loading" />
    <p v-else-if="store.error" class="hint error">{{ store.error }}</p>
    <p v-else-if="allWeeks.length === 0" class="hint">No weeks yet.</p>

    <ul v-else class="week-list">
      <li
        v-for="week in allWeeks"
        :key="week.weekStart"
        class="week-item"
        :class="{ 'is-current': week.weekStart === thisWeek }"
      >
        <button
          type="button"
          class="week-summary"
          :class="{ 'is-sparse': isEmptyWeek(week) }"
          @click="toggle(week.weekStart)"
        >
          <div class="week-summary-content">
            <span class="range">{{ formatWeekRange(week.weekStart) }}<span
              v-if="chefDaysCount(week) && !expanded[week.weekStart]"
              class="chef-rating"
              :title="`${chefDaysCount(week)} home-cooked day${chefDaysCount(week) > 1 ? 's' : ''} this week`"
            ><span v-for="n in chefDaysCount(week)" :key="n">🧑‍🍳</span></span><span
              v-if="isEmptyWeek(week) && !expanded[week.weekStart]"
              class="empty-week-mood"
              title="Nothing planned this week"
            >🕵️</span></span>
            <span v-if="week.weekStart === thisWeek" class="current-tag">This week</span>
            <span v-if="countMealsBySource(week, 'ordered')" class="source-badge ordered">
              {{ countMealsBySource(week, 'ordered') }} order
            </span>
            <span v-if="countMealsBySource(week, 'ateOut')" class="source-badge ateOut">
              {{ countMealsBySource(week, 'ateOut') }} eat out
            </span>
          </div>
          <span class="chevron" :class="{ open: expanded[week.weekStart] }">›</span>
        </button>

        <ul v-if="expanded[week.weekStart]" class="day-list">
          <li v-for="day in week.days" :key="day.date" class="day-item">
            <div class="day-header">
              <span class="day-name" :class="{ 'is-empty': !dayHasContent(day) }">{{ weekdayLabel(day.date) }}</span>
              <span v-if="dayMood(day)" class="day-mood">{{ dayMood(day) }}</span>
            </div>
            <ul v-if="dayHasContent(day)" class="meal-list">
              <li v-for="{ type, meal } in mealsFor(day)" :key="type" class="meal-item" :class="meal.source">
                <span class="meal-type">{{ MEAL_LABELS[type] }}</span>
                <a
                  v-if="isLikelyUrl(meal.dish)"
                  class="dish is-link"
                  :href="meal.dish"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="meal.dish"
                  @click.stop
                >{{ meal.title || meal.dish }}</a>
                <span v-else class="dish">{{ meal.dish }}</span>
                <span v-if="meal.source !== 'home'" class="source-badge" :class="meal.source">
                  {{ SOURCE_LABEL[meal.source] }}
                </span>
              </li>
            </ul>
          </li>
          <li class="day-item dessert-item">
            <div class="day-header">
              <span class="day-name" :class="{ 'is-empty': !week.weekendDessert.dish.trim() }">Weekend Dessert</span>
            </div>
            <ul v-if="week.weekendDessert.dish.trim()" class="meal-list">
              <li class="meal-item" :class="week.weekendDessert.source">
                <span class="meal-type">Dessert</span>
                <a
                  v-if="isLikelyUrl(week.weekendDessert.dish)"
                  class="dish is-link"
                  :href="week.weekendDessert.dish"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="week.weekendDessert.dish"
                  @click.stop
                >{{ week.weekendDessert.title || week.weekendDessert.dish }}</a>
                <span v-else class="dish">{{ week.weekendDessert.dish }}</span>
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

.hint.error {
  color: #dc2626;
  opacity: 1;
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
  /* Same token as Plan's "today" cell border (see MealCell.vue) — not the
     solid --accent, which is reserved for hover/focus/interactive states. */
  border: 1px solid var(--accent-border);
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

/* Its own flex item, separate from .chevron — so when this wraps onto two
   lines (badges below the date, see the mobile media query), align-items on
   .week-summary centers the chevron against this whole block's height
   instead of tying it to whichever line it happened to land on. */
.week-summary-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.range {
  font-weight: 600;
  color: var(--text-h);
  flex: 1;
}

.chef-rating {
  margin-left: 0.35rem;
  font-size: 1rem;
}

.empty-week-mood {
  margin-left: 0.35rem;
  font-size: 1rem;
}

.chevron {
  font-size: 1.4rem;
  line-height: 1;
  color: var(--text-h);
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
  /* Matches .day-list's gap so the dashed line sits centered between Sunday's
     content and this heading, instead of hugging one side. */
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);
}

.day-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.day-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-h);
  opacity: 0.7;
}

.day-name.is-empty {
  display: inline-block;
  /* Cancel the left padding so the text lines up with filled days' text
     instead of sitting half a rem further right. */
  margin-left: -0.5rem;
  font-weight: 500;
  color: var(--text);
  opacity: 0.5;
  background: var(--bg-muted);
  border: 1px dashed var(--border-muted);
  border-radius: 6px;
  padding: 0.1rem 0.5rem;
}

.day-mood {
  font-size: 0.9rem;
  line-height: 1;
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
  background: rgba(22, 163, 74, 0.12);
}

.meal-item.ateOut {
  background: rgba(3, 105, 161, 0.12);
}

.meal-item.ordered .dish,
.meal-item.ateOut .dish {
  font-weight: 600;
  color: var(--text-h);
}

.dish {
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* No overflow/white-space overrides — inherits .dish's 2-line wrap instead of
   truncating to one line, since this now usually shows a resolved recipe
   title (a real sentence) rather than a bare URL. */
.dish.is-link {
  text-decoration: underline;
  text-underline-offset: 2px;
  color: var(--accent);
}

.meal-type {
  /* Solid color, not dimmed — sharing "greyed-out" as the only distinguishing
     trait against .day-name.is-empty was what made them easy to mix up
     regardless of how far apart the opacity values were. */
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
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
  background: #16a34a;
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

/* Below this width the single-line summary (date + badges + count + chevron)
   gets too tight and the date wraps awkwardly — give the date its own line
   and open up the day-list spacing so it doesn't feel crammed. */
@media (max-width: 700px) {
  .week-summary {
    padding: 1rem;
  }

  .week-summary-content {
    flex-wrap: wrap;
    row-gap: 0.6rem;
  }

  .range {
    flex: 1 1 100%;
    font-size: 1.05rem;
  }

  /* An empty week has no badges/tag to wrap onto a second row — forcing the
     date full-width here would leave the chevron stranded alone below it, so
     keep this one row instead of following the wrap behavior above. */
  .week-summary.is-sparse .week-summary-content {
    flex-wrap: nowrap;
  }

  .week-summary.is-sparse .range {
    flex: 1;
  }

  .day-list {
    gap: 1rem;
    padding: 0.5rem 1rem 1.1rem;
  }

  .dessert-item {
    padding-top: 1rem;
  }

  .day-header {
    margin-bottom: 0.3rem;
  }

  .day-name {
    font-size: 0.95rem;
  }

  .meal-list {
    gap: 0.5rem;
    margin-top: 0.3rem;
  }

  .meal-item {
    padding: 0.6rem 0.7rem;
    font-size: 1rem;
  }

  .meal-type {
    font-size: 0.85rem;
  }
}

/* Just a wider column for better line-length on a wide viewport — text size
   and padding stay exactly as they are elsewhere, not scaled up. */
@media (min-width: 1024px) {
  .history {
    max-width: 900px;
  }
}
</style>
