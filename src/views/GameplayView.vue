<!--
  GameplayView.vue
  =================
  Core gameplay screen that handles two distinct phases:
  1. Offline Reveal Phase — players pass the phone around to privately see their word/role
  2. Discussion Phase     — turn-based discussion with optional countdown timer

  Navigation:
  - Entered from LobbyView after host starts the game (status → "PLAYING")
  - Exits to VotingView when host initiates voting  (status → "VOTING")
  - Exits to FinishedView when the game ends         (status → "FINISHED")

  Key features:
  - Circular countdown timer with SVG ring animation
  - Audio: funny timer sound in final 60 seconds, notification when time runs out
  - Role reveal card with flip animation for offline mode
  - Secret word "peek" button (hold-to-show) for online mode
-->

<script setup>
// ─── Vue Composition API imports ─────────────────────────────────────────────
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
// Router for programmatic navigation between game phases
import { useRouter } from "vue-router";
// Pinia store that holds all shared game state (room, players, etc.)
import { useGameStore } from "../stores/gameStore";
// vue-i18n composable for multi-language support (ID / EN)
import { useI18n } from "vue-i18n";
// Centralised sound-effects utility (beeps, notifications)
import { sfx } from "../utils/sfx";

// ─── Instance-level composables ──────────────────────────────────────────────
const router = useRouter();
const gameStore = useGameStore();
const { t } = useI18n(); // `t` function resolves translation keys

// ─── Reactive state ──────────────────────────────────────────────────────────
/**
 * showWord — controls the peek-to-reveal word card in online mode.
 * Only `true` while the user is holding the eye button.
 */
const showWord = ref(false);

/**
 * isStartingVoting — loading flag to prevent double-clicks on
 * the "Start Voting" button while the DB update is in flight.
 */
const isStartingVoting = ref(false);

/**
 * revealSound — one-shot audio played when a player taps "Reveal Role"
 * during the offline reveal phase (card-flip effect).
 */
const revealSound = new Audio("/sounds/reveal-card-amongus.mp3");

// ─── Offline reveal helpers ──────────────────────────────────────────────────
/**
 * revealRole()
 * Plays the reveal sound and flips the card to show the player's role/word.
 * Called when a player presses the "Lihat Peran" button during offline reveal.
 */
const revealRole = () => {
  // Reset playback position in case the sound was played before
  revealSound.currentTime = 0;
  revealSound.play();

  // Set store flag so the template switches from "Reveal" to "Seen" state
  gameStore.isRevealed = true;
};

// ─── Room status watcher ─────────────────────────────────────────────────────
/**
 * Watches the room's status field in real-time (updated via Supabase Realtime).
 * When the host changes the status, all clients navigate automatically:
 * - "VOTING"   → go to VotingView
 * - "FINISHED" → go to FinishedView
 * Also stops the discussion timer on any transition out of "PLAYING".
 */
watch(
  () => gameStore.currentRoom?.status,
  (newStatus) => {
    if (newStatus === "VOTING") {
      stopTimer(); // Stop timer audio & interval before leaving
      router.push(`/room/${gameStore.currentRoom.room_code}/vote`);
    } else if (newStatus === "FINISHED") {
      stopTimer();
      router.push(`/room/${gameStore.currentRoom.room_code}/finish`);
    }
  },
);

// ─── Discussion timer state ──────────────────────────────────────────────────
/**
 * timer — remaining seconds shown inside the circular SVG ring.
 * Starts at `discussionDuration` and counts down every second.
 */
const timer = ref(0);

/**
 * timerInterval — handle returned by setInterval so we can clearInterval later.
 * Kept outside `ref` because it doesn't need reactivity.
 */
let timerInterval = null;

/**
 * timerAudio — ref to the "funny timer" Audio object.
 * Created fresh each time startTimer() is called and cleaned up in stopTimer().
 */
const timerAudio = ref(null);

/**
 * gameplayAudio — ref reserved for optional gameplay background music.
 * Currently commented out but kept for future use.
 */
const gameplayAudio = ref(null);

// ─── Discussion duration (from DB) ──────────────────────────────────────────
/**
 * discussionDuration — computed from the room's `discussion_duration` column.
 * Returns 0 (no timer) if the value hasn't been set yet.
 * The host can change this in LobbyView before starting the game.
 */
