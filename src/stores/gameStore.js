/**
 * gameStore.js
 * =============
 * Central Pinia store that manages ALL shared game state for the
 * Undercover Indonesia application. Every view component reads from
 * and writes to this store.
 *
 * Responsibilities:
 * - Room lifecycle: create → join → start → vote → finish → reset
 * - Player management: fetch, add (offline), remove, session restore
 * - Real-time synchronisation via Supabase Realtime subscriptions
 * - Role distribution and word assignment at game start
 * - Voting, elimination, and win-condition evaluation
 * - Mr. White's last-chance guess logic
 * - Offline mode: sequential card reveal flow
 * - UI helpers: notifications, mute toggle, elimination reveal overlay
 *
 * Database tables used:
 * - `rooms`          — one row per game room (settings, status, current turn)
 * - `players`        — one row per player (nickname, role, word, alive status)
 * - `votes`          — one row per vote cast (voter → target per round)
 * - `words_library`  — word pairs for random selection
 */

import { defineStore } from "pinia";
import { supabase } from "../services/supabase";

export const useGameStore = defineStore("game", {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE — reactive data properties shared across all components
  // ═══════════════════════════════════════════════════════════════════════════
  state: () => ({
    /** The current room record from the `rooms` table (null when not in a game) */
    currentRoom: null,

    /** Array of player records for the current room */
    players: [],

    /** Global statistics displayed on the home page */
    totalGames: 0,
    totalPlayers: 0,

    /** Loading flag used to show spinners and disable buttons during async ops */
    loading: false,

    /** Last error message from a failed action (watched by views for toast display) */
    error: null,

    /**
     * Notification state for toast messages.
     * `type` can be "error", "warning", or "success" — controls toast colour.
     */
    notification: { show: false, message: "", type: "error" },

    // ─── Offline mode helper state ─────────────────────────────────────────
    /**
     * offlineRevealIndex — tracks which player is currently revealing their card.
     * - ≥ 0 : reveal phase is active, value is the index into sortedPlayers
     * - -1  : reveal phase is complete, discussion/gameplay has started
     */
    offlineRevealIndex: -1,

    /**
     * isRevealed — whether the current offline player's card is face-up.
     * Reset to `false` each time we advance to the next player.
     */
    isRevealed: false,

    // ─── Audio state ───────────────────────────────────────────────────────
    /** Global mute toggle: when true, all audio (music + SFX) should be silent */
    isMuted: false,

    // ─── Elimination reveal overlay state ──────────────────────────────────
    /**
     * isEliminationRevealing — true while the "who was eliminated" reveal
     * animation is playing (5-second suspense delay).
     */
    isEliminationRevealing: false,

    /**
     * revealedEliminatedPlayer — the player object of whoever was just eliminated.
     * Displayed in the reveal overlay. Cleared after closeReveal().
     */
    revealedEliminatedPlayer: null,
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS — computed properties derived from state
  // ═══════════════════════════════════════════════════════════════════════════
  getters: {
    /**
     * myPlayer — returns the current user's player record from the players array.
     * Uses the player ID stored in sessionStorage (set during joinRoom).
     * Returns `null` if no session is active.
     */
    myPlayer: (state) => {
      const myId = sessionStorage.getItem("undercover_player_id");
      return state.players.find((p) => p.id === myId) || null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS — methods that mutate state and interact with Supabase
  // ═══════════════════════════════════════════════════════════════════════════
  actions: {
    // ─────────────────────────────────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * showNotify(msg, type)
     * Displays a temporary toast notification.
     * Auto-hides after 3 seconds.
     *
     * @param {string} msg  — the message to display
     * @param {string} type — "error" | "warning" | "success"
     */
    showNotify(msg, type = "error") {
      this.notification = { show: true, message: msg, type };
      setTimeout(() => {
        this.notification.show = false;
      }, 3000);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ROOM MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * createRoom(language)
     * Creates a new game room in Supabase with a random 6-character code.
     * The room starts in "LOBBY" status.
     *
     * @param {string} language — "ID" (Indonesian) or "EN" (English)
     * @returns {Object|null} — the created room record, or null on failure
     */
    async createRoom(language = "ID") {
      try {
        this.loading = true;
        this.error = null;

        // Generate a random 6-character alphanumeric room code (uppercase)
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Insert the room into Supabase and return the created record
        const { data, error } = await supabase
          .from("rooms")
          .insert([
            {
              room_code: roomCode,
              language,
              status: "LOBBY",
              game_mode: "offline",
              undercover_count: 0,
              voting_method: "real-life",
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Store the room in local state
        this.currentRoom = data;
        return data;
      } catch (err) {
        console.error("Create Room Error:", err);
        this.showNotify("Gagal membuat ruangan. Periksa koneksi Anda.");
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * toggleMute()
     * Flips the global mute state. Views watch `isMuted` to
     * pause/resume their audio elements.
     */
    toggleMute() {
      this.isMuted = !this.isMuted;
    },

    /**
     * resetRoom()
     * Resets the current room to LOBBY state for a new game.
     * - Resets room status, round counter, and turn pointer.
     * - Resets all players: alive, no role, no word, no turn order.
     * - Deletes all vote records for this room.
     * All three DB updates run in parallel for speed.
     */
    async resetRoom() {
      if (!this.currentRoom) return;
      try {
        this.loading = true;

        // Parallel DB updates: reset room, players, and delete votes
        await Promise.all([
          supabase.from("rooms").update({ status: "LOBBY", current_round: 1, current_turn: 0 }).eq("id", this.currentRoom.id),
          supabase.from("players").update({ is_alive: true, role: null, word: null, turn_order: null }).eq("room_id", this.currentRoom.id),
          supabase.from("votes").delete().eq("room_id", this.currentRoom.id),
        ]);

        // Refresh the local player list
        await this.fetchPlayers();
      } catch (err) {
        console.error("Reset Room Error:", err);
        this.showNotify("Gagal mereset ruangan. Coba lagi.");
      } finally {
        this.loading = false;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PLAYER SESSION MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * joinRoom(roomCode, nickname)
     * Joins an existing room by code. Creates a new player record in the DB.
     * If the room has no host yet (first player to join), this player becomes host.
     *
     * Stores session credentials in sessionStorage for page-refresh recovery:
     * - `undercover_session` → random session token
     * - `undercover_player_id` → player UUID
     *
     * @param {string} roomCode — the 6-character room code
     * @param {string} nickname — the player's display name
     * @returns {Object|null} — the created player record, or null on failure
     */
    async joinRoom(roomCode, nickname) {
      try {
        this.loading = true;
        this.error = null;

        // 1. Look up the room by its code (case-insensitive via toUpperCase)
        const { data: room, error: roomError } = await supabase.from("rooms").select("*").eq("room_code", roomCode.toUpperCase()).single();

        if (roomError || !room) {
          throw new Error("Room not found");
        }

        // 2. Create a player record linked to this room
        const { data: player, error: playerError } = await supabase
          .from("players")
          .insert([
            {
              room_id: room.id,
              nickname,
              session_token: Math.random().toString(36).substring(7),
            },
          ])
          .select()
          .single();

        if (playerError) throw playerError;

        // 3. If the room has no host, assign this player as the host
        if (!room.host_id) {
          await supabase.from("rooms").update({ host_id: player.id }).eq("id", room.id);
          room.host_id = player.id; // Update local copy too
        }

        // 4. Store session data locally
        this.currentRoom = room;
        sessionStorage.setItem("undercover_session", player.session_token);
        sessionStorage.setItem("undercover_player_id", player.id);

        // 5. Fetch all players in this room
        await this.fetchPlayers();
        return player;
      } catch (err) {
        console.error("Join Room Error:", err);
        this.showNotify(err.message === "Room not found" ? "Ruangan tidak ditemukan" : "Gagal bergabung ke ruangan");
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * restoreSession()
     * Attempts to recover a player's session after a page refresh.
     * Reads the session token and player ID from sessionStorage,
     * then verifies they still exist in the DB.
     *
     * @returns {Object|null} — the player record if session is valid, else null
     */
    async restoreSession() {
      // Read stored credentials
      const sessionToken = sessionStorage.getItem("undercover_session");
      const playerId = sessionStorage.getItem("undercover_player_id");

      // No stored session → nothing to restore
      if (!sessionToken || !playerId) return null;

      this.loading = true;

      // Verify the session still exists in the DB (player + matching token)
      // Uses a join to also fetch the room data in one query
      const { data: player, error: pError } = await supabase.from("players").select("*, rooms(*)").eq("id", playerId).eq("session_token", sessionToken).single();

      if (pError || !player) {
        // Session is invalid or expired — clear local storage
        sessionStorage.removeItem("undercover_session");
        sessionStorage.removeItem("undercover_player_id");
        this.loading = false;
        return null;
      }

      // Session is valid — restore the room and player state
      this.currentRoom = player.rooms;
      await this.fetchPlayers();
      this.loading = false;
      return player;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // REAL-TIME SUBSCRIPTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * subscribeToRoom()
     * Sets up two Supabase Realtime channels:
     *
     * 1. Room channel — listens for changes to the `rooms` row for this room.
     *    Updates `this.currentRoom` whenever the host changes settings,
     *    starts the game, or transitions between phases.
     *
     * 2. Players channel — listens for INSERT/UPDATE/DELETE on `players`
     *    rows for this room. Triggers a full player list refresh on any change.
     *
     * @returns {Function} — an unsubscribe function to remove both channels
     */
    async subscribeToRoom() {
      if (!this.currentRoom) return;

      // Channel 1: Room status and settings changes
      const roomSubscription = supabase
        .channel(`room:${this.currentRoom.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",       // Listen to all change types (INSERT, UPDATE, DELETE)
            schema: "public",
            table: "rooms",
            filter: `id=eq.${this.currentRoom.id}`, // Only this room
          },
          (payload) => {
            // Replace the entire room object with the updated version
            this.currentRoom = payload.new;
          },
        )
        .subscribe();

      // Channel 2: Player join/leave/update events
      const playersSubscription = supabase
        .channel(`players:${this.currentRoom.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${this.currentRoom.id}`,
          },
          () => {
            // Re-fetch the full player list (simpler than merging deltas)
            this.fetchPlayers();
          },
        )
        .subscribe();

      // Return a cleanup function for use in onUnmounted
      return () => {
        supabase.removeChannel(roomSubscription);
        supabase.removeChannel(playersSubscription);
      };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // GAME START & ROLE DISTRIBUTION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * startGame()
     * Initiates the game from the LOBBY phase. Host-only action.
     *
     * Steps:
     * 1. Select a word pair (custom or random from the library).
     * 2. Shuffle players to determine speaking turn order.
     * 3. Assign roles (CIVILIAN, UNDERCOVER, MR_WHITE) respecting:
     *    - undercover_count and mr_white_count from settings
     *    - spy_position setting (prevents spies from being first speakers)
     * 4. Update all player records in the DB (parallel for speed).
     * 5. Set room status to "PLAYING" and record the first speaker.
     * 6. In offline mode, start the card reveal sequence.
     */
    async startGame() {
      // Guard: need a room and at least 4 players
      if (!this.currentRoom || this.players.length < 4) return;
      this.loading = true;
      this.error = null;

      let randomPair = null;

      // ── Step 1: Select word pair ─────────────────────────────────────────
      if (this.currentRoom.is_custom_words) {
        // Validate that both custom words are provided
        if (!this.currentRoom.custom_word_civilian || !this.currentRoom.custom_word_undercover) {
          this.showNotify("Kata kustom belum diisi lengkap!");
          this.loading = false;
          return;
        }
        // Use the host's custom words
        randomPair = {
          word_civilian: this.currentRoom.custom_word_civilian,
          word_undercover: this.currentRoom.custom_word_undercover,
        };
      } else {
        // Pick a random word pair from the library for the selected language

        // First, get the total count of available word pairs
        const { count, error: countError } = await supabase.from("words_library").select("*", { count: "exact", head: true }).eq("language", this.currentRoom.language);

        if (countError || !count || count === 0) {
          this.error = `No words found for language: ${this.currentRoom.language}`;
          this.loading = false;
          return;
        }

        // Pick a random index and fetch that single word pair
        const randomOffset = Math.floor(Math.random() * count);
        const { data: wordPairs, error: wordError } = await supabase.from("words_library").select("*").eq("language", this.currentRoom.language).range(randomOffset, randomOffset).single();

        if (wordError || !wordPairs) {
          this.error = `Failed to pick a random word pair`;
          this.loading = false;
          return;
        }

        randomPair = wordPairs;
      }

      // ── Step 2: Determine turn order ─────────────────────────────────────
      const playerIds = this.players.map((p) => p.id);
      // Shuffle player IDs to randomise the speaking order
      const shuffledForOrder = [...playerIds].sort(() => Math.random() - 0.5);

      // Map each player ID to their position in the speaking order
      const turnOrders = {};
      shuffledForOrder.forEach((id, index) => {
        turnOrders[id] = index;
      });

      // ── Step 3: Assign roles ─────────────────────────────────────────────
      // Determine which players are eligible for spy roles based on spy_position setting
      let spyCandidates = [...shuffledForOrder];
      const spyPosition = this.currentRoom.spy_position || "anyone";

      // Remove first speaker(s) from spy candidate pool if setting requires it
      if (spyPosition === "not-first" && spyCandidates.length > 1) {
        spyCandidates.splice(0, 1); // Remove 1st speaker
      } else if (spyPosition === "not-first-two" && spyCandidates.length > 2) {
        spyCandidates.splice(0, 2); // Remove 1st and 2nd speakers
      }

      // Shuffle spy candidates and pop from the end for role assignment
      const shuffledSpyIds = [...spyCandidates].sort(() => Math.random() - 0.5);
      const roles = {}; // Map: playerId → { role, word }

      // Assign UNDERCOVER roles (default count: 0)
      const undercoverCount = this.currentRoom.undercover_count ?? 0;
      for (let i = 0; i < undercoverCount; i++) {
        if (shuffledSpyIds.length > 0) {
          const id = shuffledSpyIds.pop();
          roles[id] = { role: "UNDERCOVER", word: randomPair.word_undercover };
        }
      }

      // Assign MR_WHITE roles (they get no word — they must guess)
      const mrWhiteCount = this.currentRoom.mr_white_count || 0;
      for (let i = 0; i < mrWhiteCount; i++) {
        if (shuffledSpyIds.length > 0) {
          const id = shuffledSpyIds.pop();
          roles[id] = { role: "MR_WHITE", word: null };
        }
      }

      // ── Step 4 & 5: Update DB and start the game ─────────────────────────
      try {
        // Update each player's role, word, alive status, and turn order (in parallel)
        const updatePromises = playerIds.map((playerId) => {
          // Default to CIVILIAN if no special role was assigned
          const roleData = roles[playerId] || { role: "CIVILIAN", word: randomPair.word_civilian };
          return supabase
            .from("players")
            .update({
              role: roleData.role,
              word: roleData.word,
              is_alive: true,
              turn_order: turnOrders[playerId],
            })
            .eq("id", playerId);
        });

        await Promise.all(updatePromises);

        // Find the player who speaks first (turn_order === 0)
        const firstTurnId = playerIds.find((id) => shuffledForOrder.indexOf(id) === 0);

        // Set room status to PLAYING — this triggers navigation for all clients
        const { error: roomError } = await supabase
          .from("rooms")
          .update({
            status: "PLAYING",
            current_turn_player_id: firstTurnId,
            current_round: 1,
          })
          .eq("id", this.currentRoom.id);

        if (roomError) throw new Error(roomError.message);

        // In offline mode, start the sequential card reveal flow
        if (this.currentRoom.game_mode === "offline") {
          this.offlineRevealIndex = 0;  // Start with the first player
          this.isRevealed = false;      // Card starts face-down
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ROOM SETTINGS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * updateRoomSettings(settings)
     * Persists one or more room setting changes to Supabase.
     * Updates the local `currentRoom` with the response data.
     *
     * @param {Object} settings — key-value pairs to update (e.g., { undercover_count: 2 })
     */
    async updateRoomSettings(settings) {
      if (!this.currentRoom) return;

      const { data, error } = await supabase.from("rooms").update(settings).eq("id", this.currentRoom.id).select().single();

      if (!error) {
        this.currentRoom = data; // Update local state with the DB response
      } else {
        this.error = error.message;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PLAYER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * addOfflinePlayer(nickname)
     * Adds a new player to the room in offline mode.
     * Generates a fake session token prefixed with "offline-" since
     * all players share one device.
     *
     * @param {string} nickname — the player's display name
     */
    async addOfflinePlayer(nickname) {
      // Guard: only works in offline mode
      if (!this.currentRoom || this.currentRoom.game_mode !== "offline") return;

      const { error } = await supabase.from("players").insert([
        {
          room_id: this.currentRoom.id,
          nickname,
          session_token: "offline-" + Math.random().toString(36).substring(7),
        },
      ]);

      if (error) this.error = error.message;
      // Refresh the player list to include the new player
      await this.fetchPlayers();
    },

    /**
     * removePlayer(playerId)
     * Deletes a player from the room. Host-only action.
     * Used to kick players from the lobby.
     *
     * @param {string} playerId — UUID of the player to remove
     */
    async removePlayer(playerId) {
      if (!this.currentRoom) return;

      const { error } = await supabase.from("players").delete().eq("id", playerId);

      if (error) this.error = error.message;
      // Refresh the player list to reflect the removal
      await this.fetchPlayers();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // OFFLINE REVEAL FLOW
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * setRevealed(val)
     * Sets whether the current offline player's card is face-up.
     * Called by the GameplayView when the reveal button is tapped.
     *
     * @param {boolean} val — true to show the word, false to hide it
     */
    setRevealed(val) {
      this.isRevealed = val;
    },

    /**
     * nextOfflineReveal()
     * Advances to the next player in the offline reveal sequence.
     * If all players have seen their card, ends the reveal phase
     * (sets offlineRevealIndex to -1) so the discussion can begin.
     */
    async nextOfflineReveal() {
      if (this.offlineRevealIndex < this.players.length - 1) {
        // More players to reveal — advance the index
        this.offlineRevealIndex++;
        this.isRevealed = false; // Next player's card starts face-down
      } else {
        // All players have revealed — end the reveal phase
        this.offlineRevealIndex = -1;
        // GameplayView watches this and starts the discussion timer
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ELIMINATION & WIN CONDITIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * eliminatePlayer(playerId)
     * Marks a player as dead (is_alive = false) in the DB,
     * then delegates to processElimination() for reveal animation
     * and win-condition checking.
     *
     * @param {string} playerId — UUID of the player to eliminate
     */
    async eliminatePlayer(playerId) {
      if (!this.currentRoom) return;

      // Find the player in the local array
      const targetPlayer = this.players.find((p) => p.id === playerId);
      if (!targetPlayer) return;

      // Mark player as dead in the database
      const { error: pError } = await supabase.from("players").update({ is_alive: false }).eq("id", playerId);

      if (pError) {
        this.error = pError.message;
        return;
      }

      // Trigger the elimination reveal sequence
      await this.processElimination(playerId);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // VOTING SYSTEM
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * startVoting()
     * Transitions the room from PLAYING to VOTING status.
     * Updates local state first for immediate UI feedback,
     * then persists to DB (which broadcasts via Realtime to all clients).
     */
    async startVoting() {
      if (!this.currentRoom) return;

      // Optimistic local update for instant feedback
      this.currentRoom.status = "VOTING";

      // Persist to DB — triggers Realtime for other clients
      const { error } = await supabase.from("rooms").update({ status: "VOTING" }).eq("id", this.currentRoom.id);

      if (error) {
        this.error = error.message;
        this.showNotify("Failed to start voting: " + error.message);
      }
    },

    /**
     * votePlayer(targetId)
     * Records the current player's vote for a target player.
     * After recording, checks if all alive players have voted.
     * If so, automatically triggers elimination calculation.
     *
     * @param {string} targetId — UUID of the player being voted to eliminate
     */
    async votePlayer(targetId) {
      // Guard: must be in a room, must be a valid alive player
      if (!this.currentRoom || !this.myPlayer || !this.myPlayer.is_alive) return;

      // 1. Insert the vote record into the `votes` table
      const { error: voteError } = await supabase.from("votes").insert([
        {
          room_id: this.currentRoom.id,
          voter_id: this.myPlayer.id,
          target_id: targetId,
          round_number: this.currentRoom.current_round,
        },
      ]);

      if (voteError) {
        this.error = voteError.message;
        return;
      }

      // 2. Check if all alive players have now voted
      const { data: currentVotes } = await supabase.from("votes").select("*").eq("room_id", this.currentRoom.id).eq("round_number", this.currentRoom.current_round);

      const alivePlayers = this.players.filter((p) => p.is_alive);

      // If vote count matches alive player count, tally the results
      if (currentVotes.length >= alivePlayers.length) {
        await this.calculateElimination(currentVotes);
      }
    },

    /**
     * submitOfflineVotes(votesMap)
     * Processes votes submitted in offline/real-life mode.
     * Takes a map of { voter_id: target_id } and converts it
     * to the array format expected by calculateElimination.
     *
     * @param {Object} votesMap — { voter_id: target_id, ... }
     */
    async submitOfflineVotes(votesMap) {
      // Convert object map to array of vote objects
      const votesArray = Object.entries(votesMap).map(([voter_id, target_id]) => ({
        voter_id,
        target_id,
      }));
      await this.calculateElimination(votesArray);
    },

    /**
     * calculateElimination(votes)
     * Tallies votes and determines who (if anyone) gets eliminated.
     *
     * Logic:
     * 1. Count how many votes each target received.
     * 2. Find the player with the most votes.
     * 3. If there's a tie → no one is eliminated, move to next round.
     * 4. If there's a clear winner → eliminate them and process win conditions.
     *
     * @param {Array} votes — array of { voter_id, target_id } objects
     */
    async calculateElimination(votes) {
      // Tally votes: { playerId: voteCount }
      const counts = {};
      votes.forEach((v) => {
        counts[v.target_id] = (counts[v.target_id] || 0) + 1;
      });

      // Find the player with the highest vote count
      let maxVotes = 0;
      let candidateId = null;
      let isTie = false;

      for (const [playerId, count] of Object.entries(counts)) {
        if (count > maxVotes) {
          maxVotes = count;
          candidateId = playerId;
          isTie = false;
        } else if (count === maxVotes) {
          isTie = true; // Two or more players share the highest vote count
        }
      }

      if (isTie) {
        // TIE: No elimination — advance to the next discussion round
        await supabase
          .from("rooms")
          .update({
            status: "PLAYING",
            current_round: this.currentRoom.current_round + 1,
          })
          .eq("id", this.currentRoom.id);
      } else {
        // CLEAR WINNER: Eliminate the most-voted player
        await supabase.from("players").update({ is_alive: false }).eq("id", candidateId);

        // Trigger the reveal animation and win-condition check
        await this.processElimination(candidateId);
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // TURN ORDER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * shuffleTurns()
     * Randomises the speaking order for the next discussion round.
     * Only shuffles alive players. Updates each player's turn_order
     * in the DB sequentially (could be parallelised for performance).
     */
    async shuffleTurns() {
      if (!this.currentRoom) return;

      // Get only alive players and shuffle them
      const alivePlayers = this.players.filter((p) => p.is_alive);
      const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);

      // Update each player's turn_order in the DB
      for (let i = 0; i < shuffled.length; i++) {
        await supabase.from("players").update({ turn_order: i }).eq("id", shuffled[i].id);
      }

      // Reset the current turn pointer to 0 (first speaker)
      await supabase.from("rooms").update({ current_turn: 0 }).eq("id", this.currentRoom.id);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ELIMINATION REVEAL & WIN CONDITION PROCESSING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * processElimination(eliminatedPlayerId)
     * Starts the dramatic elimination reveal sequence.
     * Sets the reveal overlay state and waits 5 seconds for suspense.
     * The actual win-condition logic runs in closeReveal() after the user
     * dismisses the overlay.
     *
     * @param {string} eliminatedPlayerId — UUID of the eliminated player
     */
    async processElimination(eliminatedPlayerId) {
      // Find the eliminated player's record for display
      const eliminatedPlayer = this.players.find((p) => p.id === eliminatedPlayerId);

      // Set overlay state for the VotingView's reveal animation
      this.revealedEliminatedPlayer = eliminatedPlayer;
      this.isEliminationRevealing = true;

      // Wait 5 seconds for dramatic suspense before allowing dismissal
      await new Promise((resolve) => setTimeout(resolve, 5000));
    },

    /**
     * closeReveal()
     * Dismisses the elimination reveal overlay and processes game logic.
     *
     * Three possible outcomes:
     * 1. Mr. White was eliminated → transition to MR_WHITE_GUESS phase
     *    (Mr. White gets one chance to guess the civilian word)
     * 2. All baddies (UNDERCOVER + MR_WHITE) eliminated → CIVILIANS win
     * 3. Civilians ≤ baddies remaining → BADDIES win
     * 4. Otherwise → shuffle turns and continue to the next round
     *
     * IMPORTANT: DB updates happen BEFORE clearing the local reveal state.
     * This ordering prevents a brief flash of the previous view between
     * the overlay dismissal and the Realtime navigation trigger.
     */
    async closeReveal() {
      if (!this.revealedEliminatedPlayer) return;

      const eliminatedPlayer = this.revealedEliminatedPlayer;
      const eliminatedPlayerId = eliminatedPlayer.id;

      // ── Case 1: Mr. White was eliminated — give them a chance to guess ──
      if (eliminatedPlayer.role === "MR_WHITE") {
        // Transition to the guess phase — GuessView will be shown
        await supabase.from("rooms").update({ status: "MR_WHITE_GUESS" }).eq("id", this.currentRoom.id);
        // Clear reveal state AFTER DB update to prevent view flash
        this.isEliminationRevealing = false;
        this.revealedEliminatedPlayer = null;
        return;
      }

      // ── Evaluate win conditions based on remaining alive players ────────
      const alivePlayers = this.players.filter((p) => p.is_alive);
      const civilians = alivePlayers.filter((p) => p.role === "CIVILIAN");
      const baddies = alivePlayers.filter((p) => p.role === "UNDERCOVER" || p.role === "MR_WHITE");

      if (baddies.length === 0) {
        // ── Case 2: All baddies eliminated → Civilian Victory ─────────────
        await supabase
          .from("rooms")
          .update({
            status: "FINISHED",
            winner_role: "CIVILIANS",
          })
          .eq("id", this.currentRoom.id);
        this.isEliminationRevealing = false;
        this.revealedEliminatedPlayer = null;
      } else if (civilians.length <= baddies.length) {
        // ── Case 3: Civilians outnumbered → Baddie Victory ───────────────
        // (when baddies equal or exceed civilians, they've infiltrated enough)
        await supabase
          .from("rooms")
          .update({
            status: "FINISHED",
            winner_role: "BADDIES",
          })
          .eq("id", this.currentRoom.id);
        this.isEliminationRevealing = false;
        this.revealedEliminatedPlayer = null;
      } else {
        // ── Case 4: Game continues → shuffle turns for next round ─────────
        await this.shuffleTurns();
        await supabase
          .from("rooms")
          .update({
            status: "PLAYING",
            current_round: this.currentRoom.current_round + 1,
          })
          .eq("id", this.currentRoom.id);
        this.isEliminationRevealing = false;
        this.revealedEliminatedPlayer = null;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MR. WHITE'S LAST-CHANCE GUESS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * guessWord(guess)
     * Handles Mr. White's attempt to guess the civilian word.
     * Called from GuessView after Mr. White submits their guess.
     *
     * Logic:
     * 1. Fetch latest players to ensure we have the current civilian word.
     * 2. Compare the guess (case-insensitive, trimmed) to the civilian word.
     * 3. If correct → BADDIES win (Mr. White's dramatic comeback).
     * 4. If wrong → check remaining baddies:
     *    a. No baddies left → CIVILIANS win
     *    b. Baddies remain → continue to next discussion round
     *
     * @param {string} guess — Mr. White's guessed word
     */
    async guessWord(guess) {
      if (!this.currentRoom) return;

      // Always fetch latest player data to ensure word accuracy
      await this.fetchPlayers();

      // Find any CIVILIAN to get the civilian word
      const civilianPlayer = this.players.find((p) => p.role === "CIVILIAN");
      const civilianWord = civilianPlayer?.word;

      // Debug logging in development mode
      if (import.meta.env.DEV) {
        console.log("Comparing guess:", guess, "with word:", civilianWord);
      }

      if (guess && civilianWord && guess.toLowerCase().trim() === civilianWord.toLowerCase().trim()) {
        // ── CORRECT GUESS: Mr. White saves the baddies! ──────────────────
        this.showNotify("TEBAKAN BENAR! Mr. White menang!", "success");
        // Brief pause for dramatic effect
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // End game with BADDIES as winners
        await supabase
          .from("rooms")
          .update({
            status: "FINISHED",
            winner_role: "BADDIES",
          })
          .eq("id", this.currentRoom.id);
      } else {
        // ── WRONG GUESS: Mr. White fails ─────────────────────────────────
        this.showNotify("TEBAKAN SALAH!", "error");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Re-fetch players to get accurate alive statuses
        await this.fetchPlayers();

        // Check if any baddies are still alive
        const aliveBaddies = this.players.filter((p) => p.is_alive && (p.role === "UNDERCOVER" || p.role === "MR_WHITE"));

        if (aliveBaddies.length === 0) {
          // No more baddies → Civilians win
          await supabase
            .from("rooms")
            .update({
              status: "FINISHED",
              winner_role: "CIVILIANS",
            })
            .eq("id", this.currentRoom.id);
        } else {
          // Baddies still in play → continue the game with a new round
          await this.shuffleTurns();
          await supabase
            .from("rooms")
            .update({
              status: "PLAYING",
              current_round: (this.currentRoom.current_round || 1) + 1,
            })
            .eq("id", this.currentRoom.id);
        }
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DATA FETCHING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * fetchPlayers()
     * Fetches the full list of players for the current room from Supabase.
     * Updates `this.players` with the response data.
     * Called frequently: on mount, after player changes, during voting, etc.
     */
    async fetchPlayers() {
      if (!this.currentRoom) return;

      const { data, error } = await supabase.from("players").select("*").eq("room_id", this.currentRoom.id);

      if (!error) {
        this.players = data;
      }
    },

    /**
     * fetchGlobalStats()
     * Fetches aggregate statistics for the home page:
     * - Total number of rooms ever created
     * - Total number of players who have joined any room
     *
     * Uses Supabase's `count: "exact"` with `head: true` for
     * efficient counting without fetching actual rows.
     */
    async fetchGlobalStats() {
      try {
        // Count total rooms (using HEAD request — returns only count, no data)
        const { count: roomCount } = await supabase.from("rooms").select("*", { count: "exact", head: true });

        // Count total players
        const { count: playerCount } = await supabase.from("players").select("*", { count: "exact", head: true });

        this.totalGames = roomCount || 0;
        this.totalPlayers = playerCount || 0;
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    },
  },
});
