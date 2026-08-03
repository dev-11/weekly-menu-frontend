export type MealType = 'breakfast' | 'lunch' | 'dinner'

// 'home' (default, no flag shown) | 'ordered' (ordered in / delivery) | 'ateOut' (ate at a restaurant)
export type MealSource = 'home' | 'ordered' | 'ateOut'

export interface MealEntry {
  dish: string
  source: MealSource
  // Resolved page title for a recipe-link dish (og:title, fallback <title>),
  // fetched once when the link is saved. Absent for plain-text dishes and for
  // links whose title couldn't be resolved — falls back to showing the URL.
  title?: string
}

export interface DayMenu {
  date: string // YYYY-MM-DD
  meals: Record<MealType, MealEntry>
}

export interface WeekMenu {
  weekStart: string // YYYY-MM-DD, always a Monday — unique key for a week
  days: DayMenu[] // always 7 entries, Monday through Sunday
  weekendDessert: MealEntry // one shared dessert for the whole Saturday–Sunday weekend
}
