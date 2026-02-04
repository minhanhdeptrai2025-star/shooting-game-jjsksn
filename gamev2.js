// ============================================
// GAME CONFIGURATION & STATE
// ============================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

let gameState = {
  running: false,
  paused: false,
  wave: 1,
  gold: 100,
  kills: 0,
  hp: 100,
  maxHp: 100,
  adminLevel: 0,
  hasAdminAccess: false,
  invincible: false,
  godMode: false,
  noclip: false,
  selectedAvatar: 'square',
  selectedClass: 'soldier',
  ownedAvatars: ['square'],
  ownedWeapons: ['pistol'],
  userId: null,
  roundInWave: 1,
  waveWon: false,

  player: {
    x: 400,
    y: 300,
    speed: 3,
    angle: 0,
    currentWeapon: 'pistol',
    vehicle: null,
    vehicleHP: 0,
    size: 25,
    lastDamageTime: 0
  },
  allies: [
    { x: 0, y: 0, type: 'medic', hp: 100, maxHp: 100, lastHeal: 0, lastShot: 0 },
    { x: 0, y: 0, type: 'gunner', hp: 150, maxHp: 150, lastHeal: 0, lastShot: 0 }
  ],
  maxAllies: 5,
  enemies: [],
  bullets: [],
  particles: [],
  chests: [],
  bombs: { smoke: 3, fire: 3, gravity: 1, nuke: 0 },
  domains: {
    active: null,
    timer: 0,
    jackpotCarryover: 0
  },
  keys: {},
  mouse: { x: 0, y: 0, down: false }
};

// ============================================
// AVATARS & CLASSES
// ============================================
const AVATARS = {
  square: { symbol: '▪', color: '#00ff00' },
  triangle: { symbol: '▲', color: '#ff0000' },
  circle: { symbol: '●', color: '#0088ff' },
  diamond: { symbol: '◆', color: '#ffff00' },
  star: { symbol: '★', color: '#ff00ff' },
  cube: { symbol: '▣', color: '#00ffff' },
  hexagon: { symbol: '⬡', color: '#ff8800' },
  pentagon: { symbol: '⬠', color: '#ff0088' },
  oval: { symbol: '⬯', color: '#00ff88' },
  crescent: { symbol: '☽', color: '#ff00ff' },
  heart: { symbol: '♥', color: '#ff1493' },
  crown: { symbol: '♔', color: '#ffdd00' }
};

const CLASSES = {
  soldier: { hpBonus: 50, damageBonus: 1.2, speedBonus: 1, name: 'Chiến Binh' },
  sniper: { hpBonus: 0, damageBonus: 1, speedBonus: 1, pierceBonus: 5, rangeBonus: 1.5, name: 'Xạ Thủ' },
  tank: { hpBonus: 200, damageBonus: 1, speedBonus: 0.8, name: 'Đấu Sĩ' },
  assassin: { hpBonus: -30, damageBonus: 1.5, speedBonus: 2, critBonus: 0.3, name: 'Sát Thủ' }
};

// ============================================
// WEAPONS DATABASE (20 Weapons)
// ============================================
const WEAPONS = {
  // Group A: Ballistic
  'pistol': {
    name: 'Pistol',
    damage: 10,
    fireRate: 400,
    ammo: Infinity,
    speed: 8,
    spread: 0.05,
    pierce: 1,
    category: 'ballistic'
  },
  'dual-beretta': {
    name: 'Dual Berettas',
    damage: 8,
    fireRate: 200,
    ammo: 200,
    speed: 10,
    spread: 0.1,
    pierce: 1,
    bulletsPerShot: 2,
    category: 'ballistic'
  },
  'revolver': {
    name: 'Revolver',
    damage: 50,
    fireRate: 1000,
    ammo: 36,
    speed: 12,
    spread: 0,
    pierce: 2,
    category: 'ballistic'
  },
  'uzi': {
    name: 'Uzi',
    damage: 6,
    fireRate: 100,
    ammo: 500,
    speed: 8,
    spread: 0.15,
    pierce: 1,
    category: 'ballistic'
  },
  'ak47': {
    name: 'AK-47',
    damage: 25,
    fireRate: 150,
    ammo: 300,
    speed: 11,
    spread: 0.08,
    pierce: 2,
    category: 'ballistic'
  },
  
  // Group B: Heavy Duty
  'shotgun': {
    name: 'Shotgun',
    damage: 15,
    fireRate: 600,
    ammo: 50,
    speed: 8,
    spread: 0.3,
    pierce: 1,
    bulletsPerShot: 8,
    category: 'heavy'
  },
  'auto-shotgun': {
    name: 'Auto-Shotgun',
    damage: 12,
    fireRate: 200,
    ammo: 80,
    speed: 8,
    spread: 0.25,
    pierce: 1,
    bulletsPerShot: 6,
    category: 'heavy'
  },
  'minigun': {
    name: 'Minigun',
    damage: 8,
    fireRate: 50,
    ammo: 1000,
    speed: 12,
    spread: 0.12,
    pierce: 1,
    slowPlayer: 0.5,
    category: 'heavy'
  },
  'sniper': {
    name: 'Sniper',
    damage: 100,
    fireRate: 1500,
    ammo: 30,
    speed: 20,
    spread: 0,
    pierce: 10,
    category: 'heavy'
  },
  'anti-material': {
    name: 'Anti-Material Rifle',
    damage: 200,
    fireRate: 2000,
    ammo: 15,
    speed: 25,
    spread: 0,
    pierce: 999,
    category: 'heavy'
  },
  
  // Group C: Explosive
  'grenade-launcher': {
    name: 'Grenade Launcher',
    damage: 80,
    fireRate: 800,
    ammo: 30,
    speed: 7,
    spread: 0.05,
    pierce: 1,
    explosive: 100,
    category: 'explosive'
  },
  'rpg': {
    name: 'RPG-7',
    damage: 150,
    fireRate: 1500,
    ammo: 10,
    speed: 9,
    spread: 0,
    pierce: 1,
    explosive: 150,
    homing: true,
    category: 'explosive'
  },
  'flamethrower': {
    name: 'Flamethrower',
    damage: 5,
    fireRate: 50,
    ammo: 500,
    speed: 5,
    spread: 0.2,
    pierce: 999,
    burn: 2,
    range: 200,
    category: 'explosive'
  },
  'toxic-spitter': {
    name: 'Toxic Spitter',
    damage: 3,
    fireRate: 100,
    ammo: 300,
    speed: 6,
    spread: 0.15,
    pierce: 999,
    poison: 1,
    armorBreak: 0.5,
    category: 'explosive'
  },
  'cluster-launcher': {
    name: 'Cluster Launcher',
    damage: 60,
    fireRate: 1000,
    ammo: 20,
    speed: 8,
    spread: 0,
    pierce: 1,
    cluster: 5,
    category: 'explosive'
  },
  
  // Group D: Sci-Fi
  'laser-rifle': {
    name: 'Laser Rifle',
    damage: 2,
    fireRate: 30,
    ammo: 999,
    speed: 30,
    spread: 0,
    pierce: 999,
    accumulate: 1.5,
    category: 'scifi'
  },
  'plasma-gun': {
    name: 'Plasma Gun',
    damage: 40,
    fireRate: 400,
    ammo: 100,
    speed: 10,
    spread: 0.05,
    pierce: 3,
    emp: true,
    category: 'scifi'
  },
  'tesla-cannon': {
    name: 'Tesla Cannon',
    damage: 20,
    fireRate: 500,
    ammo: 50,
    speed: 15,
    spread: 0,
    pierce: 1,
    chain: 5,
    category: 'scifi'
  },
  'gravity-gun': {
    name: 'Gravity Gun',
    damage: 30,
    fireRate: 300,
    ammo: 80,
    speed: 8,
    spread: 0,
    pierce: 1,
    pull: 200,
    push: 300,
    category: 'scifi'
  },
  'black-hole-gun': {
    name: 'Black Hole Gun',
    damage: 999,
    fireRate: 3000,
    ammo: 3,
    speed: 5,
    spread: 0,
    pierce: 1,
    blackhole: 300,
    category: 'scifi'
  }
};

