<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

// Paired by index — LOADING_TEXTS[i] always narrates LOADING_EMOJIS[i].
const LOADING_EMOJIS = ['🍳', '🥘', '🧑‍🍳', '📖', '🥡', '🍽️', '🫕', '🛒', '🔪', '⏲️', '🥗']
const LOADING_TEXTS = [
  'Cracking a few eggs…',
  'Stirring the pot…',
  'Consulting the chef…',
  'Flipping through recipes…',
  'Waiting on the delivery…',
  'Setting the table…',
  'Letting it simmer…',
  'Running to the shop…',
  'Sharpening a knife…',
  'Watching the timer…',
  'Tossing the salad…',
]

const idx = ref(0)
const order = ref<number[]>([])

// A fresh shuffle each time this mounts, so it doesn't always open on the same line.
function shuffleOrder() {
  const indices = Array.from({ length: LOADING_EMOJIS.length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  order.value = shuffleOrder()
  idx.value = 0
  interval = setInterval(() => {
    idx.value = (idx.value + 1) % LOADING_EMOJIS.length
  }, 2200)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="loading-state">
    <Transition name="loading-swap" mode="out-in">
      <span :key="idx" class="loading-emoji">{{ LOADING_EMOJIS[order[idx]] }}</span>
    </Transition>
    <Transition name="loading-swap" mode="out-in">
      <span :key="idx" class="loading-text">{{ LOADING_TEXTS[order[idx]] }}</span>
    </Transition>
  </div>
</template>

<style scoped>
.loading-state {
  padding: 3rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  overflow: hidden;
}

.loading-emoji {
  font-size: 2rem;
  display: block;
  line-height: 1;
}

.loading-text {
  font-size: 0.8rem;
  color: var(--text);
  opacity: 0.6;
  display: block;
  text-align: center;
}

.loading-swap-enter-active,
.loading-swap-leave-active {
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}

.loading-swap-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.loading-swap-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.loading-swap-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.loading-swap-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
