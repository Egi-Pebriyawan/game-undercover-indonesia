import { defineStore } from 'pinia'
import { supabase } from '../services/supabase'

export const useGameStore = defineStore('game', {
  state: () => ({
    currentRoom: null,
    players: [],
    loading: false,
    error: null,
    notification: { show: false, message: '', type: 'error' }
  }),

    myPlayer: (state) => {
      const myId = localStorage.getItem('undercover_player_id')
      return state.players.find(p => p.id === myId) || null
    }
  },

  actions: {
    showNotify(msg, type = 'error') {
      this.notification = { show: true, message: msg, type }
      setTimeout(() => {
        this.notification.show = false
      }, 3000)
    },
    async createRoom(language = 'ID') {
      this.loading = true
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ 
          room_code: roomCode, 
          language, 
          status: 'LOBBY' 
        }])
        .select()
        .single()

      if (error) {
        this.error = error.message
        this.loading = false
        return null
      }

      this.currentRoom = data
      this.loading = false
      return data
    },

    async joinRoom(roomCode, nickname) {
      this.loading = true
      this.error = null
      
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single()

      if (roomError || !room) {
        this.error = 'Room not found'
        this.loading = false
        return null
      }

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert([{
          room_id: room.id,
          nickname,
          session_token: Math.random().toString(36).substring(7)
        }])
        .select()
        .single()

      if (playerError) {
        this.error = playerError.message
        this.loading = false
        return null
      }

      // If room has no host, set this player as host
      if (!room.host_id) {
        await supabase
          .from('rooms')
          .update({ host_id: player.id })
          .eq('id', room.id)
        
        room.host_id = player.id
      }

      this.currentRoom = room
      localStorage.setItem('undercover_session', player.session_token)
      localStorage.setItem('undercover_player_id', player.id)
      
      await this.fetchPlayers()
      
      this.loading = false
      return player
    },

    async restoreSession() {
      const sessionToken = localStorage.getItem('undercover_session')
      const playerId = localStorage.getItem('undercover_player_id')
      
      if (!sessionToken || !playerId) return null

      this.loading = true
      
      // 1. Get Player
      const { data: player, error: pError } = await supabase
        .from('players')
        .select('*, rooms(*)')
        .eq('id', playerId)
        .eq('session_token', sessionToken)
        .single()

      if (pError || !player) {
        localStorage.removeItem('undercover_session')
        localStorage.removeItem('undercover_player_id')
        this.loading = false
        return null
      }

      // 2. Set State
      this.currentRoom = player.rooms
      await this.fetchPlayers()
      this.loading = false
      return player
    },

    async subscribeToRoom() {
      if (!this.currentRoom) return

      const roomSubscription = supabase
        .channel(`room:${this.currentRoom.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'rooms',
          filter: `id=eq.${this.currentRoom.id}`
        }, payload => {
          this.currentRoom = payload.new
        })
        .subscribe()

      const playersSubscription = supabase
        .channel(`players:${this.currentRoom.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'players',
          filter: `room_id=eq.${this.currentRoom.id}`
        }, () => {
          this.fetchPlayers()
        })
        .subscribe()
        
      return () => {
        supabase.removeChannel(roomSubscription)
        supabase.removeChannel(playersSubscription)
      }
    },

    async startGame() {
      if (!this.currentRoom || this.players.length < 4) return
      this.loading = true
      this.error = null

      // 1. Fetch Random Word Pair
      const { data: wordPairs, error: wordError } = await supabase
        .from('words_library')
        .select('*')
        .eq('language', this.currentRoom.language)
      
      if (wordError || !wordPairs || !wordPairs.length) {
        this.error = `No words found for language: ${this.currentRoom.language}`
        this.loading = false
        return
      }

      const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)]

      // 2. Distribute Roles
      const playerCount = this.players.length
      const playerIds = this.players.map(p => p.id)
      const shuffledIds = [...playerIds].sort(() => Math.random() - 0.5)

      const roles = {}
      
      // 1 Undercover
      const undercoverId = shuffledIds.pop()
      roles[undercoverId] = { role: 'UNDERCOVER', word: randomPair.undercover_word }

      // 1 Mr White if players > 5
      if (playerCount > 5) {
        const mrWhiteId = shuffledIds.pop()
        roles[mrWhiteId] = { role: 'MR_WHITE', word: null }
      }

      // Rest are Civilians
      shuffledIds.forEach(id => {
        roles[id] = { role: 'CIVILIAN', word: randomPair.civilian_word }
      })

      // 3. Update Players in DB (Parallel)
      const shuffledForOrder = [...playerIds].sort(() => Math.random() - 0.5)
      
      try {
        const updatePromises = playerIds.map(playerId => {
          const turnOrder = shuffledForOrder.indexOf(playerId)
          return supabase
            .from('players')
            .update({
              role: roles[playerId].role,
              word: roles[playerId].word,
              is_alive: true,
              turn_order: turnOrder
            })
            .eq('id', playerId)
        })

        await Promise.all(updatePromises)

        // 4. Set Room Status to PLAYING and set first turn
        const firstTurnId = playerIds.find(id => shuffledForOrder.indexOf(id) === 0)
        
        const { error: roomError } = await supabase
          .from('rooms')
          .update({
            status: 'PLAYING',
            current_turn_player_id: firstTurnId,
            current_round: 1
          })
          .eq('id', this.currentRoom.id)

        if (roomError) throw new Error(roomError.message)

      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async nextTurn() {
      if (!this.currentRoom) return
      
      const alivePlayers = this.players
        .filter(p => p.is_alive)
        .sort((a, b) => (a.turn_order || 0) - (b.turn_order || 0))
      
      const currentIndex = alivePlayers.findIndex(p => p.id === this.currentRoom.current_turn_player_id)
      let nextIndex = currentIndex + 1
      
      if (nextIndex >= alivePlayers.length) {
        // End of round -> Go to VOTING
        await supabase
          .from('rooms')
          .update({ status: 'VOTING' })
          .eq('id', this.currentRoom.id)
      } else {
        // Next player
        await supabase
          .from('rooms')
          .update({ current_turn_player_id: alivePlayers[nextIndex].id })
          .eq('id', this.currentRoom.id)
      }
    },

    async votePlayer(targetId) {
      if (!this.currentRoom || !this.myPlayer || !this.myPlayer.is_alive) return
      
      // 1. Record Vote
      const { error: voteError } = await supabase
        .from('votes')
        .insert([{
          room_id: this.currentRoom.id,
          voter_id: this.myPlayer.id,
          target_id: targetId,
          round_number: this.currentRoom.current_round
        }])
      
      if (voteError) {
        this.error = voteError.message
        return
      }

      // 2. Check if all alive players have voted
      const { data: currentVotes } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', this.currentRoom.id)
        .eq('round_number', this.currentRoom.current_round)
      
      const alivePlayers = this.players.filter(p => p.is_alive)
      
      if (currentVotes.length >= alivePlayers.length) {
        await this.calculateElimination(currentVotes)
      }
    },

    async calculateElimination(votes) {
      // Tally votes
      const counts = {}
      votes.forEach(v => {
        counts[v.target_id] = (counts[v.target_id] || 0) + 1
      })

      // Find max vote
      let maxVotes = 0
      let candidateId = null
      let isTie = false

      for (const [playerId, count] of Object.entries(counts)) {
        if (count > maxVotes) {
          maxVotes = count
          candidateId = playerId
          isTie = false
        } else if (count === maxVotes) {
          isTie = true
        }
      }

      if (isTie) {
        // Handle Tie-breaker: No one eliminated, back to playing
        await supabase
          .from('rooms')
          .update({ 
            status: 'PLAYING',
            current_round: this.currentRoom.current_round + 1
          })
          .eq('id', this.currentRoom.id)
      } else {
        // Eliminate candidate
        await supabase
          .from('players')
          .update({ is_alive: false })
          .eq('id', candidateId)
        
        const eliminatedPlayer = this.players.find(p => p.id === candidateId)

        // Special Case: Mr. White eliminated
        if (eliminatedPlayer?.role === 'MR_WHITE') {
          await supabase
            .from('rooms')
            .update({ status: 'MR_WHITE_GUESS' })
            .eq('id', this.currentRoom.id)
          return
        }

        // Check win conditions
        const alivePlayers = this.players.filter(p => p.is_alive && p.id !== candidateId) // Excluding the one just eliminated
        const civilians = alivePlayers.filter(p => p.role === 'CIVILIAN')
        const baddies = alivePlayers.filter(p => p.role === 'UNDERCOVER' || p.role === 'MR_WHITE')

        if (baddies.length === 0) {
          // Civilian Win
          await supabase
            .from('rooms')
            .update({ status: 'FINISHED' })
            .eq('id', this.currentRoom.id)
        } else if (civilians.length <= baddies.length) {
          // Undercover Win
          await supabase
            .from('rooms')
            .update({ status: 'FINISHED' })
            .eq('id', this.currentRoom.id)
        } else {
          // Continue playing
          await supabase
            .from('rooms')
            .update({ 
              status: 'PLAYING',
              current_round: this.currentRoom.current_round + 1
            })
            .eq('id', this.currentRoom.id)
        }
      }
    },

    async guessWord(guess) {
      if (!this.currentRoom || !this.myPlayer) return
      
      const civilianWord = this.players.find(p => p.role === 'CIVILIAN')?.word
      
      if (guess.toLowerCase() === civilianWord?.toLowerCase()) {
        // Mr. White Wins
        await supabase
          .from('rooms')
          .update({ status: 'FINISHED' })
          .eq('id', this.currentRoom.id)
      } else {
        // Mr. White Fails -> Check other win conditions or Civilian Wins
        // Since Mr. White is already eliminated, if he fails to guess,
        // we check if there are other baddies.
        const aliveBaddies = this.players.filter(p => p.is_alive && (p.role === 'UNDERCOVER' || p.role === 'MR_WHITE'))
        
        if (aliveBaddies.length === 0) {
          await supabase
            .from('rooms')
            .update({ status: 'FINISHED' })
            .eq('id', this.currentRoom.id)
        } else {
          await supabase
            .from('rooms')
            .update({ 
              status: 'PLAYING',
              current_round: this.currentRoom.current_round + 1
            })
            .eq('id', this.currentRoom.id)
        }
      }
    },

    async fetchPlayers() {
      if (!this.currentRoom) return
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', this.currentRoom.id)
      
      if (!error) {
        this.players = data
      }
    }
  }
})
