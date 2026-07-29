import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as menuApi from '../api/menuApi'
import type { WeekMenu } from '../types/menu'

export const useMenuStore = defineStore('menu', () => {
  const currentWeek = ref<WeekMenu | null>(null)
  const history = ref<WeekMenu[]>([])
  const loading = ref(false)
  const saving = ref(false)

  async function loadWeek(weekStart: string) {
    loading.value = true
    try {
      currentWeek.value = await menuApi.getWeek(weekStart)
    } finally {
      loading.value = false
    }
  }

  async function loadHistory() {
    loading.value = true
    try {
      history.value = await menuApi.listWeeks()
    } finally {
      loading.value = false
    }
  }

  async function saveCurrentWeek() {
    if (!currentWeek.value) return
    saving.value = true
    try {
      currentWeek.value = await menuApi.saveWeek(currentWeek.value)
      const idx = history.value.findIndex((w) => w.weekStart === currentWeek.value!.weekStart)
      if (idx >= 0) history.value[idx] = currentWeek.value
    } finally {
      saving.value = false
    }
  }

  return { currentWeek, history, loading, saving, loadWeek, loadHistory, saveCurrentWeek }
})
