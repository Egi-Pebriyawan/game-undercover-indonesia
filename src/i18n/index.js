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
      undercover: 'Jumlah Undercover',
      mrWhite: 'Jumlah Mr. White',
      voting: 'Metode Voting',
      anonymous: 'Anonim',
      realLife: 'Langsung (Real-life)',
      spyPosition: 'Posisi Mata-mata',
      spyAnyone: 'Siapa Saja',
      spyNotFirst: 'Bukan pemain pertama',
      spyNotFirstTwo: 'Bukan dua pemain pertama',
      infiltratorVisibility: 'Saling Kenal?',
      visKnown: 'Ya, mereka saling tahu',
      visSecret: 'Tidak, rahasiakan',
      needPlayers: 'Butuh 4+ pemain untuk mulai',
      host: 'Host'
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
      onlyHost: 'Hanya Host yang bisa mulai voting'
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
      desc: 'Bantu kami menjaga server tetap menyala dan bebas iklan dengan mentraktir segelas kopi.',
      button: 'Traktir Kopi',
      thanks: 'Terima kasih atas dukungannya!',
      stats: '{n} Game Telah Dimainkan'
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
      undercover: 'Undercover Count',
      mrWhite: 'Mr. White Count',
      voting: 'Voting Method',
      anonymous: 'Anonymous',
      realLife: 'Real-life',
      spyPosition: 'Spy Position',
      spyAnyone: 'Anyone',
      spyNotFirst: 'Not the first player',
      spyNotFirstTwo: 'Not the first two players',
      infiltratorVisibility: 'Know roles?',
      visKnown: 'Yes, they know',
      visSecret: 'No, keep it secret',
      needPlayers: 'Need 4+ players to start',
      host: 'Host'
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
      onlyHost: 'Only Host can start voting'
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
      desc: 'Help us keep the server alive and ad-free by buying us a coffee.',
      button: 'Buy me a Coffee',
      thanks: 'Thank you for your support!',
      stats: '{n} Games Played'
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
