<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getHomeCookedDishes } from '../api/menuApi'
import type { HomeCookedDish } from '../api/menuApi'
import LoadingState from '../components/LoadingState.vue'
import { datesInWeek, formatDate, toISO, weekStartFor } from '../utils/week'

const dishes = ref<HomeCookedDish[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const todayISO = toISO(new Date())
const thisWeekDates = new Set(datesInWeek(weekStartFor()))

type DateBadge = 'thisWeek' | 'upcoming' | null

function dateBadge(dateStr: string | null): DateBadge {
  if (!dateStr)
    return null

  if (thisWeekDates.has(dateStr))
    return 'thisWeek'

  if (dateStr > todayISO)
    return 'upcoming'

  return null
}

const rows = computed(() => dishes.value.map((d) => ({ ...d, badge: dateBadge(d.lastCooked) })))

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    dishes.value = await getHomeCookedDishes()
  } catch {
    error.value = 'Could not load recipes — check your connection and try again.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="recipes">
    <h1>Recipes</h1>

    <LoadingState v-if="loading" />
    <p v-else-if="error" class="hint error">{{ error }}</p>
    <p v-else-if="dishes.length === 0" class="hint">No recipes yet.</p>

    <ul v-else class="dish-list">
      <li v-for="d in rows" :key="d.name" class="dish-row">
        <span class="dish-name"
          ><a v-if="d.url" class="dish-link" :href="d.url" target="_blank" rel="noopener noreferrer" :title="d.url">{{
            d.name
          }}</a><template v-else>{{ d.name }}</template></span
        >
        <span class="dish-count">{{ d.count }}×</span>
        <span class="dish-last"
          ><span
            class="date-text"
            :class="{ 'date-text-flagged': d.badge }"
            :title="d.badge === 'thisWeek' ? 'This week' : d.badge === 'upcoming' ? 'Upcoming' : undefined"
            >{{ d.lastCooked ? formatDate(d.lastCooked) : '—' }}</span
          ></span
        >
      </li>
    </ul>
  </section>
</template>

<style scoped>
.recipes {
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

.dish-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dish-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
}

.dish-name {
  flex: 1;
  min-width: 0;
  color: var(--text-h);
}

/* Same treatment as a linked dish everywhere else (MealCell.vue, HistoryView.vue,
   InsightsView.vue) — inherits this container's weight/color, just adds the
   underline + accent tint that marks it as clickable. */
.dish-link {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dish-count {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--text-h);
  font-size: 0.85rem;
  min-width: 2.2rem;
  text-align: right;
}

.dish-last {
  flex-shrink: 0;
  font-size: 0.8rem;
  min-width: 6.5rem;
  text-align: right;
}

.date-text {
  color: var(--text);
  opacity: 0.7;
}

/* "last cooked" can actually be a future-planned or this week's date
    this quietly flags that */
.date-text-flagged {
  opacity: 1;
  font-style: italic;
}

@media (max-width: 480px) {
  .dish-row {
    flex-wrap: wrap;
  }

  .dish-name {
    flex: 1 1 100%;
  }
}

@media (min-width: 1024px) {
  .recipes {
    max-width: 900px;
  }
}
</style>
