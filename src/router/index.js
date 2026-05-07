import { createRouter, createWebHistory } from 'vue-router'

// Lazy load components for better performance
const HomeView = () => import('../views/HomeView.vue')
const LobbyView = () => import('../views/LobbyView.vue')
const GameplayView = () => import('../views/GameplayView.vue')
const VotingView = () => import('../views/VotingView.vue')
const GuessView = () => import('../views/GuessView.vue')
const FinishedView = () => import('../views/FinishedView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/room/:id',
      name: 'lobby',
      component: LobbyView
    },
    {
      path: '/room/:id/play',
      name: 'gameplay',
      component: GameplayView
    },
    {
      path: '/room/:id/vote',
      name: 'voting',
      component: VotingView
    },
    {
      path: '/room/:id/guess',
      name: 'guess',
      component: GuessView
    },
    {
      path: '/room/:id/finish',
      name: 'finish',
      component: FinishedView
    }
  ]
})

export default router
