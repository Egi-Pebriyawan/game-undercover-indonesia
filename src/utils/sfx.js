const sounds = {
  notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  start: 'https://assets.mixkit.co/active_storage/sfx/2436/2436-preview.mp3',
  eliminate: 'https://assets.mixkit.co/active_storage/sfx/251/251-preview.mp3',
  victory: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  defeat: 'https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3',
  timer: 'https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3'
}

class SFXManager {
  constructor() {
    this.muted = localStorage.getItem('sfx_muted') === 'true'
    this.audioCache = {}
  }

  play(type) {
    if (this.muted || !sounds[type]) return

    try {
      // Use cached audio or create new
      if (!this.audioCache[type]) {
        this.audioCache[type] = new Audio(sounds[type])
      }
      
      const audio = this.audioCache[type]
      audio.currentTime = 0 // Reset to start
      audio.play().catch(e => console.warn('SFX play blocked:', e))
    } catch (error) {
      console.error('SFX Error:', error)
    }
  }

  toggleMute() {
    this.muted = !this.muted
    localStorage.setItem('sfx_muted', this.muted)
    return this.muted
  }

  isMuted() {
    return this.muted
  }
}

export const sfx = new SFXManager()