const discussionDuration = computed(() => {
  const raw = gameStore.currentRoom?.discussion_duration;
  // Default to 0 (no timer / hidden) if not set yet
  if (raw === undefined || raw === null) return 0;
  return Number(raw);
});

/**
 * Watcher: whenever the host changes the discussion duration mid-game
 * (via Supabase Realtime), restart or stop the timer accordingly.
 */
watch(discussionDuration, (newVal) => {
  if (newVal > 0) {
    startTimer(newVal);
  } else {
    stopTimer();
  }
});

// ─── Timer control functions ─────────────────────────────────────────────────
/**
 * startTimer(duration?)
 * Initializes and starts the countdown timer.
 * @param {number} duration — seconds to count down from (defaults to computed value)
 *
 * Behaviour:
 * 1. Stops any existing timer to prevent overlapping intervals.
 * 2. Sets `timer.value` to the duration.
 * 3. Creates a looping "funny timer" audio that starts playing
 *    when ≤ 60 seconds remain (or immediately if total < 60).
 * 4. Every second, decrements `timer.value`.
 * 5. When timer reaches 0, stops everything and plays a notification beep.
 */
const startTimer = (duration = discussionDuration.value) => {
  // Always clean up previous timer before starting a new one
  stopTimer();

  // Guard: if no valid duration, just reset display to 0
  if (!duration || Number(duration) <= 0) {
    timer.value = 0;
    return;
  }

  timer.value = Number(duration);

  // Prepare the "funny timer" audio (looping background tick-tock)
  try {
    timerAudio.value = new Audio("/sounds/timer-funny.mp3");
    timerAudio.value.loop = true;
  } catch (e) {
    // Gracefully degrade if audio fails to load
    timerAudio.value = null;
  }

  // Run the countdown at 1-second intervals
  timerInterval = setInterval(() => {
    if (timer.value > 0) {
      timer.value--;

      // SFX beeps at specific thresholds (currently disabled to avoid annoyance)
      // if (timer.value === 10 || timer.value === 3) {
      //   sfx.play("timer");
      // }

      // Start funny timer audio when ≤ 60 seconds remain,
      // or immediately if total duration was ≤ 60 seconds
      if (timerAudio.value) {
        if (duration <= 60 || timer.value <= 60) {
          if (timerAudio.value.paused) timerAudio.value.play().catch(() => {});
        }
      }
    } else {
      // Timer reached 0 — stop everything and play notification
      stopTimer();
      sfx.play("notification");
    }
  }, 1000);
};

/**
 * stopTimer()
 * Cleans up the countdown interval and stops/resets the timer audio.
 * Called when:
 * - Timer naturally reaches 0
 * - Host clicks "Reset Timer"
 * - Room status changes (VOTING / FINISHED)
 * - Component is unmounted
 */
const stopTimer = () => {
  // Clear the setInterval handle
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  // Stop and release the timer audio resource
  if (timerAudio.value) {
    try {
      timerAudio.value.pause();
      timerAudio.value.currentTime = 0;
    } catch (e) {
      /* audio may already be garbage-collected */
    }
    timerAudio.value = null;
  }
};

// ─── Supabase Realtime subscription handle ───────────────────────────────────
/**
 * unsubscribe — function returned by `gameStore.subscribeToRoom()`.
 * Called in `onUnmounted` to remove the Realtime channel and prevent leaks.
 */
let unsubscribe = null;

// ─── Lifecycle: onMounted ────────────────────────────────────────────────────
/**
 * When the component mounts:
 * 1. Guard — redirect to home if there's no active room or player session.
 * 2. Subscribe to Supabase Realtime for live room & player updates.
 * 3. Start the discussion timer if we're already past the offline reveal phase.
 *
 * NOTE: `onMounted` must be called at the top-level <script setup> scope.
 * Nesting it inside another async callback would cause it to fail silently.
 */
