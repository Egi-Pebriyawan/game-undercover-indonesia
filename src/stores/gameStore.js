import { defineStore } from 'pinia'
import { supabase } from '../services/supabase'

export const useGameStore = defineStore('game', {
  state: () => ({
    currentRoom: null,
    players: [],
    totalGames: 0,
    totalPlayers: 0,
    loading: false,
    error: null,
    notification: { show: false, message: '', type: 'error' },
    // Offline mode helper state
    offlineRevealIndex: -1, 
    isRevealed: false,
    // Elimination reveal state
    isEliminationRevealing: false,
    revealedEliminatedPlayer: null
  }),

  getters: {
    myPlayer: (state) => {
      const myId = sessionStorage.getItem('undercover_player_id')
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
      try {
        this.loading = true
        this.error = null
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

        if (error) throw error

        this.currentRoom = data
        return data
      } catch (err) {
        console.error('Create Room Error:', err)
        this.showNotify('Gagal membuat ruangan. Periksa koneksi Anda.')
        return null
      } finally {
        this.loading = false
      }
    },

    async resetRoom() {
      if (!this.currentRoom) return
      try {
        this.loading = true
        await Promise.all([
          supabase
            .from('rooms')
            .update({ status: 'LOBBY', current_round: 1, current_turn: 0 })
            .eq('id', this.currentRoom.id),
          supabase
            .from('players')
            .update({ is_alive: true, role: null, word: null, turn_order: null })
            .eq('room_id', this.currentRoom.id),
          supabase
            .from('votes')
            .delete()
            .eq('room_id', this.currentRoom.id),
        ])
        await this.fetchPlayers()
      } catch (err) {
        console.error('Reset Room Error:', err)
        this.showNotify('Gagal mereset ruangan. Coba lagi.')
      } finally {
        this.loading = false
      }
    },

    async joinRoom(roomCode, nickname) {
      try {
        this.loading = true
        this.error = null
        
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('room_code', roomCode.toUpperCase())
          .single()

        if (roomError || !room) {
          throw new Error('Room not found')
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

        if (playerError) throw playerError

        // If room has no host, set this player as host
        if (!room.host_id) {
          await supabase
            .from('rooms')
            .update({ host_id: player.id })
            .eq('id', room.id)
          
          room.host_id = player.id
        }

        this.currentRoom = room
        sessionStorage.setItem('undercover_session', player.session_token)
        sessionStorage.setItem('undercover_player_id', player.id)
        
        await this.fetchPlayers()
        return player
      } catch (err) {
        console.error('Join Room Error:', err)
        this.showNotify(err.message === 'Room not found' ? 'Ruangan tidak ditemukan' : 'Gagal bergabung ke ruangan')
        return null
      } finally {
        this.loading = false
      }
    },

    async restoreSession() {
      const sessionToken = sessionStorage.getItem('undercover_session')
      const playerId = sessionStorage.getItem('undercover_player_id')
      
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
        sessionStorage.removeItem('undercover_session')
        sessionStorage.removeItem('undercover_player_id')
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

      let randomPair = null

      if (this.currentRoom.is_custom_words) {
        if (!this.currentRoom.custom_word_civilian || !this.currentRoom.custom_word_undercover) {
          this.showNotify('Kata kustom belum diisi lengkap!')
          this.loading = false
          return
        }
        randomPair = {
          word_civilian: this.currentRoom.custom_word_civilian,
          word_undercover: this.currentRoom.custom_word_undercover
        }
      } else {
        // 1. Get total word count for the language first to pick a random offset
        const { count, error: countError } = await supabase
          .from('words_library')
          .select('*', { count: 'exact', head: true })
          .eq('language', this.currentRoom.language)

        if (countError || !count || count === 0) {
          this.error = `No words found for language: ${this.currentRoom.language}`
          this.loading = false
          return
        }

        // Pick a random offset and fetch just one pair
        const randomOffset = Math.floor(Math.random() * count)
        const { data: wordPairs, error: wordError } = await supabase
          .from('words_library')
          .select('*')
          .eq('language', this.currentRoom.language)
          .range(randomOffset, randomOffset)
          .single()
        
        if (wordError || !wordPairs) {
          this.error = `Failed to pick a random word pair`
          this.loading = false
          return
        }

        randomPair = wordPairs
      }

      // 2. Distribute Roles
      const playerIds = this.players.map(p => p.id)
      const shuffledForOrder = [...playerIds].sort(() => Math.random() - 0.5)
      
      // Determine turn order first
      const turnOrders = {}
      shuffledForOrder.forEach((id, index) => {
        turnOrders[id] = index
      })

      // Select candidates for special roles based on spy_position setting
      let spyCandidates = [...shuffledForOrder]
      const spyPosition = this.currentRoom.spy_position || 'anyone'
      
      if (spyPosition === 'not-first' && spyCandidates.length > 1) {
        spyCandidates.splice(0, 1)
      } else if (spyPosition === 'not-first-two' && spyCandidates.length > 2) {
        spyCandidates.splice(0, 2)
      }

      // Shuffle candidates for role assignment
      const shuffledSpyIds = [...spyCandidates].sort(() => Math.random() - 0.5)
      const roles = {}
      
      // Undercover Count from settings
      const undercoverCount = this.currentRoom.undercover_count ?? 1
      for (let i = 0; i < undercoverCount; i++) {
        if (shuffledSpyIds.length > 0) {
          const id = shuffledSpyIds.pop()
          roles[id] = { role: 'UNDERCOVER', word: randomPair.word_undercover }
        }
      }

      // Mr White Count from settings
      const mrWhiteCount = this.currentRoom.mr_white_count || 0
      for (let i = 0; i < mrWhiteCount; i++) {
        if (shuffledSpyIds.length > 0) {
          const id = shuffledSpyIds.pop()
          roles[id] = { role: 'MR_WHITE', word: null }
        }
      }

      // 3. Update Players in DB (Parallel)
      try {
        const updatePromises = playerIds.map(playerId => {
          const roleData = roles[playerId] || { role: 'CIVILIAN', word: randomPair.word_civilian }
          return supabase
            .from('players')
            .update({
              role: roleData.role,
              word: roleData.word,
              is_alive: true,
              turn_order: turnOrders[playerId]
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

        if (this.currentRoom.game_mode === 'offline') {
          this.offlineRevealIndex = 0
          this.isRevealed = false
        }

      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async updateRoomSettings(settings) {
      if (!this.currentRoom) return
      
      const { data, error } = await supabase
        .from('rooms')
        .update(settings)
        .eq('id', this.currentRoom.id)
        .select()
        .single()

      if (!error) {
        this.currentRoom = data
      } else {
        this.error = error.message
      }
    },

    async addOfflinePlayer(nickname) {
      if (!this.currentRoom || this.currentRoom.game_mode !== 'offline') return
      
      const { error } = await supabase
        .from('players')
        .insert([{
          room_id: this.currentRoom.id,
          nickname,
          session_token: 'offline-' + Math.random().toString(36).substring(7)
        }])

      if (error) this.error = error.message
      await this.fetchPlayers()
    },

    async removePlayer(playerId) {
      if (!this.currentRoom) return
      // Only allow host to remove players
      
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (error) this.error = error.message
      await this.fetchPlayers()
    },

    setRevealed(val) {
      this.isRevealed = val
    },

    async nextOfflineReveal() {
      if (this.offlineRevealIndex < this.players.length - 1) {
        this.offlineRevealIndex++
        this.isRevealed = false
      } else {
        // Everyone revealed -> actually start playing (or first round)
        this.offlineRevealIndex = -1
        // We don't need to update status because it's already PLAYING, 
        // but we might want a 'REVEALING' status? 
        // For now, GameplayView will check offlineRevealIndex.
      }
    },

    async eliminatePlayer(playerId) {
      if (!this.currentRoom) return
      
      const targetPlayer = this.players.find(p => p.id === playerId)
      if (!targetPlayer) return

      // Mark player as dead
      const { error: pError } = await supabase
        .from('players')
        .update({ is_alive: false })
        .eq('id', playerId)

      if (pError) {
        this.error = pError.message
        return
      }

      await this.processElimination(playerId)
    },

    async startVoting() {
      if (!this.currentRoom) return
      
      // Update locally first for immediate feedback
      this.currentRoom.status = 'VOTING'
      
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'VOTING' })
        .eq('id', this.currentRoom.id)
        
      if (error) {
        this.error = error.message
        this.showNotify('Failed to start voting: ' + error.message)
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

    async submitOfflineVotes(votesMap) {
      const votesArray = Object.entries(votesMap).map(([voter_id, target_id]) => ({
        voter_id,
        target_id
      }))
      await this.calculateElimination(votesArray)
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
        // Eliminate candidate in DB
        await supabase
          .from('players')
          .update({ is_alive: false })
          .eq('id', candidateId)
        
        await this.processElimination(candidateId)
      }
    },

    async shuffleTurns() {
      if (!this.currentRoom) return
      const alivePlayers = this.players.filter(p => p.is_alive)
      const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5)
      
      for (let i = 0; i < shuffled.length; i++) {
        await supabase
          .from('players')
          .update({ turn_order: i })
          .eq('id', shuffled[i].id)
      }
      
      // Reset current turn to 0
      await supabase
        .from('rooms')
        .update({ current_turn: 0 })
        .eq('id', this.currentRoom.id)
    },

    async processElimination(eliminatedPlayerId) {
      const eliminatedPlayer = this.players.find(p => p.id === eliminatedPlayerId)
      
      // Start reveal sequence
      this.revealedEliminatedPlayer = eliminatedPlayer
      this.isEliminationRevealing = true
      
      // Just wait for suspense (5s), display stays until closeReveal is called
      await new Promise(resolve => setTimeout(resolve, 5000))
    },

    async closeReveal() {
      if (!this.revealedEliminatedPlayer) return
      
      const eliminatedPlayer = this.revealedEliminatedPlayer
      const eliminatedPlayerId = eliminatedPlayer.id
      
      // 1. Special Case: Mr. White eliminated
      if (eliminatedPlayer.role === 'MR_WHITE') {
        this.isEliminationRevealing = false
        this.revealedEliminatedPlayer = null
        await supabase
          .from('rooms')
          .update({ status: 'MR_WHITE_GUESS' })
          .eq('id', this.currentRoom.id)
        return
      }

      // 2. Check win conditions
      const alivePlayers = this.players.filter(p => p.is_alive)
      const civilians = alivePlayers.filter(p => p.role === 'CIVILIAN')
      const baddies = alivePlayers.filter(p => p.role === 'UNDERCOVER' || p.role === 'MR_WHITE')

      if (baddies.length === 0) {
        // Civilian Win
        this.isEliminationRevealing = false
        this.revealedEliminatedPlayer = null
        await supabase
          .from('rooms')
          .update({ 
            status: 'FINISHED',
            winner_role: 'CIVILIANS'
          })
          .eq('id', this.currentRoom.id)
      } else if (civilians.length <= baddies.length) {
        // Undercover Win
        this.isEliminationRevealing = false
        this.revealedEliminatedPlayer = null
        await supabase
          .from('rooms')
          .update({ 
            status: 'FINISHED',
            winner_role: 'BADDIES'
          })
          .eq('id', this.currentRoom.id)
      } else {
        // Continue playing: Shuffle turns for next round
        await this.shuffleTurns()
        this.isEliminationRevealing = false
        this.revealedEliminatedPlayer = null
        await supabase
          .from('rooms')
          .update({ 
            status: 'PLAYING',
            current_round: this.currentRoom.current_round + 1
          })
          .eq('id', this.currentRoom.id)
      }
    },

    async guessWord(guess) {
      if (!this.currentRoom) return
      
      // 1. ALWAYS fetch latest players first to ensure we have the secret words
      await this.fetchPlayers()
      
      const civilianPlayer = this.players.find(p => p.role === 'CIVILIAN')
      const civilianWord = civilianPlayer?.word
      
      if (import.meta.env.DEV) {
        console.log('Comparing guess:', guess, 'with word:', civilianWord)
      }
      
      if (guess && civilianWord && guess.toLowerCase().trim() === civilianWord.toLowerCase().trim()) {
        // Mr. White Wins
        this.showNotify('TEBAKAN BENAR! Mr. White menang!', 'success')
        await new Promise(resolve => setTimeout(resolve, 2000))
        await supabase
          .from('rooms')
          .update({ 
            status: 'FINISHED',
            winner_role: 'BADDIES'
          })
          .eq('id', this.currentRoom.id)
      } else {
        // Mr. White Fails
        this.showNotify('TEBAKAN SALAH!', 'error')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Refresh players to get accurate alive status
        await this.fetchPlayers()
        
        const aliveBaddies = this.players.filter(p => p.is_alive && (p.role === 'UNDERCOVER' || p.role === 'MR_WHITE'))
        
        if (aliveBaddies.length === 0) {
          // No more baddies left -> Civilians win
          await supabase
            .from('rooms')
            .update({ 
              status: 'FINISHED',
              winner_role: 'CIVILIANS'
            })
            .eq('id', this.currentRoom.id)
        } else {
          // Spies still remaining -> Continue to next round
          await this.shuffleTurns()
          await supabase
            .from('rooms')
            .update({ 
              status: 'PLAYING',
              current_round: (this.currentRoom.current_round || 1) + 1
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
    },

    async fetchGlobalStats() {
      try {
        // Fetch total rooms
        const { count: roomCount } = await supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
        
        // Fetch total players
        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
        
        this.totalGames = roomCount || 0
        this.totalPlayers = playerCount || 0
      } catch (err) {
        console.error('Error fetching stats:', err)
      }
    }
  }
})
