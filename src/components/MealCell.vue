<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { MealEntry, MealSource } from '../types/menu'

const props = defineProps<{ meal: MealEntry }>()
const emit = defineEmits<{ (e: 'commit'): void }>()

const editing = ref(false)
const draft = ref('')
const cellRoot = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

async function startEdit() {
  draft.value = props.meal.dish
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const value = draft.value.trim()
  if (value !== props.meal.dish) {
    props.meal.dish = value
    emit('commit')
  }
}

function cancel() {
  editing.value = false
}

// Commit once focus has settled outside the cell. Deferred to the next frame because
// swapping the view span for the input removes the just-focused element, which fires a
// blur/focusout with relatedTarget null before the new input has taken focus.
function onFocusOut() {
  requestAnimationFrame(() => {
    if (cellRoot.value?.contains(document.activeElement)) return
    commit()
  })
}

const SOURCE_CYCLE: Record<MealSource, MealSource> = {
  home: 'ordered',
  ordered: 'ateOut',
  ateOut: 'home',
}

const SOURCE_LABEL: Record<MealSource, string> = {
  home: '',
  ordered: 'Order',
  ateOut: 'Eat out',
}

const SOURCE_TITLE: Record<MealSource, string> = {
  home: 'Home cooked — click to flag as order or eat out',
  ordered: 'Order — click to change',
  ateOut: 'Eat out — click to reset to home cooked',
}

const sourceLabel = computed(() => SOURCE_LABEL[props.meal.source])
const sourceTitle = computed(() => SOURCE_TITLE[props.meal.source])

function cycleSource(e: Event) {
  e.stopPropagation()
  props.meal.source = SOURCE_CYCLE[props.meal.source]
  emit('commit')
}
</script>

<template>
  <div ref="cellRoot" class="cell" :class="[`source-${meal.source}`, { filled: !!meal.dish }]" @focusout="onFocusOut">
    <div v-if="!editing" class="cell-view" tabindex="0" @click="startEdit" @keydown.enter="startEdit">
      <span v-if="meal.dish" class="dish">{{ meal.dish }}</span>
      <span v-else class="placeholder">+ Add</span>
      <button
        v-if="meal.dish"
        type="button"
        class="source-badge"
        :title="sourceTitle"
        @click="cycleSource"
      >
        {{ sourceLabel }}
      </button>
    </div>

    <input
      v-else
      ref="inputRef"
      v-model="draft"
      type="text"
      class="cell-input"
      @keydown.enter="commit"
      @keydown.esc="cancel"
    />
  </div>
</template>

<style scoped>
.cell {
  min-height: 4.5rem;
  display: flex;
}

.cell-view,
.cell-input {
  flex: 1;
  min-width: 0;
  padding: 0.6rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
}

.cell-view {
  cursor: pointer;
  position: relative;
  background: var(--bg-muted);
  border: 1px dashed var(--border-muted);
}

.cell.filled .cell-view {
  background: var(--bg-elevated);
  border-style: solid;
  border-color: var(--border);
}

.cell-view:hover,
.cell-view:focus-visible {
  background: var(--accent-bg);
  border-style: solid;
  border-color: var(--accent);
  outline: none;
}

.cell.source-ordered .cell-view,
.cell.source-ordered .cell-input {
  border-color: #4d7c0f;
}

.cell.source-ateOut .cell-view,
.cell.source-ateOut .cell-input {
  border-color: #0369a1;
}

.dish {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-h);
  word-break: break-word;
  padding-right: 0.25rem;
}

.placeholder {
  font-size: 0.85rem;
  opacity: 0.4;
}

.source-badge {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  min-width: 0.6rem;
  min-height: 0.6rem;
  border: none;
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  background: var(--border);
  opacity: 0.4;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.3;
  color: white;
}

.source-badge:hover,
.source-badge:focus-visible {
  opacity: 0.85;
  outline: none;
}

.source-badge:empty {
  padding: 0;
}

.cell.source-ordered .source-badge {
  background: #4d7c0f;
  opacity: 1;
  padding: 0.1rem 0.35rem;
}

.cell.source-ateOut .source-badge {
  background: #0369a1;
  opacity: 1;
  padding: 0.1rem 0.35rem;
}

.cell-input {
  color: inherit;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--bg-elevated);
  border: 1px solid var(--accent);
}
</style>
