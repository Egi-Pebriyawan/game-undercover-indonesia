<script setup>
import { onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useRouter } from 'vue-router'

const gameStore = useGameStore()
const router = useRouter()

onMounted(async () => {
  const player = await gameStore.restoreSession()
  if (player && gameStore.currentRoom) {
    // If we have a room, navigate to the correct view based on status
    const status = gameStore.currentRoom.status
    const code = gameStore.currentRoom.room_code
    
    if (status === 'LOBBY') {
      router.push(`/room/${code}`)
    } else {
      router.push(`/room/${code}/play`)
    }
  }
})
</script>

<template>
  <router-view />

  <!-- Global Notification -->
  <Teleport to="body">
    <div 
      v-if="gameStore.notification.show" 
      class="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top duration-500"
      :class="gameStore.notification.type === 'error' ? 'bg-white border-red-100 text-red-600' : 'bg-white border-primary-100 text-primary-600'"
    >
      <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50">
        <span class="text-lg">{{ gameStore.notification.type === 'error' ? '⚠️' : '✅' }}</span>
      </div>
      <p class="font-black text-xs tracking-widest uppercase">{{ gameStore.notification.message }}</p>
    </div>
  </Teleport>
</template>

<style>
#app {
  width: 100%;
  @apply min-h-screen;
}
</style>
