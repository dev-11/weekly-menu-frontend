<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { unfurlTitle } from '../api/menuApi'
import type { MealEntry, MealSource } from '../types/menu'
import { isLikelyUrl } from '../utils/week'

const props = defineProps<{ meal: MealEntry; today?: boolean }>()
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

async function resolveTitle(url: string) {
  const title = await unfurlTitle(url)
  // Bail if the dish changed again while the title was in flight — don't
  // clobber whatever's there now with a stale resolved title.
  if (!title || props.meal.dish !== url) return
  props.meal.title = title
  emit('commit')
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const value = draft.value.trim()
  if (value === props.meal.dish) return

  props.meal.dish = value
  props.meal.title = undefined
  emit('commit')

  if (isLikelyUrl(value)) resolveTitle(value)
}

// Backfills titles for links saved before this feature existed (or ones a
// previous unfurl attempt failed on) — otherwise only a fresh edit would ever
// trigger one, leaving every already-saved link stuck showing its raw URL.
onMounted(() => {
  if (isLikelyUrl(props.meal.dish) && !props.meal.title) {
    resolveTitle(props.meal.dish)
  }
})

function cancel() {
  editing.value = false
}

// Long-press (touch only) copies the raw dish text to the clipboard — for a
// link that's the URL itself, not whatever resolved title happens to be
// showing, so pasting it elsewhere reuses the actual source rather than a
// display label.
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressFired = false
let touchStartX = 0
let touchStartY = 0
const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10

function onTouchStart(e: TouchEvent) {
  if (editing.value) return
  const touch = e.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  longPressFired = false
  longPressTimer = setTimeout(() => {
    longPressFired = true
    longPressTimer = null
    if (props.meal.dish) {
      copyMeal()
    } else {
      setSkipped(props.meal.source !== 'skipped')
    }
  }, LONG_PRESS_MS)
}

function onTouchMove(e: TouchEvent) {
  if (!longPressTimer) return
  const touch = e.touches[0]
  if (!touch) return
  if (Math.abs(touch.clientX - touchStartX) > MOVE_CANCEL_PX || Math.abs(touch.clientY - touchStartY) > MOVE_CANCEL_PX) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

// Not passive — a fired long-press needs to suppress the synthetic click
// (and, on the link-open zone, the default navigation) that would otherwise
// follow this same touch and immediately open editing or the link.
function onTouchEnd(e: TouchEvent) {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  if (longPressFired) {
    e.preventDefault()
    longPressFired = false
  }
}

function onTouchCancel() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  longPressFired = false
}

async function copyMeal() {
  const text = props.meal.dish.trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    return
  }
  navigator.vibrate?.(15)
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1200)
}

// Only meaningful while dish is empty — marks the slot as deliberately left
// blank rather than "haven't gotten to it yet", without needing any text
// entered. Reachable via long-press (touch) or the hover-revealed pill
// (desktop, see the @media (hover: hover) rules below).
function setSkipped(skip: boolean) {
  props.meal.source = skip ? 'skipped' : 'home'
  emit('commit')
}

