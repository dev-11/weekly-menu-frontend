import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as menuApi from '../api/menuApi'
import type { WeekMenu } from '../types/menu'

export const useMenuStore = defineStore('menu', () => {
  const currentWeek = ref<WeekMenu | null>(null)
  const history = ref<WeekMenu[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function loadWeek(weekStart: string) {
    loading.value = true
    error.value = null
    try {
      currentWeek.value = await menuApi.getWeek(weekStart)
    } catch {
      error.value = 'Could not load this week — check your connection and try again.'
    } finally {
      loading.value = false
    }
  }

  async function loadHistory() {
    loading.value = true
    error.value = null
    try {
      history.value = await menuApi.listWeeks()
    } catch {
      error.value = 'Could not load history — check your connection and try again.'
    } finally {
      loading.value = false
    }
  }

  // Serialized so two saves are never in flight at once — otherwise a slow
  // request can land after a newer one and overwrite it server-side. If a
  // save is triggered while one's already running, it's queued to re-fire
  // once the current one finishes rather than firing a second request now.
  let saveInFlight: Promise<void> | null = null
  let saveQueued = false

  async function saveCurrentWeek() {
    if (!currentWeek.value) return
    if (saveInFlight) {
      saveQueued = true
      return saveInFlight
    }
    saveInFlight = performSave()
    await saveInFlight
    saveInFlight = null
    if (saveQueued) {
      saveQueued = false
      await saveCurrentWeek()
    }
  }

  async function performSave() {
    saving.value = true
    error.value = null
    try {
      // The response is just an echo of what we sent (see backend's PUT
      // handler), never assigned back — currentWeek.value already holds
      // every edit made locally, including ones made while this request
      // was in flight, and overwriting it with the (now stale) response
      // would silently drop those.
      await menuApi.saveWeek(currentWeek.value!)
      const idx = history.value.findIndex((w) => w.weekStart === currentWeek.value!.weekStart)
      if (idx >= 0) history.value[idx] = currentWeek.value!
    } catch {
      error.value = 'Could not save — check your connection and try again.'
    } finally {
      saving.value = false
    }
  }

  return { currentWeek, history, loading, saving, error, loadWeek, loadHistory, saveCurrentWeek }
})
