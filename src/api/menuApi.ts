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

// Best-effort — a failed/slow unfurl shouldn't block saving the dish, it
// should just leave the cell showing the raw URL.
export async function unfurlTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/unfurl?url=${encodeURIComponent(url)}`)
    if (!response.ok) return null
    const { title } = await response.json()
    return title ?? null
  } catch {
    return null
  }
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

export interface InsightsSourceTypeBreakdown {
  type: string
  label: string
  count: number
  share: number
}

export interface InsightsTypeSourceBreakdown {
  type: string
  label: string
  total: number
  sources: { key: string; label: string; count: number; share: number }[]
}

export interface InsightsFavouriteDish {
  name: string
  count: number
  sources?: { home: number; ordered: number; ateOut: number }
}

export interface InsightsReport {
  favourites: {
    all: InsightsFavouriteDish[]
    byType: Record<string, InsightsFavouriteDish[]>
    ordered: InsightsFavouriteDish[]
    ateOut: InsightsFavouriteDish[]
  }
  repeatWarnings: { label: string; name: string; count: number; total: number; share: number }[]
  varietyByType: { type: string; label: string; unique: number; total: number }[]
  sourceBreakdown: { home: number; ordered: number; ateOut: number; total: number }
  sourceByType: {
    home: InsightsSourceTypeBreakdown[]
    ordered: InsightsSourceTypeBreakdown[]
    ateOut: InsightsSourceTypeBreakdown[]
  }
  typeSourceBreakdown: InsightsTypeSourceBreakdown[]
  onlyOnce: { name: string }[]
}

export async function getInsights(): Promise<InsightsReport> {
  const response = await fetch(`${API_BASE_URL}/insights`)
  if (!response.ok) throw new Error(`Failed to load insights: ${response.status}`)
  return response.json()
}
