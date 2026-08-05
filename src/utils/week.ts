import type { DayMenu, MealSource, MealType, WeekMenu } from '../types/menu'

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay()
  return day === 0 || day === 6
}

export function isLikelyUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value)
}

export function toISO(d: Date): string {
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD, timezone-safe
}

export function mondayOf(d: Date): Date {
  const dayIdx = (d.getDay() + 6) % 7 // Mon=0 .. Sun=6
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayIdx)
  return monday
}

export function weekStartFor(d: Date = new Date()): string {
  return toISO(mondayOf(d))
}

export function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + delta * 7)
  return toISO(d)
}

export function datesInWeek(weekStart: string): string[] {
  const start = new Date(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toISO(d)
  })
}

export function weekdayLabel(dateStr: string): string {
  return WEEKDAY_LABELS[(new Date(dateStr).getDay() + 6) % 7]!
}

export function countMealsBySource(week: WeekMenu, source: MealSource): number {
  const dayCount = week.days.reduce(
    (sum, day) => sum + Object.values(day.meals).filter((m) => m.source === source).length,
    0,
  )
  return dayCount + (week.weekendDessert.source === source ? 1 : 0)
}

export function formatWeekRange(weekStart: string): string {
  const dates = datesInWeek(weekStart)
  const start = new Date(dates[0]!)
  const end = new Date(dates[6]!)
  const startFmt = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const endFmt = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startFmt} – ${endFmt}`
}

// A light-hearted, non-judgmental aside for days that lean entirely one way
// — never shown for a day that hasn't happened yet, since "no plan" only
// means something once the day's actually passed. Shared by Plan (the
// current week, live) and History (every past week). Just the glyph, no
// label or badge styling — a specific food emoji (pizza, egg, etc.) would
// wrongly imply that exact dish, so these stay generic ("who"/"how", not
// "what"): a cook for home-cooked, a takeout box for anything that wasn't.
export function dayMood(day: DayMenu): string | null {
  if (day.date > toISO(new Date())) return null
  const filled = Object.values(day.meals).filter((m) => m.dish.trim())
  if (filled.length === 0) return '🕵️'
  if (filled.every((m) => m.source === 'home')) return '🧑‍🍳'
  if (filled.every((m) => m.source !== 'home')) return '🥡'
  return null
}
