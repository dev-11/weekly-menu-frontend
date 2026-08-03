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

  async function saveCurrentWeek() {
    if (!currentWeek.value) return
    saving.value = true
    error.value = null
    try {
      currentWeek.value = await menuApi.saveWeek(currentWeek.value)
      const idx = history.value.findIndex((w) => w.weekStart === currentWeek.value!.weekStart)
      if (idx >= 0) history.value[idx] = currentWeek.value
    } catch {
      error.value = 'Could not save — check your connection and try again.'
    } finally {
      saving.value = false
    }
  }

  return { currentWeek, history, loading, saving, error, loadWeek, loadHistory, saveCurrentWeek }
})