// ============================================
// DOMAIN EXPANSIONS (10 Domains)
// ============================================
const DOMAINS = {
  1: {
    name: 'Vô Hạn Trắng (Infinite White)',
    duration: 10000,
    effect: (state) => {
      // Freeze all enemies and deal absolute damage
      state.enemies.forEach(e => {
        e.frozen = true;
        e.hp -= 1000;
      });
      showDomainEffect(1);
    },
    color: '#ffffff'
  },
  2: {
    name: 'Bão Lưỡi Cưa (Blade Storm)',
    duration: 8000,
    effect: (state) => {
      // Spawn laser slashes
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          createLaserSlash(state);
        }, i * 160);
      }
      showDomainEffect(2);
    },
    color: '#ff0000'
  },
  3: {
    name: 'Vực Thẳm Bóng Đêm (Shadow Abyss)',
    duration: 15000,
    effect: (state) => {
      // Summon shadow allies
      for (let i = 0; i < 5; i++) {
        spawnShadowAlly(state);
      }
    },
    color: '#1a001a'
  },
  4: {
    name: 'Độc Đắc Tử Vong (Jackpot Death)',
    duration: 40000,
    effect: (state) => {
      state.invincible = true;
      playEDM();
      showDomainEffect(4);
      // Track kills during domain for carryover
      state.domains.jackpotKillStart = state.enemies.length;
    },
    onEnd: (state) => {
      state.invincible = false;
      const killed = state.domains.jackpotKillStart - state.enemies.length;
      if (killed > 0) {
        state.domains.jackpotCarryover += state.domains.timer / 1000;
        console.log(`Jackpot carryover: +${state.domains.timer / 1000}s`);
      }
    },
    color: '#ffff00'
  },
  5: {
    name: 'Ký Sinh Biến Dạng (Parasite Transform)',
    duration: 12000,
    effect: (state) => {
      state.enemies.forEach(e => {
        if (Math.random() < 0.3) {
          e.ally = true;
          e.color = '#00ff00';
        }
      });
    },
    color: '#00ff00'
  },
  6: {
    name: 'Cây Trọng Lực (Gravity Tree)',
    duration: 10000,
    effect: (state) => {
      state.gravityPoint = { x: canvas.width / 2, y: canvas.height / 2, strength: 5 };
    },
    onEnd: (state) => {
      state.gravityPoint = null;
    },
    color: '#8800ff'
  },
  7: {
    name: 'Đại Dương Tử Thần (Death Ocean)',
    duration: 15000,
    effect: (state) => {
      state.zeroGravity = true;
      for (let i = 0; i < 20; i++) {
        spawnDeathFish(state);
      }
    },
    onEnd: (state) => {
      state.zeroGravity = false;
    },
    color: '#0088ff'
  },
  8: {
    name: 'Núi Lửa Phun Trào (Volcano Eruption)',
    duration: 12000,
    effect: (state) => {
      // Spawn meteors periodically
      const interval = setInterval(() => {
        if (state.domains.active !== 8) {
          clearInterval(interval);
          return;
        }
        spawnMeteor(state);
      }, 500);
    },
    color: '#ff4400'
  },
  9: {
    name: 'Tòa Án (Court of Justice)',
    duration: 20000,
    effect: (state) => {
      state.domainImmune = true;
      state.enemyNoCast = true;
    },
    onEnd: (state) => {
      state.domainImmune = false;
      state.enemyNoCast = false;
    },
    // Can still be hit by domains 1, 2, 4, 5
    color: '#ffffff'
  },
  10: {
    name: 'Vườn Hoa Cực Lạc (Paradise Garden)',
    duration: 15000,
    effect: (state) => {
      state.enemies.forEach(e => {
        e.stunned = true;
      });
      state.healOnKill = 10;
    },
    onEnd: (state) => {
      state.healOnKill = 0;
    },
    color: '#ff88ff'
  }
};

// ============================================
// ENEMY TYPES (3 New Types Added)
// ============================================
const ENEMIES = {
  basic: { hp: 50, speed: 1, damage: 5, reward: 5 },
  fast: { hp: 30, speed: 2, damage: 3, reward: 8 },
  tank: { hp: 150, speed: 0.5, damage: 10, reward: 15 },
  brute: { hp: 200, speed: 1.5, damage: 15, reward: 20 },
  specter: { hp: 80, speed: 2.5, damage: 8, reward: 25 },
  boss: { hp: 300, speed: 0.8, damage: 20, reward: 50 }
};

