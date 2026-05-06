import { createI18n } from 'vue-i18n'

const messages = {
  ID: {
    welcome: 'Selamat Datang di Undercover',
    createRoom: 'Buat Room',
    joinRoom: 'Masuk Room',
    nickname: 'Nama Panggilan',
    nicknamePlaceholder: 'Masukkan nama panggilan...',
    roomCode: 'Kode Room',
    roomCodePlaceholder: 'Ketik kode room...',
    subtitle: 'Game Peran Rahasia',
    start: 'Mulai Game',
    waiting: 'Menunggu pemain lain...',
    lobby: 'Lobi',
    players: 'Pemain',
    role: 'Peran',
    word: 'Kata Rahasia',
    alive: 'Hidup',
    eliminated: 'Tereliminasi',
    vote: 'Pilih',
    doneTalking: 'Selesai Bicara',
    playAgain: 'Main Lagi',
    backToLobby: 'Kembali ke Lobi',
    backToHome: 'Kembali ke Awal',
    winner: {
      civilians: 'Warga Menang!',
      baddies: 'Pengkhianat Menang!',
      mrWhite: 'Mr. White Menang!'
    },
    roles: {
      civilian: 'Civilian (Warga)',
      undercover: 'Undercover',
      mrWhite: 'Mr. White'
    },
    voting: {
      title: 'WAKTUNYA VOTING!',
      desc: 'Siapa pengkhianat di antara kita?',
      realLifeTitle: 'VOTING LANGSUNG',
      realLifeDesc: 'Tunjuk orangnya secara langsung di dunia nyata!',
      hostPanel: 'Panel Host: Catat Eliminasi',
      recording: 'Host sedang mencatat hasil...',
      passPhone: 'Berikan HP ke',
      yourTurn: 'Giliran Anda untuk voting!',
      recorded: 'Pilihan dicatat! Menunggu yang lain...',
      cannotVote: 'Anda tereliminasi dan tidak bisa voting.',
      confirmTitle: 'Eliminasi {name}?',
      confirmDesc: 'Yakin dia adalah mata-matanya? Aksi ini tidak bisa dibatalkan.',
      cancel: 'Batal',
      eliminate: 'ELIMINASI'
    },
    elimination: {
      investigating: 'MENYELIDIKI PERAN',
      playerEliminated: 'PEMAIN TERELIMINASI',
      wrongPick: 'OH NO! SALAH PILIH!',
      wrongDesc: 'Kalian mengeliminasi warga tak bersalah...',
      realIdentity: 'IDENTITAS ASLI',
      civilianLeft: 'Warga berkurang! Hati-hati, pengkhianat semakin kuat.',
      mrWhiteFound: 'KERJA BAGUS! Dia adalah Mr. White!',
      mrWhiteChance: 'Tapi tunggu... dia punya satu kesempatan menebak kata warga!',
      undercoverFound: 'KERJA BAGUS! Satu Undercover berhasil dilenyapkan.',
      continue: 'LANJUTKAN DISKUSI'
    },
    settings: {
      title: 'Pengaturan Game',
      gameMode: 'Mode Game',
      online: 'Online (Banyak HP)',
      offline: 'Offline (Satu HP)',
      customWords: 'Kata Kustom',
      civilianWord: 'Kata Sipil',
      undercoverWord: 'Kata Undercover',
      customPlaceholder: 'Ketik kata...',
      undercover: 'Jumlah Undercover',
      mrWhite: 'Jumlah Mr. White',
      voting: 'Metode Voting',
      anonymous: 'Anonim',
      anonymousDesc: 'Gilirkan HP ke setiap pemain',
      realLife: 'Real-life (Dunia Nyata)',
      realLifeDesc: 'Paling cepat (Host tentukan hasil)',
      spyPosition: 'Posisi Pengkhianat',
      spyAnyone: 'Bebas',
      spyNotFirst: 'Bukan pemain pertama',
      spyNotFirstTwo: 'Bukan dua pemain pertama',
      infiltratorVisibility: 'Pengkhianat saling kenal?',
      visKnown: 'Ya, mereka kenal',
      visSecret: 'Tidak, tetap rahasia',
      needPlayers: 'Butuh 4+ pemain untuk mulai',
      host: 'Host',
      addOffline: 'Tambah'
    },
    gameplay: {
      yourWord: 'KATA ANDA',
      yourRole: 'PERAN ANDA',
      desc: 'Berikan satu kata petunjuk tanpa menyebutkan kata rahasia Anda!',
      nextPlayer: 'Pemain Selanjutnya',
      votingTime: 'Waktu Voting!',
      eliminateDesc: 'Siapa yang menurut Anda pengkhianat?',
      guessPrompt: 'Tebak kata Warga!',
      passPhone: 'Berikan HP ke',
      revealRole: 'Buka Peran',
      confidential: 'Informasi Rahasia',
      mrWhiteDesc: 'Anda adalah kartu kosong. Menyamarlah!',
      seen: 'SAYA SUDAH LIHAT (SEMBUNYIKAN)',
      discussion: 'Babak Diskusi',
      speakOrder: 'Bicara Sesuai Urutan',
      starts: 'Memulai giliran',
      startVoting: 'MULAI VOTING',
      onlyHost: 'Hanya Host yang bisa mulai voting',
      seconds: 'detik',
      resetTimer: 'Reset Timer'
    },
    rules: {
      title: 'Cara Bermain',
      howTo: 'Aturan Main',
      civilian: {
        title: 'Civilian (Warga)',
        desc: 'Anda mendapatkan kata yang sama dengan warga lainnya. Cari siapa pengkhianatnya!'
      },
      undercover: {
        title: 'Undercover',
        desc: 'Anda mendapatkan kata yang mirip dengan warga. Menyamarlah agar tidak terdeteksi!'
      },
      mrWhite: {
        title: 'Mr. White',
        desc: 'Anda tidak mendapat kata apapun. Simak petunjuk orang lain dan tebak kata warga!'
      },
      step1: 'Setiap pemain memberikan satu kata petunjuk tentang kata rahasianya.',
      step2: 'Diskusikan siapa yang kata petunjuknya paling mencurigakan.',
      step3: 'Voting untuk mengeliminasi pemain yang dianggap sebagai pengkhianat.'
    },
    support: {
      title: 'Dukung Pengembang',
      desc: 'Game ini dibuat agar keceriaan keluarga tidak harus mahal. Jika momen tadi membuat kalian tertawa, bantu kami tetap gratis selamanya. ☕',
      button: 'Dukung dengan Kopi',
      local: 'Dukungan Lokal (Saweria)',
      international: 'Dukungan Internasional (Ko-fi)',
      thanks: 'Kalian luar biasa! Terima kasih atas dukungannya.',
      stats: 'Telah menemani {n} keluarga tertawa bersama dan menghubungkan {m} sahabat.'
    }
  },
  EN: {
    welcome: 'Welcome to Undercover',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Enter your name...',
    roomCode: 'Room Code',
    roomCodePlaceholder: 'Enter room code...',
    subtitle: 'The Secret Role Game',
    start: 'Start Game',
    waiting: 'Waiting for players...',
    lobby: 'Lobby',
    players: 'Players',
    role: 'Role',
    word: 'Secret Word',
    alive: 'Alive',
    eliminated: 'Eliminated',
    vote: 'Vote',
    doneTalking: 'Done Talking',
    playAgain: 'Play Again',
    backToLobby: 'Back to Lobby',
    backToHome: 'Back to Home',
    winner: {
      civilians: 'Civilians Win!',
      baddies: 'Baddies Win!',
      mrWhite: 'Mr. White Wins!'
    },
    roles: {
      civilian: 'Civilian',
      undercover: 'Undercover',
      mrWhite: 'Mr. White'
    },
    voting: {
      title: 'TIME TO VOTE!',
      desc: 'Who is the traitor among us?',
      realLifeTitle: 'REAL-LIFE VOTE',
      realLifeDesc: 'Vote by pointing at someone in real life!',
      hostPanel: 'Host Panel: Record Elimination',
      recording: 'Host is recording results...',
      passPhone: 'Pass Phone to',
      yourTurn: "It's your turn to vote!",
      recorded: 'Vote recorded! Waiting for others...',
      cannotVote: 'You are eliminated and cannot vote.',
      confirmTitle: 'Eliminate {name}?',
      confirmDesc: 'Are you sure this is the spy? This action cannot be undone.',
      cancel: 'Cancel',
      eliminate: 'ELIMINATE'
    },
    elimination: {
      investigating: 'INVESTIGATING ROLE',
      playerEliminated: 'PLAYER ELIMINATED',
      wrongPick: 'OH NO! WRONG PICK!',
      wrongDesc: 'You eliminated an innocent civilian...',
      realIdentity: 'REAL IDENTITY',
      civilianLeft: 'Civilian count decreased! Be careful.',
      mrWhiteFound: 'GREAT JOB! He is Mr. White!',
      mrWhiteChance: 'But wait... he has one chance to guess the word!',
      undercoverFound: 'GREAT JOB! One Undercover eliminated.',
      continue: 'CONTINUE DISCUSSION'
    },
    settings: {
      title: 'Game Settings',
      gameMode: 'Game Mode',
      online: 'Online (Many Devices)',
      offline: 'Offline (One Device)',
      customWords: 'Custom Words',
      civilianWord: 'Civilian Word',
      undercoverWord: 'Undercover Word',
      customPlaceholder: 'Type word...',
      undercover: 'Undercover Count',
      mrWhite: 'Mr. White Count',
      voting: 'Voting Method',
      anonymous: 'Anonymous',
      anonymousDesc: 'Pass the phone around',
      realLife: 'Real-life',
      realLifeDesc: 'Fastest (Host decides result)',
      spyPosition: 'Spy Position',
      spyAnyone: 'Anyone',
      spyNotFirst: 'Not the first player',
      spyNotFirstTwo: 'Not the first two players',
      infiltratorVisibility: 'Know roles?',
      visKnown: 'Yes, they know',
      visSecret: 'No, keep it secret',
      needPlayers: 'Need 4+ players to start',
      host: 'Host',
      addOffline: 'Add'
    },
    gameplay: {
      yourWord: 'YOUR WORD',
      yourRole: 'YOUR ROLE',
      desc: 'Give one hint word without saying your secret word!',
      nextPlayer: 'Next Player',
      votingTime: 'Voting Time!',
      eliminateDesc: 'Who do you think is the traitor?',
      guessPrompt: 'Guess the civilian word!',
      passPhone: 'Pass the Phone to',
      revealRole: 'Reveal Role',
      confidential: 'Confidential Information',
      mrWhiteDesc: 'You are the blank card. Blend in!',
      seen: "I'VE SEEN IT (HIDE)",
      discussion: 'Discussion Round',
      speakOrder: 'Speak in Order',
      starts: 'Starts the round',
      startVoting: 'START VOTING',
      onlyHost: 'Only Host can start voting',
      seconds: 'seconds',
      resetTimer: 'Reset Timer'
    },
    rules: {
      title: 'How to Play',
      howTo: 'Game Rules',
      civilian: {
        title: 'Civilian',
        desc: 'You have the same word as other civilians. Find the traitors!'
      },
      undercover: {
        title: 'Undercover',
        desc: 'You have a similar word to civilians. Blend in to avoid detection!'
      },
      mrWhite: {
        title: 'Mr. White',
        desc: 'You have no word. Listen to others and guess the civilian word!'
      },
      step1: 'Each player provides one hint word about their secret word.',
      step2: 'Discuss who has the most suspicious hint word.',
      step3: 'Vote to eliminate the player suspected of being a traitor.'
    },
    support: {
      title: 'Support Developer',
      desc: 'This game was made so that family joy should not be expensive. If that moment made you laugh, help us stay free forever. ☕',
      button: 'Support with Coffee',
      thanks: 'You guys are awesome! Thank you for your support.',
      stats: 'Accompanied {n} families in laughter and connected {m} friends',
      local: 'Local Support (Saweria)',
      international: 'International Support (Ko-fi)',
    }
  }
}

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'ID',
  fallbackLocale: 'EN',
  messages
})

export default i18n
