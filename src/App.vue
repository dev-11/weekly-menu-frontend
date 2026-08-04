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
      <nav>
        <router-link to="/">Plan</router-link>
        <router-link to="/history">History</router-link>
        <router-link to="/insights">Insights</router-link>
        <button
          type="button"
          class="theme-toggle"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggleTheme"
        >
          {{ isDark ? '🌙' : '☀️' }}
        </button>
      </nav>
    </header>
    <router-view />
  </div>
</template>

<style scoped>
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.brand {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 600;
  color: var(--text-h);
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

/* A 3rd nav link (Insights) tipped this over — without tightening, "Weekly
   Menu" wraps to two lines on a phone-width screen. */
@media (max-width: 420px) {
  .top-nav {
    padding: 1rem 0.75rem;
  }

  .brand {
    font-size: 1rem;
  }

  nav {
    gap: 0.1rem;
  }

  nav a {
    padding: 0.35rem 0.4rem;
  }
}
</style>