// ============================================
// DATA PERSISTENCE (LocalStorage + Cookies)
// ============================================
function generateUserId() {
  return `UID-${Math.random().toString(36).slice(2, 10).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

function updateUserIdDisplay() {
  const uidMenu = document.getElementById('userUid');
  const uidHud = document.getElementById('uidText');
  if (uidMenu) uidMenu.textContent = gameState.userId || '-';
  if (uidHud) uidHud.textContent = gameState.userId || '-';
}

function saveGameData() {
  const data = {
    gold: gameState.gold,
    kills: gameState.kills,
    hasAdminAccess: gameState.hasAdminAccess,
    adminLevel: gameState.adminLevel,
    ownedAvatars: gameState.ownedAvatars,
    ownedWeapons: gameState.ownedWeapons,
    selectedAvatar: gameState.selectedAvatar,
    selectedClass: gameState.selectedClass,
    maxHp: gameState.maxHp,
    userId: gameState.userId,
    timestamp: Date.now()
  };
  
  localStorage.setItem('shootingGameData', JSON.stringify(data));
  document.cookie = `shootingGameAdmin=${gameState.hasAdminAccess}; max-age=31536000; path=/`;
  document.cookie = `shootingGameGold=${gameState.gold}; max-age=31536000; path=/`;
}

function loadGameData() {
  const saved = localStorage.getItem('shootingGameData');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      gameState.gold = data.gold || 100;
      gameState.kills = data.kills || 0;
      gameState.hasAdminAccess = data.hasAdminAccess || false;
      gameState.adminLevel = data.adminLevel || 0;
      gameState.ownedAvatars = data.ownedAvatars || ['square'];
      gameState.ownedWeapons = data.ownedWeapons || ['pistol'];
      gameState.selectedAvatar = data.selectedAvatar || 'square';
      gameState.selectedClass = data.selectedClass || 'soldier';
      gameState.maxHp = data.maxHp || 100;
      gameState.userId = data.userId || gameState.userId;
    } catch (e) {
      console.log('Error loading game data:', e);
    }
  }
  if (!gameState.userId) {
    gameState.userId = generateUserId();
    saveGameData();
  }
  updateUserIdDisplay();
}

function updateAdminButtons() {
  const unlockBtn = document.getElementById('adminUnlockBtn');
  const adminBtn = document.getElementById('adminBtn');
  const adminShopBtn = document.getElementById('buyAdminAccess');
  
  if (gameState.hasAdminAccess) {
    if (unlockBtn) unlockBtn.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'block';
    if (adminShopBtn) {
      adminShopBtn.textContent = 'ADMIN ACCESS - OWNED';
      adminShopBtn.disabled = true;
    }
  } else if (gameState.gold >= 10000) {
    if (unlockBtn) unlockBtn.style.display = 'block';
    if (adminBtn) adminBtn.style.display = 'none';
    if (adminShopBtn) {
      adminShopBtn.textContent = 'ADMIN ACCESS - 10000¢';
      adminShopBtn.disabled = false;
    }
  } else {
    if (unlockBtn) unlockBtn.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
    if (adminShopBtn) {
      adminShopBtn.textContent = 'ADMIN ACCESS - 10000¢';
      adminShopBtn.disabled = false;
    }
  }
}

// ============================================
// VEHICLE SYSTEM
// ============================================
const VEHICLES = {
  skateboard: { speed: 8, hp: 0, price: 500 },
  motorcycle: { speed: 10, hp: 200, price: 2000 },
  'mech-suit': { speed: 3, hp: 1000, price: 10000, weaponBonus: 2 },
  tank: { speed: 2, hp: 2000, weaponBonus: 3 },
  helicopter: { speed: 12, hp: 500, flying: true }
};

// ============================================
// INITIALIZATION
// ============================================
if (canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

// ============================================
// INPUT HANDLERS
// ============================================
document.addEventListener('keydown', (e) => {
  gameState.keys[e.key.toLowerCase()] = true;
  
  // Toggle weapon wheel (Q)
  if (e.key.toLowerCase() === 'q') {
    const wheel = document.getElementById('weaponWheel');
    wheel.style.display = wheel.style.display === 'none' ? 'block' : 'none';
  }
  
  // Toggle admin console (~)
  if (e.key === '`' || e.key === '~') {
    const console = document.getElementById('adminConsole');
    console.style.display = console.style.display === 'none' ? 'block' : 'none';
  }
  
  // Domain hotkeys (1-0)
  const num = parseInt(e.key);
  if (num >= 1 && num <= 9) {
    activateDomain(num);
  } else if (e.key === '0') {
    activateDomain(10);
  }
});

document.addEventListener('keyup', (e) => {
  gameState.keys[e.key.toLowerCase()] = false;
});

document.addEventListener('mousemove', (e) => {
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    gameState.mouse.x = e.clientX - rect.left;
    gameState.mouse.y = e.clientY - rect.top;
  }
});

document.addEventListener('mousedown', () => {
  gameState.mouse.down = true;
});

document.addEventListener('mouseup', () => {
  gameState.mouse.down = false;
});

// ============================================
// UI SETUP
// ============================================
// Avatar selection in shop
document.querySelectorAll('.avatar-shop-item').forEach(opt => {
  opt.addEventListener('click', (e) => {
    const avatar = e.target.dataset.avatar;
    const price = parseInt(e.target.dataset.price) || 0;
    const btn = e.target.closest('button');
    
    // Check if already owned
    if (gameState.ownedAvatars.includes(avatar)) {
      gameState.selectedAvatar = avatar;
      document.querySelectorAll('.avatar-shop-item').forEach(o => o.style.borderColor = '#fff');
      btn.style.borderColor = '#00ff00';
      btn.style.borderWidth = '5px';
      document.getElementById('currentAvatarShop').textContent = avatar.charAt(0).toUpperCase() + avatar.slice(1);
      return;
    }
    
    // Purchase avatar
    if (gameState.gold >= price) {
      gameState.gold -= price;
      gameState.ownedAvatars.push(avatar);
      gameState.selectedAvatar = avatar;
      document.querySelectorAll('.avatar-shop-item').forEach(o => o.style.borderColor = '#fff');
      btn.style.borderColor = '#00ff00';
      btn.style.borderWidth = '5px';
      document.getElementById('currentAvatarShop').textContent = avatar.charAt(0).toUpperCase() + avatar.slice(1);
      updateMenuCoins();
      updateAdminButtons();
      saveGameData();
      alert(`Purchased: ${avatar.toUpperCase()} Avatar!`);
    } else {
      alert(`Need ${price} coins! You have: ${gameState.gold}`);
    }
  });
});

function updateMenuCoins() {
  const menuCoins = document.getElementById('menuCoins');
  if (menuCoins) menuCoins.textContent = gameState.gold;
  
  const shopGold = document.getElementById('shopGold');
  if (shopGold) shopGold.textContent = gameState.gold;
}

// Shop tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tab = e.target.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelector(`.tab-content[data-tab="${tab}"]`)?.classList.add('active');
  });
});

// Ally purchase
document.querySelectorAll('[data-ally]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const allyType = e.target.dataset.ally;
    const price = parseInt(e.target.dataset.price) || 200;
    
    if (gameState.allies.length >= gameState.maxAllies) {
      alert(`Maximum allies reached (${gameState.maxAllies})!`);
      return;
    }
    
    if (gameState.gold >= price) {
      gameState.gold -= price;
      const newAlly = {
        x: gameState.player.x,
        y: gameState.player.y,
        type: allyType,
        hp: allyType === 'tank' ? 300 : 100,
        maxHp: allyType === 'tank' ? 300 : 100,
        lastHeal: 0,
        lastShot: 0
      };
      gameState.allies.push(newAlly);
      updateHUD();
      saveGameData();
      alert(`Hired ${allyType.toUpperCase()}! (${gameState.allies.length}/${gameState.maxAllies})`);
    } else {
      alert(`Need ${price} coins! You have: ${gameState.gold}`);
    }
  });
});

