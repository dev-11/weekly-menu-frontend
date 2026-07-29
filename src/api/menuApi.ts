import type { MealEntry, MealType, WeekMenu } from '../types/menu'
import { addWeeks, datesInWeek, weekStartFor } from '../utils/week'

// Mock API — same shape as a future backend (async, keyed by weekStart).
// Persists to localStorage so data survives reloads during development.
// Swap the bodies below for axios calls once a real backend exists.

const STORAGE_KEY = 'weekly-menu:weeks:v6'
const LATENCY_MS = 150

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

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

// One row of seed dishes per meal type, indexed Monday(0)..Sunday(6), plus one dessert for the weekend.
// A trailing "^" marks a dish as ordered in; a trailing "*" marks it as eaten out at a restaurant.
const SEED_WEEKS: { meals: Record<MealType, string[]>; dessert: string }[] = [
  {
    meals: {
      breakfast: ['Porridge', 'Toast & eggs', 'Yoghurt & granola', 'Smoothie', 'Beans on toast', 'Pancakes', 'Full English'],
      lunch: ['Soup & bread', 'Chicken wrap', 'Leftover stir-fry', 'Tuna salad', 'Grilled cheese', 'Sandwiches', 'Roast dinner'],
      dinner: ['Chicken stir-fry', 'Spaghetti bolognese', 'Lentil soup', 'Fish tacos', 'Veggie curry', 'Pizza^', 'Roast dinner'],
    },
    dessert: 'Apple crumble',
  },
  {
    meals: {
      breakfast: ['Overnight oats', 'Fried eggs', 'Cereal', 'Fruit salad', 'Bagels', 'French toast', 'Full English'],
      lunch: ['Leftovers', 'Falafel wrap', 'Rice salad', 'Soup', 'Quesadillas', 'Burgers', 'Sunday roast'],
      dinner: ['Beef tacos', 'Mushroom risotto', 'Chicken curry', 'Salmon & rice', 'Bean chilli', 'Thai takeaway^', 'Sunday roast'],
    },
    dessert: 'Sticky toffee pudding',
  },
  {
    meals: {
      breakfast: ['Porridge', 'Scrambled eggs', 'Granola', 'Smoothie bowl', 'Toast', 'Waffles', 'Full English'],
      lunch: ['Soup', 'Chicken salad', 'Leftovers', 'Wraps', 'Grilled cheese', 'Sushi restaurant*', 'Roast chicken'],
      dinner: ['Pad thai', 'Shepherd’s pie', 'Tomato pasta', 'Grilled chicken', 'Falafel wraps', 'Indian takeaway^', 'Roast chicken'],
    },
    dessert: 'Trifle',
  },
  {
    meals: {
      breakfast: ['Muesli', 'Poached eggs', 'Toast & jam', 'Yoghurt', 'Croissants', 'Pancakes', 'Full English'],
      lunch: ['Ramen leftovers', 'Fajita wrap', 'Quiche slice', 'Soup', 'Pasta salad', 'Pizzeria*', 'Sunday roast'],
      dinner: ['Ramen', 'Fajitas', 'Quiche', 'Thai green curry', 'Pasta primavera', 'BBQ ribs', 'Sunday roast'],
    },
    dessert: 'Cheesecake',
  },
]

function seedMeal(raw: string): MealEntry {
  if (raw.endsWith('^')) return meal(raw.slice(0, -1), 'ordered')
  if (raw.endsWith('*')) return meal(raw.slice(0, -1), 'ateOut')
  return meal(raw)
}

function loadAll(): Record<string, WeekMenu> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) return JSON.parse(raw)

  // First run: seed a handful of past weeks plus the current (empty) one.
  const seeded: Record<string, WeekMenu> = {}
  for (let i = SEED_WEEKS.length; i >= 1; i--) {
    const weekStart = addWeeks(weekStartFor(), -i)
    const seedRow = SEED_WEEKS[SEED_WEEKS.length - i]!
    const dates = datesInWeek(weekStart)
    seeded[weekStart] = {
      weekStart,
      days: dates.map((date, idx) => ({
        date,
        meals: {
          breakfast: seedMeal(seedRow.meals.breakfast[idx] ?? ''),
          lunch: seedMeal(seedRow.meals.lunch[idx] ?? ''),
          dinner: seedMeal(seedRow.meals.dinner[idx] ?? ''),
        },
      })),
      weekendDessert: meal(seedRow.dessert),
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

function persistAll(all: Record<string, WeekMenu>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function getWeek(weekStart: string): Promise<WeekMenu> {
  const all = loadAll()
  return delay(all[weekStart] ?? emptyWeek(weekStart))
}

export async function listWeeks(): Promise<WeekMenu[]> {
  const all = loadAll()
  const weeks = Object.values(all).sort((a, b) => b.weekStart.localeCompare(a.weekStart))
  return delay(weeks)
}

export async function saveWeek(week: WeekMenu): Promise<WeekMenu> {
  const all = loadAll()
  all[week.weekStart] = week
  persistAll(all)
  return delay(week)
}