onMounted(async () => {
  // Guard: if the user navigated directly to this URL without a session, bail out
  if (!gameStore.currentRoom || !gameStore.myPlayer) {
    router.push("/");
    return;
  }

  // Subscribe to real-time DB changes for this room (room status, player list)
  unsubscribe = await gameStore.subscribeToRoom();

  // Background music placeholder (disabled for now)
  // try {
  //   gameplayAudio.value = new Audio("/sounds/reveal-card-amongus.mp3");
  //   gameplayAudio.value.loop = true;
  //   gameplayAudio.value.muted = true;
  //   await gameplayAudio.value.play();
  //   if (!gameStore.isMuted) {
  //     gameplayAudio.value.muted = false;
  //   }
  // } catch (e) {
  //   console.warn("Failed to init gameplay audio", e);
  // }

  // Start discussion timer if we're in online mode or offline reveal is done
  if (gameStore.currentRoom?.game_mode === "online" || gameStore.offlineRevealIndex < 0) {
    startTimer();
  }
});

// ─── Lifecycle: onUnmounted ──────────────────────────────────────────────────
/**
 * Cleanup when leaving GameplayView:
 * - Remove Supabase Realtime subscription
 * - Stop and release the countdown timer
 * - Stop and release gameplay background audio
 */
onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  stopTimer();
  if (gameplayAudio.value) {
    gameplayAudio.value.pause();
    gameplayAudio.value.currentTime = 0;
    gameplayAudio.value = null;
  }
});

// ─── Watcher: Offline reveal → discussion transition ─────────────────────────
/**
 * When `offlineRevealIndex` transitions from ≥ 0 (revealing cards) to -1
 * (all players have seen their word), start the discussion timer.
 */
watch(
  () => gameStore.offlineRevealIndex,
  (newVal) => {
    if (newVal < 0) startTimer();
  },
);

// ─── Watcher: Global mute toggle ────────────────────────────────────────────
/**
 * Responds to the user toggling the mute button in the lobby/gameplay UI.
 * Pauses or resumes the background gameplay audio accordingly.
 */
watch(
  () => gameStore.isMuted,
  (muted) => {
    try {
      if (gameplayAudio.value) {
        if (muted) {
          gameplayAudio.value.pause();
          gameplayAudio.value.currentTime = 0;
        } else {
          gameplayAudio.value.play().catch(() => {});
        }
      }
    } catch (e) {
      /* fail silently — audio may not be initialised */
    }
  },
);

// ─── Computed properties ─────────────────────────────────────────────────────
/**
 * currentTurnPlayer — the player whose turn it is to speak.
 * Matched by `current_turn_player_id` on the room record.
 */
const currentTurnPlayer = computed(() => {
  return gameStore.players.find((p) => p.id === gameStore.currentRoom?.current_turn_player_id);
});

/**
 * isMyTurn — true if the logged-in player is the one currently speaking.
 * Used to highlight the active speaker in the UI (currently unused visually
 * but kept for future enhancements).
 */
const isMyTurn = computed(() => {
  return gameStore.myPlayer?.id === gameStore.currentRoom?.current_turn_player_id;
});

// ─── Host action: start voting ───────────────────────────────────────────────
/**
 * handleStartVoting()
 * Called when the host clicks the "Mulai Voting" button.
 * 1. Sets a loading flag to disable the button.
 * 2. Calls the store action to update the room status to "VOTING" in Supabase.
 * 3. After a small delay (allowing Realtime to propagate), navigates to VotingView.
 *
 * All other connected clients navigate automatically via the status watcher above.
 */
const handleStartVoting = async () => {
  try {
    isStartingVoting.value = true;
    await gameStore.startVoting();
    // Small delay to allow Realtime events to settle before navigating
    setTimeout(() => {
      if (gameStore.currentRoom?.status === "VOTING") {
        router.push(`/room/${gameStore.currentRoom.room_code}/vote`);
      }
    }, 100);
  } catch (err) {
    console.error(err);
  } finally {
    isStartingVoting.value = false;
  }
};

/**
 * isHost — true if the current player is the room host.
 * Only the host can see the "Start Voting" and "Reset Timer" buttons.
 */
const isHost = computed(() => {
  return gameStore.myPlayer?.id === gameStore.currentRoom?.host_id;
});

/**
 * sortedPlayers — alive players sorted by their assigned turn order.
 * This determines the speaking sequence displayed in the discussion phase.
 */