// Pause menu
document.getElementById('pauseBtn')?.addEventListener('click', togglePause);
document.getElementById('resumeBtn')?.addEventListener('click', togglePause);
document.getElementById('quitBtn')?.addEventListener('click', () => {
  location.reload();
});
document.getElementById('shopPauseBtn')?.addEventListener('click', () => {
  document.getElementById('pauseMenu').style.display = 'none';
  document.getElementById('shop').style.display = 'block';
});

document.getElementById('startBtn')?.addEventListener('click', startGame);
document.getElementById('shopBtn')?.addEventListener('click', () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('shop').style.display = 'block';
});
document.getElementById('settingsBtn')?.addEventListener('click', () => {
  alert('Settings:\n\n🔊 Sound: ON\n⚙️ Difficulty: NORMAL\n\nMore options coming soon!');
});
document.getElementById('miniGameBtn')?.addEventListener('click', () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('miniGame').style.display = 'block';
  startMiniGame();
});
document.getElementById('adminUnlockBtn')?.addEventListener('click', () => {
  if (gameState.gold >= 10000) {
    gameState.gold -= 10000;
    gameState.hasAdminAccess = true;
    gameState.adminLevel = 3;
    document.getElementById('menuCoins').textContent = gameState.gold;
    updateAdminButtons();
    saveGameData();
    alert('ADMIN UNLOCKED!\\nYou now have full access to all features!');
  }
});
document.getElementById('adminBtn')?.addEventListener('click', () => {
  if (gameState.hasAdminAccess) {
    alert('ADMIN PANEL\\n\\nYou have access to:\\n- setgold [amount]\\n- setwave [number]\\n- setinvincible [0/1]\\n- setlevel [3]\\n\\nPress ~ in-game to open console');
  }
});
document.getElementById('exitBtn')?.addEventListener('click', () => {
  alert('Thanks for playing shooting-game-jjsksn!');
  window.close();
});
document.getElementById('closeShop')?.addEventListener('click', () => {
  document.getElementById('shop').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
});
document.getElementById('miniGameClose')?.addEventListener('click', () => {
  // Add coins from mini-game to total
  if (miniGameState.score > 0) {
    const coinsEarned = Math.floor(miniGameState.score / 10);
    gameState.gold += coinsEarned;
    document.getElementById('menuCoins').textContent = gameState.gold;
    updateAdminButtons();
    saveGameData();
    alert(`Mini Game Won!\nEarned: ${coinsEarned} coins!\nTotal: ${gameState.gold} coins`);
  }
  document.getElementById('miniGame').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
  stopMiniGame();
});

document.getElementById('adminUnlockBtn')?.addEventListener('click', () => {
  if (gameState.gold >= 10000) {
    gameState.gold -= 10000;
    gameState.hasAdminAccess = true;
    gameState.adminLevel = 3;
    document.getElementById('menuCoins').textContent = gameState.gold;
    updateAdminButtons();
    saveGameData();
    alert('ADMIN UNLOCKED!\nYou now have access to all features!');
  }
});

document.getElementById('adminBtn')?.addEventListener('click', () => {
  if (gameState.hasAdminAccess) {
    alert('ADMIN PANEL\n\nCommands:\nsetgold [amount] - Set coins\nsetwave [number] - Set wave\nsetinvincible [0/1] - Toggle godmode\nsetlevel [3] - Admin level\n\nPress ~ in-game to open console');
  }
});

document.getElementById('buyAdminAccess')?.addEventListener('click', () => {
  if (gameState.hasAdminAccess) {
    alert('ADMIN already unlocked!');
    return;
  }
  if (gameState.gold >= 10000) {
    gameState.gold -= 10000;
    gameState.hasAdminAccess = true;
    gameState.adminLevel = 3;
    document.getElementById('menuCoins').textContent = gameState.gold;
    updateHUD();
    updateAdminButtons();
    saveGameData();
    alert('ADMIN UNLOCKED!\nYou now have full access to all features!');
  } else {
    alert('Need 10000 coins to unlock ADMIN!');
  }
});

// Weapon selection
document.querySelectorAll('[data-weapon]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const weapon = e.target.dataset.weapon;
    const price = parseInt(e.target.dataset.price) || 0;
    
    // If in weapon wheel, just select
    if (e.target.closest('#weaponWheel')) {
      if (gameState.ownedWeapons.includes(weapon)) {
        gameState.player.currentWeapon = weapon;
        document.getElementById('weaponWheel').style.display = 'none';
        updateHUD();
      } else {
        alert('You must purchase this weapon first!');
      }
      return;
    }
    
    // If in shop, purchase
    if (e.target.closest('#shop')) {
      if (gameState.ownedWeapons.includes(weapon)) {
        alert('Already owned!');
        return;
      }
      if (gameState.gold >= price) {
        gameState.gold -= price;
        gameState.ownedWeapons.push(weapon);
        gameState.player.currentWeapon = weapon;
        document.getElementById('menuCoins').textContent = gameState.gold;
        updateHUD();
        updateAdminButtons();
        saveGameData();
        alert(`Purchased: ${WEAPONS[weapon].name}!`);
      } else {
        alert(`Need ${price} coins! You have: ${gameState.gold}`);
      }
    }
  });
});

// Domain activation
document.querySelectorAll('.domain-slot').forEach(slot => {
  slot.addEventListener('click', (e) => {
    const domain = parseInt(e.target.dataset.domain);
    activateDomain(domain);
  });
});

// Bomb usage
document.querySelectorAll('.bomb-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const bombType = e.target.dataset.bomb;
    useBomb(bombType);
  });
});

// Admin console
document.getElementById('executeCmd')?.addEventListener('click', executeAdminCommand);
document.getElementById('consoleInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') executeAdminCommand();
});

// ============================================
// GAME LOOP
// ============================================
function togglePause() {
  gameState.paused = !gameState.paused;
  document.getElementById('pauseMenu').style.display = gameState.paused ? 'block' : 'none';
  if (!gameState.paused && gameState.running) {
    gameLoop();
  }
}

function applyClassBonus() {
  const cls = CLASSES[gameState.selectedClass];
  gameState.maxHp = 100 + (cls.hpBonus || 0);
  gameState.hp = Math.min(gameState.hp, gameState.maxHp);
}

function startGame() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  gameState.running = true;
  gameState.paused = false;
  gameState.roundInWave = 1;
  gameState.player.x = canvas.width / 2;
  gameState.player.y = canvas.height / 2;
  
  applyClassBonus();
  spawnWave();
  gameLoop();
}

