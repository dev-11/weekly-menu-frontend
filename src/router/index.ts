import { createRouter, createWebHistory } from 'vue-router'
import PlannerView from '../views/PlannerView.vue'
import HistoryView from '../views/HistoryView.vue'
import InsightsView from '../views/InsightsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'planner', component: PlannerView },
    { path: '/history', name: 'history', component: HistoryView },
    { path: '/insights', name: 'insights', component: InsightsView },
  ],
})

export default router