const sortedPlayers = computed(() => {
  return [...gameStore.players].filter((p) => p.is_alive).sort((a, b) => (a.turn_order || 0) - (b.turn_order || 0));
});

/**
 * currentPlayerRevealing — the player who should currently see their card
 * during the offline reveal phase. `null` once all players have been revealed.
 */
const currentPlayerRevealing = computed(() => {
  if (gameStore.offlineRevealIndex < 0) return null;
  return sortedPlayers.value[gameStore.offlineRevealIndex];
});

// ─── Offline reveal: hide card and advance ───────────────────────────────────
/**
 * hideAndNext()
 * Called when a player presses "Sudah Dilihat" (Seen) during offline reveal.
 * Advances the store's reveal index to the next player, or ends the reveal
 * phase if all players have seen their word.
 */
const hideAndNext = async () => {
  await gameStore.nextOfflineReveal();
};

// ─── Role display helpers ────────────────────────────────────────────────────
/**
 * getRoleColorClass(role)
 * Returns Tailwind CSS colour classes for the role badge on the reveal card.
 * - CIVILIAN → green
 * - UNDERCOVER → red (or green if role visibility is "secret")
 * - MR_WHITE → slate/grey
 *
 * When infiltrator_visibility is "secret", UNDERCOVER looks identical to
 * CIVILIAN so the player doesn't know they're the spy.
 */
const getRoleColorClass = (role) => {
  if (gameStore.currentRoom?.infiltrator_visibility === "secret" && role === "UNDERCOVER") {
    // Secret mode: undercover gets the same colour as civilian (green)
    return "text-emerald-600 bg-emerald-50 border-emerald-100";
  }
  switch (role) {
    case "CIVILIAN":
      return "text-emerald-600 bg-emerald-50 border-emerald-100";
    case "UNDERCOVER":
      return "text-rose-600 bg-rose-50 border-rose-100";
    case "MR_WHITE":
      return "text-slate-600 bg-slate-50 border-slate-200";
    default:
      return "text-primary-600 bg-primary-50 border-primary-100";
  }
};

/**
 * displayRoleText(playerRole)
 * Returns the human-readable role label for the reveal card.
 * - Mr. White always sees "Mr. White" (they know they have no word).
 * - If infiltrator_visibility is "secret", CIVILIAN and UNDERCOVER both
 *   see "👀Role disembunyikan" (role hidden) — so nobody knows their alignment.
 * - Otherwise, shows the translated role name.
 */
const displayRoleText = (playerRole) => {
  if (!playerRole) return "";

  // Mr White always sees their role label (they need to know they have no word)
  if (playerRole === "MR_WHITE") {
    return t("roles.mr_white");
  }

  // In "secret" mode, hide the role label for both CIVILIAN and UNDERCOVER
  if (["UNDERCOVER", "CIVILIAN"].includes(playerRole) && gameStore.currentRoom?.infiltrator_visibility === "secret") {
    return "👀Role disembunyikan";
  }

  // Default: show translated role name (e.g., "Warga" / "Penyusup")
  return t(`roles.${playerRole.toLowerCase()}`);
};
</script>