let lastShot = 0;
let lastFrame = Date.now();
function gameLoop() {
  if (!gameState.running || gameState.paused) return;
  
  // Limit to ~30 FPS for slower gameplay
  const now = Date.now();
  const delta = now - lastFrame;
  if (delta < 33) {
    requestAnimationFrame(gameLoop);
    return;
  }
  lastFrame = now;
  
  // Clear canvas
  drawDesertBackground();
  
  // Update player
  updatePlayer();
  updateAlliesFollowing();
  
  // Update allies
  updateAllies();
  
  // Update enemies
  updateEnemies();
  
  // Update bullets
  updateBullets();
  
  // Update particles
  updateParticles();
  
  // Update chests
  updateChests();
  
  // Update domain timer
  if (gameState.domains.active) {
    gameState.domains.timer -= delta;
    if (gameState.domains.timer <= 0) {
      endDomain();
    }
  }
  
  // Shooting
  const weapon = WEAPONS[gameState.player.currentWeapon];
  if (gameState.mouse.down && Date.now() - lastShot > weapon.fireRate) {
    shoot(weapon);
    lastShot = Date.now();
  }
  
  // Draw everything
  drawEverything();
  
  // Update HUD
  updateHUD();
  
  // Wave/round progression
  if (gameState.enemies.length === 0 && gameState.wave > 0) {
    if (!gameState.waveWon) {
      gameState.waveWon = true;
      setTimeout(() => {
        gameState.waveWon = false;
        if (gameState.roundInWave < 2) {
          gameState.roundInWave += 1;
          spawnWave(7);
        } else {
          gameState.roundInWave = 1;
          nextWave();
        }
      }, 1200);
    }
    if (gameState.waveWon) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.font = 'bold 46px Aptos Display';
      ctx.textAlign = 'center';
      ctx.fillText(`ROUND CLEAR (${gameState.roundInWave}/2)`, canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'left';
    }
  }
  
  requestAnimationFrame(gameLoop);
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

function drawPlayerAvatar() {
  const avatar = AVATARS[gameState.selectedAvatar];
  ctx.fillStyle = avatar.color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  
  const size = gameState.player.size;
  switch(gameState.selectedAvatar) {
    case 'square':
      ctx.fillRect(-size/2, -size/2, size, size);
      ctx.strokeRect(-size/2, -size/2, size, size);
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -size/2);
      ctx.lineTo(size/2, size/2);
      ctx.lineTo(-size/2, size/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, size/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(0, -size/2);
      ctx.lineTo(size/2, 0);
      ctx.lineTo(0, size/2);
      ctx.lineTo(-size/2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'star':
      drawStar(0, 0, 5, size/2, size/4);
      ctx.fill();
      ctx.stroke();
      break;
    case 'cube':
      ctx.fillRect(-size/2, -size/2, size, size);
      ctx.strokeRect(-size/2, -size/2, size, size);
      ctx.strokeRect(-size/3, -size/3, size/3, size/3);
      break;
    case 'hexagon':
      drawPolygon(0, 0, size/2, 6);
      ctx.fill();
      ctx.stroke();
      break;
    case 'pentagon':
      drawPolygon(0, 0, size/2, 5);
      ctx.fill();
      ctx.stroke();
      break;
    case 'oval':
      ctx.beginPath();
      ctx.ellipse(0, 0, size/2, size/3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'crescent':
      ctx.beginPath();
      ctx.arc(0, 0, size/2, Math.PI/4, Math.PI * 1.75);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'heart':
      drawHeart(0, 0, size/2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'crown':
      drawCrown(0, 0, size/2);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

function drawPolygon(x, y, radius, sides) {
  const angle = (Math.PI * 2) / sides;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const px = x + radius * Math.cos(angle * i - Math.PI / 2);
    const py = y + radius * Math.sin(angle * i - Math.PI / 2);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHeart(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size/2);
  ctx.quadraticCurveTo(x - size/2, y, x - size/2, y - size/4);
  ctx.quadraticCurveTo(x - size/2, y - size/2, x, y - size/3);
  ctx.quadraticCurveTo(x + size/2, y - size/2, x + size/2, y - size/4);
  ctx.quadraticCurveTo(x + size/2, y, x, y + size/2);
  ctx.closePath();
}

function drawCrown(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y + size/2);
  ctx.lineTo(x - size/2, y - size/2);
  ctx.lineTo(x, y);
  ctx.lineTo(x + size/2, y - size/2);
  ctx.lineTo(x + size, y + size/2);
  ctx.closePath();
  // Crown base
  ctx.moveTo(x - size, y + size/2);
  ctx.lineTo(x + size, y + size/2);
}

function drawDesertBackground() {
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(0.5, '#f4a460');
  gradient.addColorStop(1, '#daa520');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Sun
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
  ctx.fill();
  
  // Sand dunes (simple waves)
  ctx.fillStyle = '#f4a460';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.7);
  for (let x = 0; x < canvas.width; x += 50) {
    ctx.lineTo(x, canvas.height * 0.7 + Math.sin(x * 0.02) * 20);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.fill();
  
  // Cacti
  const now = Date.now() / 10000;
  for (let i = 0; i < 5; i++) {
    const x = (i * 200 + now * 10) % canvas.width;
    const y = canvas.height * 0.7 + Math.sin(x * 0.02) * 20;
    drawCactus(x, y);
  }
}

function drawCactus(x, y) {
  ctx.fillStyle = '#2d5016';
  ctx.fillRect(x - 5, y - 30, 10, 30);
  ctx.fillRect(x - 15, y - 20, 10, 15);
  ctx.fillRect(x + 5, y - 25, 10, 15);
}

function updateAlliesFollowing() {
  // Allies follow player
  gameState.allies.forEach((ally, i) => {
    const targetX = gameState.player.x + (i - 1) * 40;
    const targetY = gameState.player.y + 30;
    
    const dx = targetX - ally.x;
    const dy = targetY - ally.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const speed = 1.5;
      ally.x += (dx / dist) * speed;
      ally.y += (dy / dist) * speed;
    }
  });
}

function updatePlayer() {
  const speed = gameState.player.vehicle ? 
    VEHICLES[gameState.player.vehicle].speed : 
    (gameState.player.speed * (WEAPONS[gameState.player.currentWeapon].slowPlayer || 1));
  
  if (gameState.keys.w || gameState.keys.arrowup) gameState.player.y -= speed;
  if (gameState.keys.s || gameState.keys.arrowdown) gameState.player.y += speed;
  if (gameState.keys.a || gameState.keys.arrowleft) gameState.player.x -= speed;
  if (gameState.keys.d || gameState.keys.arrowright) gameState.player.x += speed;
  
  // Clamp to bounds (unless noclip)
  if (!gameState.noclip) {
    gameState.player.x = Math.max(20, Math.min(canvas.width - 20, gameState.player.x));
    gameState.player.y = Math.max(20, Math.min(canvas.height - 20, gameState.player.y));
  }
  
  // Calculate angle to mouse
  gameState.player.angle = Math.atan2(
    gameState.mouse.y - gameState.player.y,
    gameState.mouse.x - gameState.player.x
  );
}

function updateAllies() {
  const now = Date.now();
  
  gameState.allies.forEach((ally, i) => {
    // Position allies near player
    const offsetX = i === 0 ? -50 : 50;
    const offsetY = i === 0 ? 30 : 30;
    ally.x = gameState.player.x + offsetX;
    ally.y = gameState.player.y + offsetY;
    
    // Medic heals player
    if (ally.type === 'medic' && now - ally.lastHeal > 1000) {
      if (gameState.hp < gameState.maxHp) {
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + 5);
        createParticles(ally.x, ally.y, '#00ff00', 3);
      }
      ally.lastHeal = now;
    }
    
    // Allies shoot at enemies
    if (now - ally.lastShot > 500 && gameState.enemies.length > 0) {
      const target = gameState.enemies[0];
      if (target) {
        const angle = Math.atan2(target.y - ally.y, target.x - ally.x);
        gameState.bullets.push({
          x: ally.x,
          y: ally.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          damage: ally.type === 'gunner' ? 15 : 8,
          pierce: 1,
          weapon: 'ally',
          lifetime: 0,
          isAllyBullet: true
        });
        ally.lastShot = now;
      }
    }
  });
}

function shoot(weapon) {
  const bulletsPerShot = weapon.bulletsPerShot || 1;
  
  for (let i = 0; i < bulletsPerShot; i++) {
    const spread = (Math.random() - 0.5) * weapon.spread;
    const angle = gameState.player.angle + spread;
    
    gameState.bullets.push({
      x: gameState.player.x,
      y: gameState.player.y,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      damage: weapon.damage,
      pierce: weapon.pierce,
      weapon: gameState.player.currentWeapon,
      lifetime: 0
    });
  }
}

function updateEnemies() {
  gameState.enemies = gameState.enemies.filter(enemy => {
    if (enemy.hp <= 0) {
      gameState.gold += 5;
      gameState.kills++;
      if (gameState.healOnKill) {
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + gameState.healOnKill);
      }
      createParticles(enemy.x, enemy.y, '#ff0000', 10);
      return false;
    }
    
    if (!enemy.frozen && !enemy.stunned) {
      // Move towards player or away if ally
      const target = enemy.ally ? null : gameState.player;
      if (target && !enemy.ally) {
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * (enemy.speed || 2);
        enemy.y += (dy / dist) * (enemy.speed || 2);
      }
      
      // Gravity point effect
      if (gameState.gravityPoint) {
        const dx = gameState.gravityPoint.x - enemy.x;
        const dy = gameState.gravityPoint.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * gameState.gravityPoint.strength;
        enemy.y += (dy / dist) * gameState.gravityPoint.strength;
      }
      
      // Check collision with player
      const dx = enemy.x - gameState.player.x;
      const dy = enemy.y - gameState.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30 && !enemy.ally) {
        const now = Date.now();
        if (!gameState.invincible && !gameState.godMode && (now - gameState.player.lastDamageTime > 500)) {
          gameState.hp -= enemy.damage || 10;
          gameState.player.lastDamageTime = now;
          if (gameState.hp <= 0) {
            gameOver();
          }
        }
      }
    }
    
    return true;
  });
}

function updateBullets() {
  gameState.bullets = gameState.bullets.filter(bullet => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.lifetime += 16;
    
    // Check bounds
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      return false;
    }
    
    // Check collisions with enemies
    let hit = false;
    gameState.enemies.forEach(enemy => {
      if (enemy.ally) return;
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        enemy.hp -= bullet.damage;
        bullet.pierce--;
        if (bullet.pierce <= 0) hit = true;
        createParticles(bullet.x, bullet.y, '#ffff00', 5);
      }
    });
    
    return !hit && bullet.lifetime < 5000;
  });
}