function toggleSkipClick(e: Event) {
  e.stopPropagation()
  setSkipped(props.meal.source !== 'skipped')
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

// 'skipped' entries here are dead code in practice — the badge that reads
// these only renders when meal.dish is truthy (see template), and a skipped
// meal never has one — but Record<MealSource, ...> requires every key.
const SOURCE_CYCLE: Record<MealSource, MealSource> = {
  home: 'ordered',
  ordered: 'ateOut',
  ateOut: 'home',
  skipped: 'home',
}

const SOURCE_LABEL: Record<MealSource, string> = {
  home: '',
  ordered: 'Order',
  ateOut: 'Eat out',
  skipped: '',
}

const SOURCE_TITLE: Record<MealSource, string> = {
  home: 'Home cooked — click to flag as order or eat out',
  ordered: 'Order — click to change',
  ateOut: 'Eat out — click to reset to home cooked',
  skipped: '',
}

const sourceLabel = computed(() => SOURCE_LABEL[props.meal.source])
const sourceTitle = computed(() => SOURCE_TITLE[props.meal.source])

function cycleSource(e: Event) {
  e.stopPropagation()
  props.meal.source = SOURCE_CYCLE[props.meal.source]
  emit('commit')
}

const dishIsLink = computed(() => isLikelyUrl(props.meal.dish))
const isSkipped = computed(() => props.meal.source === 'skipped')
</script>

<template>
  <div
    ref="cellRoot"
    class="cell"
    :class="[`source-${meal.source}`, { filled: !!meal.dish, today }]"
    @focusout="onFocusOut"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
  >
    <div v-if="!editing" class="cell-view" tabindex="0" @click="startEdit" @keydown.enter="startEdit">
      <Transition name="copied-fade">
        <span v-if="copied" class="copied-flag" aria-hidden="true">Copied</span>
      </Transition>
      <span v-if="dishIsLink" class="dish is-link" :title="meal.dish">{{ meal.title || meal.dish }}</span>
      <span v-else-if="meal.dish" class="dish">{{ meal.dish }}</span>
      <span v-else class="placeholder" :class="{ 'placeholder-skipped': isSkipped }">{{ isSkipped ? 'Skipped' : '+ Add' }}</span>

      <!-- Overlay layer, not part of the card's own box — the card underneath
           looks and sizes exactly like any other cell. Top opens the recipe,
           bottom edits; a hover tint is the only sign either zone exists. -->
      <template v-if="dishIsLink">
        <a
          class="link-zone link-zone-open"
          :href="meal.dish"
          target="_blank"
          rel="noopener noreferrer"
          :title="meal.dish"
          @click.stop
        ></a>
        <button type="button" class="link-zone link-zone-edit" title="Edit" aria-label="Edit" @click.stop="startEdit"></button>
        <span class="link-hint" aria-hidden="true">•</span>
      </template>

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

/* A lighter, translucent tint of --accent rather than the solid --accent
   itself — that solid color already means "hover/focus/editing" below, so
   reusing it here would make today's cells look permanently focused. Only
   targets .cell-view (the at-rest state), not .cell-input — while actively
   editing, the normal solid accent border should show same as any other day. */
.cell.today .cell-view {
  border-color: var(--accent-border);
}

/* Prefixed with .cell so this ties the specificity of the rule above instead
   of losing to it — filled cells used to swallow this on hover because
   ".cell.filled .cell-view" (3 classes) outranked ".cell-view:hover"
   (2 classes), so only empty cells ever showed it. */
.cell .cell-view:hover,
.cell .cell-view:focus-visible {
  background: var(--accent-bg);
  border-style: solid;
  border-color: var(--accent);
  outline: none;
}

/* One weight, one color, every dish, every source — order/eat-out is already
   signaled clearly by the colored badge, so the text itself doesn't also
   need to change; mixing bold and regular within the same grid read as
   inconsistent rather than as meaningful emphasis. */
.dish {
  font-size: 0.9rem;
  color: var(--text);
  word-break: break-word;
  padding-right: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dish.is-link {
  flex: 1;
  min-width: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  color: var(--accent);
  padding-right: 0.9rem;
}

/* A transparent layer stacked on top of the card, not a part of its box —
   the card underneath keeps the exact size/border/background of every other
   cell. Top zone opens the recipe, bottom edits; a hover tint is the only
   thing that reveals the split, nothing is visible at rest. */
.link-zone {
  position: absolute;
  left: 0;
  right: 0;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  touch-action: manipulation;
}

.link-zone-open {
  top: 0;
  bottom: 0.9rem;
  border-radius: 8px 8px 0 0;
}

.link-zone-edit {
  bottom: 0;
  height: 0.9rem;
  border-radius: 0 0 8px 8px;
}

/* A tiny glyph, not a boundary line — always present so the split is
   discoverable at a glance, not just once you happen to hover the card. */
.link-hint {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  font-size: 0.9rem;
  line-height: 1;
  color: var(--text);
  opacity: 0.45;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.cell .cell-view:hover .link-hint,
.cell .cell-view:focus-within .link-hint {
  opacity: 0.7;
}

/* No background of its own — the whole card already tints via
   ".cell .cell-view:hover" while any part of it (including this zone) is
   hovered, and layering another copy of the same tint here made the top
   read twice as strong as the untouched strip below it. */
.link-zone-open:focus-visible {
  outline: none;
}

.link-zone-edit:hover,
.link-zone-edit:focus-visible {
  /* Distinctly darker than the top zone's hover tint, so the two are
     unmistakably different actions rather than the same green twice. */
  background: var(--accent-bg-strong);
  outline: none;
}

.placeholder {
  font-size: 0.85rem;
  opacity: 0.4;
}

/* Brief, self-dismissing confirmation for the long-press-to-copy gesture —
   clipboard writes are otherwise silent, so without this there'd be no sign
   anything happened at all. */
.copied-flag {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--accent);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  pointer-events: none;
  white-space: nowrap;
}

.copied-fade-enter-active,
.copied-fade-leave-active {
  transition: opacity 0.2s ease;
}

.copied-fade-enter-from,
.copied-fade-leave-to {
  opacity: 0;
}

.source-badge {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  /* Above the link-zone overlay, which otherwise sits on top and would eat
     the click before it reaches the badge underneath it. */
  z-index: 1;
  min-width: 0.6rem;
  min-height: 0.6rem;
  border: none;
  /* A perfect circle regardless of size — 4px looked round at 0.6rem but
     squared-off once the mobile media query grows the box to 1.4rem. */
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  background: var(--border);
  opacity: 0.4;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.3;
  color: white;
}

/* The badge itself stays small so it doesn't dominate the cell, but its real
   tap target is expanded well past that — the visible size is way under
   Apple's 44x44pt minimum, so taps kept landing on the cell behind it. */
.source-badge::after {
  content: '';
  position: absolute;
  inset: -12px;
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
  background: #16a34a;
  opacity: 1;
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
}

.cell.source-ateOut .source-badge {
  background: #0369a1;
  opacity: 1;
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
}

.cell-input {
  color: inherit;
  font: inherit;
  /* Deliberately 16px, not 0.9rem like .dish — iOS Safari auto-zooms the page
     on focus for any input under 16px, which shoves the cell off-screen. */
  font-size: 16px;
  font-weight: 400;
  background: var(--bg-elevated);
  border: 1px solid var(--accent);
}

/* Below this width the grid gives way to the day-list layout, whose cells are
   wide enough to afford a genuinely bigger badge — not just a bigger invisible
   hit area, an actually bigger target that's easier to aim for on a touchscreen. */
@media (max-width: 700px) {
  .source-badge {
    top: 0.5rem;
    right: 0.5rem;
    min-width: 1.4rem;
    min-height: 1.4rem;
    font-size: 0.8rem;
  }

  .cell.source-ordered .source-badge,
  .cell.source-ateOut .source-badge {
    padding: 0.35rem 0.6rem;
  }
}

/* Deliberately no desktop-specific sizing here — the card itself stays
   exactly as it is on mobile. Desktop gets more room from wider grid columns
   and gaps (see PlannerView.vue), not from the cells themselves getting
   bigger/bolder; that read as heavier, not airier. */
</style>