<template>
  <!-- Main container: full-screen centered layout with decorative background blobs -->
  <div class="min-h-screen p-6 flex flex-col items-center justify-center space-y-10 relative overflow-hidden">
    <!-- Decorative gradient blobs for visual depth -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>

    <!--
      ╔═══════════════════════════════════════════════════════════════════════╗
      ║ PHASE 1: Offline Reveal Phase                                       ║
      ║ Shown only in offline mode while cards are still being revealed.    ║
      ║ Each player gets the phone, taps "Reveal", sees their word/role,    ║
      ║ then taps "Seen" to pass it to the next player.                     ║
      ╚═══════════════════════════════════════════════════════════════════════╝
    -->
    <div v-if="gameStore.currentRoom?.game_mode === 'offline' && gameStore.offlineRevealIndex >= 0" class="flex flex-col items-center space-y-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
      <!-- Header: instructs the current player to take the phone -->
      <div class="text-center space-y-2">
        <p class="text-primary-600 font-black text-xs uppercase tracking-[0.3em] opacity-60">{{ t("gameplay.passPhone") }}</p>
        <h2 class="text-5xl font-black text-slate-800 tracking-tight">{{ currentPlayerRevealing?.nickname }}</h2>
      </div>

      <!-- Role reveal card: 3D perspective container -->
      <div class="w-72 h-96 perspective-1000">
        <div class="w-full h-full glass flex flex-col items-center justify-center p-8 text-center transition-all duration-700 bg-white shadow-2xl relative overflow-hidden" :class="gameStore.isRevealed ? 'ring-2 ring-primary-100' : ''">

          <!-- Card FRONT: "Tap to Reveal" state -->
          <template v-if="!gameStore.isRevealed">
            <!-- Bouncing "shush" emoji indicates the card is hidden -->
            <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl mb-8 shadow-inner border border-slate-100 animate-bounce">🤫</div>
            <!-- Reveal button triggers revealRole() -->
            <button @click="revealRole" class="btn-primary w-full py-4 text-lg shadow-xl shadow-primary-500/30">{{ t("gameplay.revealRole") }}</button>
            <!-- "Confidential" label for dramatic effect -->
            <p class="mt-6 text-[10px] text-slate-400 font-black uppercase tracking-widest">{{ t("gameplay.confidential") }}</p>
          </template>

          <!-- Card BACK: Revealed role + word -->
          <template v-else>
            <!-- Subtle gradient overlay for visual polish -->
            <div class="absolute inset-0 opacity-5 pointer-events-none">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-transparent"></div>
            </div>

            <!-- Role badge with colour-coded background -->
            <div class="px-6 py-2 rounded-full border font-black text-[10px] uppercase tracking-[0.3em] mb-6 animate-in slide-in-from-top-4" :class="getRoleColorClass(currentPlayerRevealing?.role)">
              {{ displayRoleText(currentPlayerRevealing?.role) }}
            </div>

            <!-- Decorative divider line -->
            <div class="h-px w-12 bg-slate-100 mb-8"></div>

            <!-- The actual word (or "???" for Mr. White who has no word) -->
            <h3 class="text-5xl font-black text-slate-800 mb-4 animate-in zoom-in duration-500 tracking-tight">
              {{ currentPlayerRevealing?.word || "???" }}
            </h3>

            <!-- Mr. White hint text explaining they must guess the civilian word -->
            <p v-if="currentPlayerRevealing?.role === 'MR_WHITE'" class="text-xs text-slate-400 font-medium italic mb-4">
              {{ t("gameplay.mrWhiteDesc") }}
            </p>

            <!-- "Sudah Dilihat" (Seen) button: hides card and moves to next player -->
            <button @click="hideAndNext" class="mt-10 bg-slate-900 text-white font-black py-4 px-8 rounded-2xl w-full hover:bg-black transition-all shadow-lg active:scale-95">
              {{ t("gameplay.seen") }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!--
      ╔═══════════════════════════════════════════════════════════════════════╗
      ║ PHASE 2: Discussion Phase (Turn List)                               ║
      ║ Shown after all players have revealed their cards (offline) or      ║
      ║ immediately in online mode. Displays the speaking order and an      ║
      ║ optional countdown timer. Only the host can start voting.           ║
      ╚═══════════════════════════════════════════════════════════════════════╝
    -->
    <div v-else class="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <!-- Section header -->
      <div class="text-center space-y-2">
        <p class="text-primary-600 font-black text-xs uppercase tracking-[0.3em]">{{ t("gameplay.discussion") }}</p>
        <h2 class="text-3xl font-black text-slate-800">{{ t("gameplay.speakOrder") }}</h2>
      </div>

      <!--
        Discussion Timer (circular SVG ring)
        Only rendered when a discussion_duration > 0 was set by the host.
        The SVG uses stroke-dasharray/offset to animate a shrinking circle.
      -->
      <div v-if="discussionDuration > 0" class="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in zoom-in duration-700">
        <div class="relative w-32 h-32 flex items-center justify-center">
          <!-- SVG ring: rotated -90° so the arc starts from 12 o'clock -->
          <svg class="w-full h-full transform -rotate-90">
            <!-- Background circle (grey track) -->
            <circle cx="64" cy="64" r="58" stroke="currentColor" stroke-width="8" fill="transparent" class="text-slate-100" />
            <!-- Foreground circle: dashoffset decreases as timer counts down -->
            <circle
              cx="64"
              cy="64"
              r="58"
              stroke="currentColor"
              stroke-width="8"
              fill="transparent"
              class="transition-all duration-1000"
              :class="timer < 10 ? 'text-rose-500' : 'text-primary-500'"
              :stroke-dasharray="364"
              :stroke-dashoffset="364 - (364 * timer) / (discussionDuration || 60)"
            />
          </svg>
          <!-- Numeric countdown overlay in the centre of the ring -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-4xl font-black tabular-nums" :class="timer < 10 ? 'text-rose-600 animate-pulse' : 'text-slate-800'">
              {{ timer }}
            </span>
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-400">{{ t("gameplay.seconds") }}</span>
          </div>
        </div>
        <!-- Reset timer button: only visible to the host -->
        <button v-if="isHost" @click="startTimer" class="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
          {{ t("gameplay.resetTimer") }}
        </button>
      </div>

      <!-- Player turn order list: shows alive players sorted by turn_order -->
      <div class="space-y-3">
        <div
          v-for="(player, index) in sortedPlayers"
          :key="player.id"
          class="glass-panel p-4 flex items-center justify-between group hover:border-primary-300 transition-all duration-300"
          :class="index === 0 ? 'ring-2 ring-primary-500/10 border-primary-200 bg-white/80' : 'bg-white/40'"
        >
          <div class="flex items-center gap-4">
            <!-- Turn number badge -->
            <div class="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center font-black text-primary-900 shadow-sm border border-primary-200">
              {{ index + 1 }}
            </div>
            <div>
              <!-- Player nickname -->
              <p class="font-black text-slate-800">{{ player.nickname }}</p>
              <!-- "Starts" label for the first player in the order -->
              <p v-if="index === 0" class="text-[10px] font-black text-primary-500 uppercase tracking-widest">{{ t("gameplay.starts") }}</p>
            </div>
          </div>
        </div>
      </div>

      <!--
        Host Action Panel: "Start Voting" button
        Only the host (room creator) can transition the game to the voting phase.
      -->
      <div v-if="isHost" class="pt-6 space-y-4">
        <button @click="handleStartVoting" :disabled="isStartingVoting" class="btn-primary w-full py-5 text-lg shadow-xl shadow-primary-500/20 group disabled:opacity-50">
          <span class="flex items-center justify-center gap-3">
            {{ isStartingVoting ? "..." : t("gameplay.startVoting") }}
            <!-- Arrow icon with hover animation -->
            <svg v-if="!isStartingVoting" class="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>
        <!-- Helper text reminding only the host can advance the phase -->
        <p class="text-center mt-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{{ t("gameplay.onlyHost") }}</p>
      </div>

      <!--
        Secret Word Panel (Online mode only)
        Shows a blurred word that only appears while the player holds the eye button.
        Uses both touch and mouse events for mobile + desktop compatibility.
      -->
      <div v-if="gameStore.currentRoom?.game_mode === 'online'" class="pt-10">
        <div class="glass-panel p-6 bg-slate-900 border-slate-800 text-white flex items-center justify-between shadow-2xl">
          <div class="space-y-1">
            <!-- Label -->
            <p class="text-[10px] font-black text-primary-400 uppercase tracking-widest">{{ t("word") }}</p>
            <!-- Word text: blurred by default, clear when showWord is true -->
            <h4 class="text-xl font-black tracking-tight" :class="showWord ? 'blur-0' : 'blur-md select-none transition-all duration-500'">
              {{ gameStore.myPlayer?.word || "???" }}
            </h4>
          </div>
          <!-- Eye button: hold to peek, release to hide -->
          <button
            @touchstart="showWord = true"
            @touchend="showWord = false"
            @mousedown="showWord = true"
            @mouseup="showWord = false"
            @mouseleave="showWord = false"
            class="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors active:scale-90"
          >
            <!-- Eye SVG icon -->
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Scoped styles for this component only -->
<style scoped>
/* Enables CSS 3D perspective for the card-flip reveal animation */
.perspective-1000 {
  perspective: 1000px;
}
</style>
