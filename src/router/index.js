import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LobbyView from '../views/LobbyView.vue'
import GameplayView from '../views/GameplayView.vue'
import VotingView from '../views/VotingView.vue'
import GuessView from '../views/GuessView.vue'
import FinishedView from '../views/FinishedView.vue'

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
