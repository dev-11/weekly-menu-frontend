import type { MealEntry, WeekMenu } from '../types/menu'
import { datesInWeek } from '../utils/week'

// Trailing slash tolerated regardless of how the env var is set, otherwise
// ".../weekly_planner/" + "/" + weekStart produces a double "//" that API
// Gateway doesn't route the same as a single slash.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '')

function meal(dish: string, source: MealEntry['source'] = 'home'): MealEntry {
  return { dish, source }
}

function emptyWeek(weekStart: string): WeekMenu {
  return {
    weekStart,
    days: datesInWeek(weekStart).map((date) => ({
      date,
      meals: { breakfast: meal(''), lunch: meal(''), dinner: meal('') },
    })),
    weekendDessert: meal(''),
  }
}

export async function getWeek(weekStart: string): Promise<WeekMenu> {
  const response = await fetch(`${API_BASE_URL}/${weekStart}`)
  if (response.status === 404) return emptyWeek(weekStart)
  if (!response.ok) throw new Error(`Failed to load week ${weekStart}: ${response.status}`)
  return response.json()
}

export async function listWeeks(): Promise<WeekMenu[]> {
  const response = await fetch(API_BASE_URL)
  if (!response.ok) throw new Error(`Failed to list weeks: ${response.status}`)
  const weeks: WeekMenu[] = await response.json()
  return weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

export async function saveWeek(week: WeekMenu): Promise<WeekMenu> {
  const response = await fetch(`${API_BASE_URL}/${week.weekStart}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(week),
  })
  if (!response.ok) throw new Error(`Failed to save week ${week.weekStart}: ${response.status}`)
  return response.json()
}