function updateParticles() {
  gameState.particles = gameState.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    return p.life > 0;
  });
}

function drawEverything() {
  // Draw particles
  gameState.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 30;
    ctx.fillRect(p.x, p.y, 3, 3);
  });
  ctx.globalAlpha = 1;
  
  // Draw bullets
  gameState.bullets.forEach(bullet => {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw enemies
  gameState.enemies.forEach(enemy => {
    ctx.fillStyle = enemy.ally ? '#00ff00' : (enemy.frozen ? '#88ccff' : '#ff0000');
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // HP bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 3);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * (enemy.hp / enemy.maxHp), 3);
  });
  
  // Draw player
  ctx.save();
  ctx.translate(gameState.player.x, gameState.player.y);
  ctx.rotate(gameState.player.angle);
  
  // Draw avatar shape
  drawPlayerAvatar();
  
  // Gun
  ctx.fillStyle = '#333';
  ctx.fillRect(gameState.player.size/2 - 5, -3, 15, 6);
  
  ctx.restore();
  
  // Draw allies
  gameState.allies.forEach((ally, i) => {
    ctx.fillStyle = ally.type === 'medic' ? '#00ff00' : ally.type === 'tank' ? '#0088ff' : '#ff8800';
    ctx.fillRect(ally.x - 12, ally.y - 12, 24, 24);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(ally.x - 12, ally.y - 12, 24, 24);
    
    // HP bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(ally.x - 12, ally.y - 20, 24, 3);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(ally.x - 12, ally.y - 20, 24 * (ally.hp / ally.maxHp), 3);
  });
  
  // Draw chests
  gameState.chests.forEach(chest => {
    if (!chest.opened) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(chest.x - 15, chest.y - 15, 30, 30);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.strokeRect(chest.x - 15, chest.y - 15, 30, 30);
      ctx.fillStyle = '#FFD700';
      ctx.fillText('📦', chest.x - 10, chest.y + 5);
    }
  });
}

function updateChests() {
  gameState.chests.forEach(chest => {
    if (chest.opened) return;
    
    const dx = chest.x - gameState.player.x;
    const dy = chest.y - gameState.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 40) {
      chest.opened = true;
      openChest(chest);
    }
  });
}

function openChest(chest) {
  const rewards = [
    { type: 'coins', amount: 50 },
    { type: 'coins', amount: 100 },
    { type: 'hp', amount: 50 },
    { type: 'weapon', item: 'random' },
    { type: 'bomb', item: 'fire' },
    { type: 'ally', item: 'medic' }
  ];
  
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  
  switch(reward.type) {
    case 'coins':
      gameState.gold += reward.amount;
      alert(`Chest: +${reward.amount} coins!`);
      break;
    case 'hp':
      gameState.hp = Math.min(gameState.maxHp, gameState.hp + reward.amount);
      alert(`Chest: +${reward.amount} HP!`);
      break;
    case 'weapon':
      const weaponKeys = Object.keys(WEAPONS);
      const randomWeapon = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
      if (!gameState.ownedWeapons.includes(randomWeapon)) {
        gameState.ownedWeapons.push(randomWeapon);
        alert(`Chest: ${WEAPONS[randomWeapon].name}!`);
      } else {
        gameState.gold += 50;
        alert('Chest: +50 coins (duplicate weapon)');
      }
      break;
    case 'bomb':
      gameState.bombs[reward.item]++;
      alert(`Chest: ${reward.item} bomb!`);
      break;
    case 'ally':
      if (gameState.allies.length < gameState.maxAllies) {
        gameState.allies.push({
          x: chest.x,
          y: chest.y,
          type: 'medic',
          hp: 100,
          maxHp: 100,
          lastHeal: 0,
          lastShot: 0
        });
        alert('Chest: Free Medic ally!');
      } else {
        gameState.gold += 100;
        alert('Chest: +100 coins (max allies)');
      }
      break;
  }
  
  createParticles(chest.x, chest.y, '#FFD700', 20);
  updateHUD();
}

