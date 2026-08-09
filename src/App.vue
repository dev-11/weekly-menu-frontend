<script setup lang="ts">
import { ref } from 'vue'

const stored = localStorage.getItem('theme')
const isDark = ref(
  stored !== null ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches,
)
applyTheme()

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}
</script>

<template>
  <div id="app">
    <header class="top-nav">
      <h1 class="brand">Weekly Menu</h1>
      <div class="nav-group">
        <nav>
          <router-link to="/">Plan</router-link>
          <router-link to="/history">History</router-link>
          <router-link to="/insights">Insights</router-link>
          <router-link to="/recipes">Recipes</router-link>
        </nav>
        <button
          type="button"
          class="theme-toggle"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggleTheme"
        >
          {{ isDark ? '🌙' : '☀️' }}
        </button>
      </div>
    </header>
    <router-view />
  </div>
</template>

<style scoped>
.top-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--page-bg);
  border-bottom: 1px solid var(--border);
}

.brand {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 600;
  color: var(--text-h);
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

nav a {
  color: var(--text);
  text-decoration: none;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
}

nav a.router-link-active {
  color: var(--text-h);
  background: var(--accent-bg);
}

.theme-toggle {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  border-radius: 8px;
  width: 2.1rem;
  height: 2.1rem;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 1024px) {
  .top-nav {
    padding: 1rem 2rem;
  }
}

/* 4 links finally outgrew squeezing everything onto one row — shrinking
   padding/gap further just made links cramped without actually fitting.
   Wrapping nav onto its own full-width second row scales better as more
   links get added later. Links stay clustered with a small consistent gap
   here (not stretched edge-to-edge) — space-between across four
   uneven-length labels read as scattered rather than deliberate; only the
   toggle is pushed off to the right, same grouping as desktop. */
@media (max-width: 480px) {
  .top-nav {
    flex-wrap: wrap;
    row-gap: 0.6rem;
    padding: 0.85rem 1rem;
  }

  .brand {
    font-size: 1rem;
  }

  .nav-group {
    width: 100%;
    justify-content: space-between;
  }

  nav {
    gap: 0.15rem;
  }

  nav a {
    padding: 0.35rem 0.5rem;
    font-size: 0.9rem;
  }
}
</style>