function spawnWave(count = 7) {
  const enemyTypes = ['basic', 'fast', 'tank', 'brute', 'specter', 'boss'];
  
  for (let i = 0; i < count; i++) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch(edge) {
      case 0: x = Math.random() * canvas.width; y = 0; break;
      case 1: x = canvas.width; y = Math.random() * canvas.height; break;
      case 2: x = Math.random() * canvas.width; y = canvas.height; break;
      case 3: x = 0; y = Math.random() * canvas.height; break;
    }
    
    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const stats = ENEMIES[enemyType];
    
    gameState.enemies.push({
      x, y,
      type: enemyType,
      hp: stats.hp + gameState.wave * 10,
      maxHp: stats.hp + gameState.wave * 10,
      speed: stats.speed + gameState.wave * 0.1,
      damage: stats.damage + gameState.wave,
      reward: stats.reward
    });
  }
  
  // Spawn treasure chests (1-3 per wave)
  const chestCount = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < chestCount; i++) {
    gameState.chests.push({
      x: Math.random() * (canvas.width - 100) + 50,
      y: Math.random() * (canvas.height - 100) + 50,
      opened: false,
      size: 30
    });
  }
}

function nextWave() {
  gameState.wave++;
  gameState.gold += 100 * gameState.wave;
  
  // Add jackpot carryover time
  if (gameState.domains.jackpotCarryover > 0) {
    activateDomain(4, gameState.domains.jackpotCarryover * 1000);
    gameState.domains.jackpotCarryover = 0;
  }
  
  setTimeout(() => spawnWave(7), 2000);
}

function activateDomain(num, customDuration) {
  if (gameState.domains.active) return;
  
  const domain = DOMAINS[num];
  if (!domain) return;
  
  gameState.domains.active = num;
  gameState.domains.timer = customDuration || domain.duration;
  
  domain.effect(gameState);
  
  const slot = document.querySelector(`[data-domain="${num}"]`);
  if (slot) slot.classList.add('active');
  
  console.log(`Domain ${num} activated: ${domain.name}`);
}

function endDomain() {
  const domain = DOMAINS[gameState.domains.active];
  if (domain.onEnd) {
    domain.onEnd(gameState);
  }
  
  const slot = document.querySelector(`[data-domain="${gameState.domains.active}"]`);
  if (slot) slot.classList.remove('active');
  
  gameState.domains.active = null;
  hideDomainEffect();
}

function useBomb(type) {
  if (gameState.bombs[type] <= 0) return;
  
  gameState.bombs[type]--;
  
  const effects = {
    smoke: () => {
      gameState.enemies.forEach(e => e.hp -= 50);
      createParticles(canvas.width / 2, canvas.height / 2, '#888888', 50);
    },
    fire: () => {
      gameState.enemies.forEach(e => {
        e.hp -= 100;
        e.burning = 60;
      });
      createParticles(canvas.width / 2, canvas.height / 2, '#ff4400', 80);
    },
    gravity: () => {
      gameState.enemies.forEach(e => {
        const dx = canvas.width / 2 - e.x;
        const dy = canvas.height / 2 - e.y;
        e.x += dx * 0.8;
        e.y += dy * 0.8;
        e.hp -= 200;
      });
    },
    nuke: () => {
      gameState.enemies = [];
      createParticles(canvas.width / 2, canvas.height / 2, '#ffff00', 200);
    }
  };
  
  effects[type]?.();
  updateHUD();
}

function executeAdminCommand() {
  const input = document.getElementById('consoleInput');
  const output = document.getElementById('consoleOutput');
  const cmd = input.value.trim().toLowerCase();
  
  const log = (msg) => {
    output.innerHTML += `<div>> ${msg}</div>`;
    output.scrollTop = output.scrollHeight;
  };
  
  // Check if admin is unlocked
  if (!gameState.hasAdminAccess) {
    log('ADMIN NOT UNLOCKED! Cost: 10000 coins');
    return;
  }
  
  const parts = cmd.split(' ');
  const command = parts[0];
  const arg = parts[1];
  
  // Level 3 commands
  if (gameState.adminLevel >= 3) {
    if (command === 'infdomain' && arg) {
      const domain = parseInt(arg);
      if (domain >= 1 && domain <= 10) {
        gameState.domains.timer = 999999999;
        activateDomain(domain, 999999999);
        log(`Infinite domain ${domain} activated`);
      }
    } else if (command === 'mix') {
      for (let i = 1; i <= 10; i++) {
        DOMAINS[i].effect(gameState);
      }
      log('All domains mixed!');
    } else if (command === 'kill_all') {
      gameState.enemies = [];
      log('All enemies eliminated');
    } else if (command === 'invincible') {
      gameState.invincible = !gameState.invincible;
      log(`Invincible: ${gameState.invincible}`);
    } else if (command === 'edit_gold' && arg) {
      gameState.gold = parseInt(arg);
      log(`Gold set to ${arg}`);
    } else if (command === 'noclip') {
      gameState.noclip = !gameState.noclip;
      log(`Noclip: ${gameState.noclip}`);
    }
  }
  
  // Level 2 commands
  if (gameState.adminLevel >= 2) {
    if (command === 'domain' && arg) {
      const domain = parseInt(arg);
      if (domain >= 1 && domain <= 10) {
        activateDomain(domain);
        log(`Domain ${domain} activated`);
      }
    } else if (command === 'double') {
      gameState.domains.timer *= 2;
      log('Domain time doubled');
    } else if (command === 'spawn_car') {
      log('Vehicle spawned nearby');
    } else if (command === 'give_bomb' && arg) {
      gameState.bombs[arg] = (gameState.bombs[arg] || 0) + 1;
      log(`Bomb ${arg} added`);
    } else if (command === 'god_mode') {
      gameState.godMode = !gameState.godMode;
      log(`God mode: ${gameState.godMode}`);
    }
  }
  
  // Level 1 commands
  if (gameState.adminLevel >= 1) {
    if (command === 'domain' && arg) {
      const domain = parseInt(arg);
      if (domain >= 5 && domain <= 10) {
        activateDomain(domain);
        log(`Domain ${domain} activated`);
      } else {
        log('Moderators can only use domains 5-10');
      }
    } else if (command === 'teleport') {
      gameState.player.x = Math.random() * canvas.width;
      gameState.player.y = Math.random() * canvas.height;
      log('Teleported');
    } else if (command === 'give_gold') {
      gameState.gold += 100;
      log('100 gold added');
    }
  }
  
  // Admin level setting (dev only)
  if (command === 'setlevel' && arg) {
    gameState.adminLevel = parseInt(arg);
    document.getElementById('adminLevel').textContent = gameState.adminLevel;
    log(`Admin level set to ${arg}`);
  }
  
  if (command === 'help') {
    log('Commands: domain, infdomain, mix, kill_all, invincible, god_mode, give_gold, teleport, setlevel');
  }
  
  input.value = '';
}

function updateHUD() {
  const hpPercent = (gameState.hp / gameState.maxHp * 100);
  document.getElementById('hp').style.width = hpPercent + '%';
  document.getElementById('hpText').textContent = `${Math.floor(gameState.hp)}/${gameState.maxHp}`;
  document.getElementById('goldText').textContent = gameState.gold;
  document.getElementById('waveText').textContent = `${gameState.wave} (${gameState.roundInWave}/2)`;
  document.getElementById('weaponText').textContent = WEAPONS[gameState.player.currentWeapon].name;
  
  const allyCount = gameState.allies.filter(a => a.hp > 0).length;
  document.getElementById('alliesText').textContent = `${allyCount}/${gameState.maxAllies}`;
  
  // Update separate allies display
  const alliesDisplay = document.getElementById('alliesDisplay');
  if (alliesDisplay) {
    let allyInfo = '';
    gameState.allies.forEach((ally, i) => {
      if (ally.hp > 0) {
        const type = ally.type.charAt(0).toUpperCase() + ally.type.slice(1);
        const hpBar = Math.round((ally.hp / ally.maxHp) * 5);
        allyInfo += `${type}: ${'█'.repeat(hpBar)}${'░'.repeat(5-hpBar)} `;
      }
    });
    alliesDisplay.textContent = allyInfo || 'No active allies';
  }
  
  document.getElementById('killsText').textContent = gameState.kills;
  
  const weapon = WEAPONS[gameState.player.currentWeapon];
  document.getElementById('ammoText').textContent = weapon.ammo === Infinity ? '∞' : weapon.ammo;
  
  // Update shop gold
  const shopGold = document.getElementById('shopGold');
  if (shopGold) shopGold.textContent = gameState.gold;
  
  // Update menu coins
  updateMenuCoins();

  updateUserIdDisplay();
}

function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    gameState.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      color,
      life: 30
    });
  }
}

function showDomainEffect(num) {
  const effect = document.getElementById('domainEffect');
  effect.className = `domain-${num}`;
  effect.style.display = 'block';
}

function hideDomainEffect() {
  document.getElementById('domainEffect').style.display = 'none';
}

function createLaserSlash(state) {
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height;
  const angle = Math.random() * Math.PI * 2;
  
  for (let i = 0; i < 10; i++) {
    state.bullets.push({
      x: x + Math.cos(angle) * i * 20,
      y: y + Math.sin(angle) * i * 20,
      vx: Math.cos(angle + Math.PI / 2) * 15,
      vy: Math.sin(angle + Math.PI / 2) * 15,
      damage: 100,
      pierce: 999,
      weapon: 'laser-slash',
      lifetime: 0
    });
  }
}

function spawnShadowAlly(state) {
  state.enemies.push({
    x: state.player.x + (Math.random() - 0.5) * 100,
    y: state.player.y + (Math.random() - 0.5) * 100,
    hp: 200,
    maxHp: 200,
    speed: 3,
    ally: true,
    damage: 20
  });
}

function spawnDeathFish(state) {
  state.enemies.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    hp: 100,
    maxHp: 100,
    speed: 4,
    ally: true,
    damage: 30,
    fish: true
  });
}

function spawnMeteor(state) {
  const x = Math.random() * canvas.width;
  state.bullets.push({
    x,
    y: -50,
    vx: 0,
    vy: 10,
    damage: 150,
    pierce: 999,
    weapon: 'meteor',
    lifetime: 0
  });
}

function playEDM() {
  console.log('🎵 EDM Music Playing!');
}

function gameOver() {
  gameState.running = false;
  document.getElementById('finalWave').textContent = gameState.wave;
  document.getElementById('finalGold').textContent = gameState.gold;
  document.getElementById('finalKills').textContent = gameState.kills;
  document.getElementById('gameover').style.display = 'flex';
  document.getElementById('game').style.display = 'none';
}

// ============================================
// MINI GAME
// ============================================
let miniGameState = {
  active: false,
  score: 0,
  coins: [],
  player: { x: 300, y: 350, width: 30, height: 30 },
  gameRunning: false
};

function startMiniGame() {
  miniGameState.active = true;
  miniGameState.score = 0;
  miniGameState.coins = [];
  miniGameState.gameRunning = true;
  
  // Spawn initial coins
  for (let i = 0; i < 5; i++) {
    miniGameState.coins.push({
      x: Math.random() * 550 + 25,
      y: Math.random() * 300,
      width: 15,
      height: 15,
      value: 10
    });
  }
  
  miniGameLoop();
}

function stopMiniGame() {
  miniGameState.active = false;
  miniGameState.gameRunning = false;
}

function miniGameLoop() {
  if (!miniGameState.active) return;
  
  const canvas = document.getElementById('miniGameCanvas');
  const ctx = canvas.getContext('2d');
  
  // Clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 600, 400);
  
  // Handle input
  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    miniGameState.player.x = e.clientX - rect.left;
  });
  
  // Draw player
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(miniGameState.player.x - 15, miniGameState.player.y, 30, 30);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(miniGameState.player.x - 15, miniGameState.player.y, 30, 30);
  
  // Update and draw coins
  for (let i = miniGameState.coins.length - 1; i >= 0; i--) {
    const coin = miniGameState.coins[i];
    coin.y += 2;
    
    // Draw coin
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Check collision with player
    if (coin.y > miniGameState.player.y - 20 &&
        coin.y < miniGameState.player.y + 30 &&
        coin.x > miniGameState.player.x - 20 &&
        coin.x < miniGameState.player.x + 20) {
      miniGameState.score += coin.value;
      miniGameState.coins.splice(i, 1);
      document.getElementById('miniGameScore').textContent = miniGameState.score;
      continue;
    }
    
    // Remove if off screen
    if (coin.y > 400) {
      miniGameState.coins.splice(i, 1);
    }
  }
  
  // Spawn new coins
  if (miniGameState.coins.length < 5 && Math.random() < 0.05) {
    miniGameState.coins.push({
      x: Math.random() * 550 + 25,
      y: -15,
      width: 15,
      height: 15,
      value: 10
    });
  }
  
  // Draw score
  ctx.fillStyle = '#fff';
  ctx.font = '16px Aptos Display';
  ctx.fillText(`SCORE: ${miniGameState.score}`, 20, 30);
  
  if (miniGameState.gameRunning) {
    requestAnimationFrame(miniGameLoop);
  }
}



console.log('Game loaded! Press Start to begin.');
console.log('Press ~ to open admin console. Use "setlevel 3" for dev access.');
// Initialize game on page load
loadGameData();
updateAdminButtons();