const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const SOUNDS = {
  shoot: { freq: 200, duration: 50 },
  hit: { freq: 150, duration: 100 },
  kill: { freq: 100, duration: 150 },
  coin: { freq: 800, duration: 80 },
  powerup: { freq: 600, duration: 200 },
  achievement: { freq: 1000, duration: 300 },
  combo: { freq: 700, duration: 120 }
};

let audioContext = null;
let soundEnabled = true;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(soundName) {
  if (!soundEnabled || !audioContext) return;
  
  const sound = SOUNDS[soundName];
  if (!sound) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = sound.freq;
  oscillator.type = 'square';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + sound.duration / 1000);
}

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
  roundInWave: 1,
  waveWon: false,
  wavesToWin: 20,
  wavesSurvived: 0,
  scoreMultiplier: 1,
  headshots: 0,
  aiControlledAllies: false,
  healOnKill: 0,
  
    dailyReward: { available: true, streak: 0, lastClaim: 0 },
  missions: [],
  perks: [],
  bossWave: false,
  upgradePoints: 0,
  playerStats: {
    maxHp: 100,
    speed: 3,
    fireRate: 1,
    damage: 1,
    critChance: 0.15,
    luck: 1
  },
  timeInGame: 0,
  freezeTime: false,
  rageModeActive: false,
  rageModeTimer: 0,

  player: {
    x: 400,
    y: 300,
    speed: 3,
    angle: 0,
    currentWeapon: 'pistol',
    vehicle: null,
    vehicleHP: 0,
    size: 35,
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
  mouse: { x: 0, y: 0, down: false },
  
    comboCount: 0,
  comboTime: 0,
  comboMultiplier: 1,
  killStreak: 0,
  lastKillTime: 0,
  achievements: [],
  totalDamageDealt: 0,
  maxCombo: 0,
  weaponKills: {},
  pickups: []
};

const ACHIEVEMENTS = {
  firstBlood: { name: 'First Blood', icon: '🩸', reward: 50, condition: (s) => s.kills === 1 },
  comboKing: { name: 'Combo King', icon: '⚡', reward: 200, condition: (s) => s.maxCombo >= 10 },
  wavemaster: { name: 'Wave Master', icon: '🌊', reward: 500, condition: (s) => s.wave >= 10 },
  damageDealer: { name: 'Damage Dealer', icon: '💥', reward: 300, condition: (s) => s.totalDamageDealt >= 10000 },
  allySavior: { name: 'Ally Savior', icon: '🛡️', reward: 150, condition: (s) => s.allies.length >= 3 },
  weaponMaster: { name: 'Weapon Master', icon: '🔫', reward: 250, condition: (s) => Object.keys(s.weaponKills).length >= 5 },
  killStreak: { name: 'Kill Streak', icon: '🔥', reward: 100, condition: (s) => s.killStreak >= 5 },
  richman: { name: 'Rich Man', icon: '💰', reward: 0, condition: (s) => s.gold >= 5000 },
  survivalKing: { name: 'Survival King', icon: '👑', reward: 400, condition: (s) => s.wavesSurvived >= 20 },
  criticalHit: { name: 'Critical Hit Master', icon: '💢', reward: 200, condition: (s) => s.headshots >= 10 }
};

const SPECIAL_WAVES = [
  { type: 'goldRush', name: 'GOLD RUSH', bonus: 2.5, icon: '💰', probability: 0.15 },
  { type: 'berserk', name: 'BERSERK MODE', enemies: 10, icon: '😈', probability: 0.1 },
  { type: 'speedBoost', name: 'SPEED BOOST', bonus: 0, icon: '⚡', probability: 0.12 },
  { type: 'doubleXP', name: 'DOUBLE MULTIPLIER', bonus: 2, icon: '2️⃣', probability: 0.1 },
  { type: 'stealth', name: 'STEALTH WAVE', icon: '👻', probability: 0.08 }
];

let currentSpecialWave = null;

function rollSpecialWave() {
  const roll = Math.random();
  for (let sw of SPECIAL_WAVES) {
    if (roll < sw.probability) {
      currentSpecialWave = sw;
      showNotification(`${sw.icon} ${sw.name} ACTIVATED!`);
      return sw;
    }
  }
  currentSpecialWave = null;
  return null;
}

function unlockAchievement(key) {
  if (gameState.achievements.includes(key)) return;
  
  const ach = ACHIEVEMENTS[key];
  gameState.achievements.push(key);
  gameState.gold += ach.reward;
  
  playSound('achievement');
  showNotification(`ACHIEVEMENT UNLOCKED! ${ach.icon} ${ach.name} +${ach.reward}¢`);
  console.log(`Achievement unlocked: ${ach.name}`);
  saveGameData();
}

function updateCombo() {
  const now = Date.now();
  
    if (now - gameState.lastKillTime > 2000) {
    if (gameState.comboCount >= 5) {
      showNotification(`COMBO BROKEN! ${gameState.comboCount}x`);
    }
    gameState.comboCount = 0;
    gameState.comboMultiplier = 1;
  }
}

function addCombo() {
  gameState.comboCount++;
  gameState.comboMultiplier = 1 + (gameState.comboCount * 0.1);
  gameState.lastKillTime = Date.now();
  
  if (gameState.comboCount > gameState.maxCombo) {
    gameState.maxCombo = gameState.comboCount;
  }
  
  if (gameState.comboCount % 5 === 0) {
    const bonus = gameState.comboCount * 25;
    playSound('combo');
    showNotification(`COMBO x${gameState.comboCount}! +${bonus}¢`);
    gameState.gold += bonus;
  }
}

function showNotification(text) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 0, 0.9);
    color: black;
    padding: 10px 20px;
    border-radius: 5px;
    font-weight: bold;
    z-index: 1000;
    animation: slideDown 0.5s;
  `;
  notif.textContent = text;
  document.body.appendChild(notif);
  
  setTimeout(() => notif.remove(), 2000);
}

const PICKUPS = {
  health: { icon: '❤️', color: '#ff0000', effect: (s) => { s.hp = Math.min(s.maxHp, s.hp + 30); playSound('powerup'); } },
  ammo: { icon: '📦', color: '#ffaa00', effect: (s) => { s.gold += 20; playSound('coin'); } },
  shield: { icon: '🛡️', color: '#00ffff', effect: (s) => { s.invincible = true; setTimeout(() => s.invincible = false, 5000); playSound('powerup'); } },
  speed: { icon: '⚡', color: '#ffff00', effect: (s) => { s.player.speed = 6; setTimeout(() => s.player.speed = 3, 4000); playSound('powerup'); } },
  bomb: { icon: '💣', color: '#ff00ff', effect: (s) => { s.bombs.fire++; playSound('powerup'); } }
};

function spawnPickup(x, y, type = null) {
  if (!type) {
    const types = Object.keys(PICKUPS);
    type = types[Math.floor(Math.random() * types.length)];
  }
  gameState.pickups.push({ x, y, type, life: 500 });
}

function updatePickups() {
  gameState.pickups = gameState.pickups.filter(pickup => {
    pickup.life--;
    
    const dx = gameState.player.x - pickup.x;
    const dy = gameState.player.y - pickup.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 30) {
      PICKUPS[pickup.type].effect(gameState);
      createParticles(pickup.x, pickup.y, PICKUPS[pickup.type].color, 10);
      return false;
    }
    
    return pickup.life > 0;
  });
}

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

const WEAPONS = {
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

const BADGES = {
  1: { name: 'First Blood', desc: 'Kill 10 enemies', icon: '🔴', condition: (s) => s.kills >= 10 },
  2: { name: 'Killer', desc: 'Kill 50 enemies', icon: '⚫', condition: (s) => s.kills >= 50 },
  3: { name: 'Slayer', desc: 'Kill 100 enemies', icon: '💀', condition: (s) => s.kills >= 100 },
  4: { name: 'Boss Slayer', desc: 'Defeat 5 bosses', icon: '👑', condition: (s) => s.bossesDefeated >= 5 },
  5: { name: 'Wave Survivor', desc: 'Reach wave 10', icon: '🌊', condition: (s) => s.bestWave >= 10 },
  6: { name: 'Survivor', desc: 'Reach wave 20', icon: '🏆', condition: (s) => s.bestWave >= 20 },
  7: { name: 'Champion', desc: 'Win the game', icon: '🥇', condition: (s) => s.wins >= 1 },
  8: { name: 'Collector', desc: 'Get 5000 coins', icon: '💰', condition: (s) => s.gold >= 5000 },
  9: { name: 'Rich', desc: 'Get 20000 coins', icon: '💵', condition: (s) => s.gold >= 20000 },
  10: { name: 'Sharpshooter', desc: '50 headshots', icon: '🎯', condition: (s) => s.headshots >= 50 },
  11: { name: 'Critical Master', desc: '30 critical hits', icon: '⚡', condition: (s) => s.criticals >= 30 },
  12: { name: 'Combo King', desc: '10x combo', icon: '🔥', condition: (s) => s.maxCombo >= 10 },
  13: { name: 'Speed Runner', desc: 'Win in 30 min', icon: '⏱️', condition: (s) => s.playTime <= 1800 && s.wins >= 1 },
  14: { name: 'Ally Master', desc: 'Hire 5 allies', icon: '👥', condition: (s) => s.allies.length >= 5 },
  15: { name: 'Arsenal', desc: 'Own 10 weapons', icon: '🔫', condition: (s) => s.ownedWeapons.length >= 10 },
  16: { name: 'Survivor Elite', desc: 'Reach wave 30', icon: '🛡️', condition: (s) => s.bestWave >= 30 },
  17: { name: 'Lucky', desc: 'Get 10 pickups', icon: '🎁', condition: (s) => s.pickupsCollected >= 10 },
  18: { name: 'Unstoppable', desc: 'No damage run', icon: '✨', condition: (s) => s.noDamagRun },
  19: { name: 'Legend', desc: '100k total coins', icon: '👑', condition: (s) => s.totalCoinCount >= 100000 },
  20: { name: 'God Mode', desc: 'Beat on hard', icon: '🌟', condition: (s) => s.hardModeWins >= 1 }
};

function updateBadges() {
  const badgeElements = document.querySelectorAll('.badge');
  const saveData = JSON.parse(localStorage.getItem('tankGameSave') || '{}');
  
  badgeElements.forEach(badge => {
    const badgeId = parseInt(badge.dataset.badge);
    const badgeInfo = BADGES[badgeId];
    
    if (!badgeInfo) return;
    
        const isUnlocked = badgeInfo.condition(gameState) || 
                       (saveData.unlockedBadges && saveData.unlockedBadges.includes(badgeId));
    
    if (isUnlocked) {
      badge.classList.add('unlocked');
      badge.classList.remove('locked');
      badge.title = `✓ ${badgeInfo.name} - ${badgeInfo.desc}`;
    } else {
      badge.classList.add('locked');
      badge.classList.remove('unlocked');
      badge.title = `? ${badgeInfo.name} - ${badgeInfo.desc}`;
    }
  });
}

function unlockBadge(badgeId) {
  const saveData = JSON.parse(localStorage.getItem('tankGameSave') || '{}');
  if (!saveData.unlockedBadges) saveData.unlockedBadges = [];
  
  if (!saveData.unlockedBadges.includes(badgeId)) {
    saveData.unlockedBadges.push(badgeId);
    localStorage.setItem('tankGameSave', JSON.stringify(saveData));
    
    const badgeEl = document.querySelector(`[data-badge="${badgeId}"]`);
    if (badgeEl) {
      badgeEl.classList.add('unlocked');
      badgeEl.classList.remove('locked');
    }
    
    showNotification(`🏅 BADGE UNLOCKED: ${BADGES[badgeId].name}!`);
    playSound('achievement');
  }
}

const ENEMIES = {
  basic: { hp: 50, speed: 1, damage: 5, reward: 5 },
  fast: { hp: 30, speed: 2, damage: 3, reward: 8 },
  tank: { hp: 150, speed: 0.5, damage: 10, reward: 15 },
  brute: { hp: 200, speed: 1.5, damage: 15, reward: 20 },
  specter: { hp: 80, speed: 2.5, damage: 8, reward: 25 },
  boss: { hp: 300, speed: 0.8, damage: 20, reward: 50 }
};

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
    achievements: gameState.achievements,
    maxCombo: gameState.maxCombo,
    dailyBonusCalendar: gameState.dailyBonusCalendar,
    dailyReward: gameState.dailyReward,
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
      gameState.achievements = data.achievements || [];
      gameState.maxCombo = data.maxCombo || 0;
      gameState.dailyBonusCalendar = data.dailyBonusCalendar || null;
      gameState.dailyReward = data.dailyReward || { available: true, streak: 0, lastClaim: 0 };
    } catch (e) {
      console.log('Error loading game data:', e);
    }
  }
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

const VEHICLES = {
  skateboard: { speed: 8, hp: 0, price: 500 },
  motorcycle: { speed: 10, hp: 200, price: 2000 },
  'mech-suit': { speed: 3, hp: 1000, price: 10000, weaponBonus: 2 },
  tank: { speed: 2, hp: 2000, weaponBonus: 3 },
  helicopter: { speed: 12, hp: 500, flying: true }
};

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

document.addEventListener('keydown', (e) => {
  gameState.keys[e.key.toLowerCase()] = true;
  
    if (e.key.toLowerCase() === 'q') {
    const wheel = document.getElementById('weaponWheel');
    wheel.style.display = wheel.style.display === 'none' ? 'block' : 'none';
  }
  
    if (e.key === '`' || e.key === '~') {
    const console = document.getElementById('adminConsole');
    console.style.display = console.style.display === 'none' ? 'block' : 'none';
  }
  
    if (e.key === '`' || e.key === '~') {
    const console = document.getElementById('adminConsole');
    console.style.display = console.style.display === 'none' ? 'block' : 'none';
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

document.querySelectorAll('.shop-item[data-weapon], .shop-item[data-ally], .shop-item[data-upgrade], .shop-item[data-admin]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const el = e.target.closest('button');
    const price = parseInt(el.dataset.price) || 0;
    const weapon = el.dataset.weapon;
    const ally = el.dataset.ally;
    const upgrade = el.dataset.upgrade;
    const admin = el.dataset.admin;
    
    if (gameState.gold >= price) {
      gameState.gold -= price;
      
            const shopGold = document.getElementById('shopGold');
      if (shopGold) shopGold.textContent = gameState.gold;
      
      if (weapon) {
        gameState.ownedWeapons.push(weapon);
        alert(`Purchased: ${weapon.toUpperCase()}!`);
      } else if (ally) {
        gameState.allies.push({ x: 300, y: 300, type: ally, hp: 100, maxHp: 100 });
        alert(`Hired: ${ally.toUpperCase()}!`);
      } else if (upgrade) {
        if (upgrade === 'hp') gameState.maxHp += 50;
        else if (upgrade === 'damage') gameState.playerStats.damage *= 1.1;
        else if (upgrade === 'speed') gameState.playerStats.speed *= 1.2;
        else if (upgrade === 'firerate') gameState.playerStats.fireRate *= 1.15;
        alert(`Upgraded: ${upgrade.toUpperCase()}!`);
      } else if (admin) {
        gameState.hasAdminAccess = true;
        gameState.adminLevel = 3;
        alert('ADMIN UNLOCKED!');
      }
      
      updateMenuCoins();
      saveGameData();
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

function claimDailyBonus() {
  const now = Date.now();
  const lastClaim = gameState.dailyReward?.lastClaim || 0;
  const hoursSinceLast = (now - lastClaim) / (1000 * 60 * 60);
  
  if (hoursSinceLast >= 24) {
    gameState.dailyReward.available = true;
  }
  
  if (gameState.dailyReward.available) {
    const bonusAmount = 500 + (gameState.dailyReward.streak * 100);
    gameState.gold += bonusAmount;
    gameState.dailyReward.available = false;
    gameState.dailyReward.streak++;
    gameState.dailyReward.lastClaim = now;
    
    updateMenuCoins();
    saveGameData();
    showNotification(`💎 Daily Bonus! +${bonusAmount}¢ (Streak: ${gameState.dailyReward.streak})`);
    playSound('powerup');
    return true;
  }
  return false;
}

function initDailyBonusData() {
  if (!gameState.dailyBonusCalendar) {
    const startDate = new Date(2026, 1, 5); // Feb 5, 2026
    gameState.dailyBonusCalendar = {
      startDate: startDate.getTime(),
      dayRewards: generateDayRewards(),
      claimedDays: []
    };
    saveGameData();
  }
}

function getCurrentDayNumber() {
  const startDate = new Date(2026, 1, 5); // Feb 5, 2026
  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startAtMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  
  const diffTime = todayAtMidnight - startAtMidnight;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Cap at 19 (day 20 is index 19)
  return Math.min(diffDays, 19);
}

function generateDayRewards() {
  const rewards = [];
  const rewardTypes = [100, 150, 200, 250, 300, 400, 500];
  
  for (let i = 0; i < 20; i++) {
    const reward = rewardTypes[Math.floor(Math.random() * rewardTypes.length)] + (i * 25);
    rewards.push({
      day: i + 1,
      reward: reward,
      claimed: false,
      icon: '💰'
    });
  }
  
  rewards[9].reward = 600;
  rewards[9].icon = '⭐';
  rewards[19].reward = 1000;
  rewards[19].icon = '👑';
  
  return rewards;
}

function showDailyBonusModal() {
  initDailyBonusData();
  const modal = document.getElementById('dailyBonusModal');
  modal.style.display = 'flex';
  
  updateDailyBonusCalendar();
}

function updateDailyBonusCalendar() {
  const calendar = gameState.dailyBonusCalendar;
  const currentDay = getCurrentDayNumber();
  const rewards = calendar.dayRewards;
  const claimedDays = calendar.claimedDays || [];
  
  for (let i = 0; i < 20; i++) {
    const dayEl = document.getElementById(`day${i}`);
    const reward = rewards[i];
    
    dayEl.innerHTML = `
      <div class="daily-day-number">Day ${i + 1}</div>
      <div class="daily-day-reward">${reward.icon}</div>
      <div style="font-size: 12px; margin-top: 3px;">+${reward.reward}¢</div>
    `;
    
    dayEl.classList.remove('locked', 'available', 'claimed');
    dayEl.removeEventListener('click', dayEl.claimHandler);
    
    if (claimedDays.includes(i)) {
      // Already claimed
      dayEl.classList.add('claimed');
      dayEl.style.cursor = 'default';
    } else if (i === currentDay) {
      // Today - available to claim
      dayEl.classList.add('available');
      dayEl.style.cursor = 'pointer';
      dayEl.claimHandler = () => claimCurrentDayReward(i);
      dayEl.addEventListener('click', dayEl.claimHandler);
    } else if (i < currentDay) {
      // Past days not claimed - show as missed
      dayEl.classList.add('claimed');
      dayEl.style.opacity = '0.4';
      dayEl.style.cursor = 'default';
    } else {
      // Future days - locked
      dayEl.classList.add('locked');
      dayEl.style.cursor = 'default';
    }
  }
  
  const message = document.getElementById('dailyBonusMessage');
  if (claimedDays.includes(currentDay)) {
    message.textContent = `✓ Day ${currentDay + 1} already claimed! Come back tomorrow!`;
  } else if (currentDay === 19) {
    message.textContent = '🎉 Last day! Collect 1000 coins!';
  } else if (currentDay === 9) {
    message.textContent = '⭐ Day 10! Special reward! Click to claim!';
  } else {
    message.textContent = `Day ${currentDay + 1} available - Click to claim!`;
  }
}

function claimCurrentDayReward(dayIndex) {
  const calendar = gameState.dailyBonusCalendar;
  const claimedDays = calendar.claimedDays || [];
  const reward = calendar.dayRewards[dayIndex];
  const currentDay = getCurrentDayNumber();
  
  if (dayIndex === currentDay && !claimedDays.includes(dayIndex)) {
    claimedDays.push(dayIndex);
    calendar.claimedDays = claimedDays;
    gameState.gold += reward.reward;
    
    saveGameData();
    updateMenuCoins();
    playSound('powerup');
    showNotification(`💎 +${reward.reward}¢ (Day ${dayIndex + 1})`);
    
    setTimeout(() => {
      updateDailyBonusCalendar();
    }, 300);
  }
}

document.getElementById('closeDailyBonus')?.addEventListener('click', () => {
  document.getElementById('dailyBonusModal').style.display = 'none';
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tab = e.target.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelector(`.tab-content[data-tab="${tab}"]`)?.classList.add('active');
  });
});

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

document.getElementById('pauseBtn')?.addEventListener('click', togglePause);
document.getElementById('resumeBtn')?.addEventListener('click', togglePause);
document.getElementById('surrenderBtn')?.addEventListener('click', () => {
  if (gameState.running) {
    if (gameState.gold >= 10) {
      gameState.gold -= 10;
      saveGameData();       updateHUD();       showNotification('⚔️ You surrendered! -10¢', '#ff0000');
      setTimeout(() => {
        gameOver();
      }, 800);
    } else {
      showNotification('Need 10 coins to surrender!', '#ff0000');
    }
  }
});
document.getElementById('equipBtn')?.addEventListener('click', () => {
    document.getElementById('game').style.display = 'none';
  document.getElementById('shop').style.display = 'block';
  gameState.paused = true;
  const shopGoldEl = document.getElementById('shopGold');
  if (shopGoldEl) shopGoldEl.textContent = gameState.gold;
});
document.getElementById('quitBtn')?.addEventListener('click', () => {
  location.reload();
});
document.getElementById('shopPauseBtn')?.addEventListener('click', () => {
  document.getElementById('pauseMenu').style.display = 'none';
  document.getElementById('shop').style.display = 'block';
});
document.getElementById('startBtn')?.addEventListener('click', startGame);

document.getElementById('bonusBtn')?.addEventListener('click', () => {
  showDailyBonusModal();
});

document.getElementById('shopBtn')?.addEventListener('click', () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('shop').style.display = 'block';
  
    const shopGoldEl = document.getElementById('shopGold');
  if (shopGoldEl) {
    shopGoldEl.textContent = gameState.gold;
  }
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

document.getElementById('github1')?.addEventListener('click', () => {
  window.open('https://github.com/bonmiuken', '_blank');
});

document.getElementById('github2')?.addEventListener('click', () => {
  window.open('https://github.com/minhanhdeptrai2025-star', '_blank');
});

document.getElementById('closeShop')?.addEventListener('click', () => {
  document.getElementById('shop').style.display = 'none';
    if (gameState.running) {
    document.getElementById('game').style.display = 'block';
    gameState.paused = false;
  } else {
    document.getElementById('menu').style.display = 'flex';
  }
});

setTimeout(() => {
  document.getElementById('miniGameClose')?.addEventListener('click', () => {
    if (miniGameState.score > 0) {
      const coinsEarned = Math.floor(miniGameState.score / 10);
      gameState.gold += coinsEarned;
      document.getElementById('menuCoins').textContent = gameState.gold;
      updateAdminButtons();
      saveGameData();
      alert(`Mini Game Won!\nEarned: ${coinsEarned} coins!\nTotal: ${gameState.gold} coins`);
    }
    miniGameState.active = false;
    miniGameState.gameRunning = false;
    document.getElementById('miniGame').style.display = 'none';
    document.getElementById('menu').style.display = 'flex';
    stopMiniGame();
  });
}, 100);

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

document.querySelectorAll('[data-weapon]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const weapon = e.target.dataset.weapon;
    const price = parseInt(e.target.dataset.price) || 0;
    
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

document.querySelectorAll('.domain-slot').forEach(slot => {
  slot.addEventListener('click', (e) => {
    const domain = parseInt(e.target.dataset.domain);
    activateDomain(domain);
  });
});

document.querySelectorAll('.bomb-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const bombType = e.target.dataset.bomb;
    useBomb(bombType);
  });
});

document.getElementById('executeCmd')?.addEventListener('click', executeAdminCommand);
document.getElementById('consoleInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') executeAdminCommand();
});

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

function updateEquipButtonVisibility() {
  const equipBtn = document.getElementById('equipBtn');
  if (!equipBtn) return;
  equipBtn.style.display = gameState.running ? 'none' : 'block';
}

function startGame() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  gameState.running = true;
  gameState.paused = false;
  gameState.roundInWave = 1;
  gameState.player.x = canvas.width / 2;
  gameState.player.y = canvas.height / 2;
  
  updateEquipButtonVisibility();
  
  initAudio();
  applyClassBonus();
  spawnWave();
  gameLoop();
}

let lastShot = 0;
let lastFrame = Date.now();
function gameLoop() {
  if (!gameState.running || gameState.paused) return;
  
    const now = Date.now();
  const delta = now - lastFrame;
  if (delta < 33) {
    requestAnimationFrame(gameLoop);
    return;
  }
  lastFrame = now;
  
    if (now % 1000 < 33) {
    updateBadges();
  }
  
    drawDesertBackground();
  
    updatePlayer();
  updateAlliesFollowing();
  
    updateAllies();
  
    updateEnemies();
  
    updateBullets();
  
    updateParticles();
  
    updateChests();
  
    updatePickups();
  
    const weapon = WEAPONS[gameState.player.currentWeapon];
  if (gameState.mouse.down && Date.now() - lastShot > weapon.fireRate) {
    shoot(weapon);
    lastShot = Date.now();
  }
  
    drawEverything();
  
    updateCombo();
  
    updateHUD();
  
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
    ctx.moveTo(x - size, y + size/2);
  ctx.lineTo(x + size, y + size/2);
}

function drawDesertBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(0.5, '#f4a460');
  gradient.addColorStop(1, '#daa520');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
  ctx.fill();
  
    ctx.fillStyle = '#f4a460';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.7);
  for (let x = 0; x < canvas.width; x += 50) {
    ctx.lineTo(x, canvas.height * 0.7 + Math.sin(x * 0.02) * 20);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.fill();
  
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
  
    if (!gameState.noclip) {
    gameState.player.x = Math.max(20, Math.min(canvas.width - 20, gameState.player.x));
    gameState.player.y = Math.max(20, Math.min(canvas.height - 20, gameState.player.y));
  }
  
    gameState.player.angle = Math.atan2(
    gameState.mouse.y - gameState.player.y,
    gameState.mouse.x - gameState.player.x
  );
}

function updateAllies() {
  const now = Date.now();
  
  gameState.allies.forEach((ally, i) => {
        const offsetX = i === 0 ? -50 : 50;
    const offsetY = i === 0 ? 30 : 30;
    ally.x = gameState.player.x + offsetX;
    ally.y = gameState.player.y + offsetY;
    
        if (ally.type === 'medic' && now - ally.lastHeal > 1000) {
      if (gameState.hp < gameState.maxHp) {
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + 5);
        createParticles(ally.x, ally.y, '#00ff00', 3);
      }
      ally.lastHeal = now;
    }
    
        if (now - ally.lastShot > 500 && gameState.enemies.length > 0) {
      let target = gameState.enemies[0];
      
            if (gameState.aiControlledAllies && gameState.enemies.length > 1) {
        target = gameState.enemies.reduce((prev, curr) => 
          curr.hp < prev.hp ? curr : prev
        );
      }
      
      if (target) {
        const angle = Math.atan2(target.y - ally.y, target.x - ally.x);
        const damage = ally.type === 'gunner' ? 15 : (ally.type === 'tank' ? 10 : 8);
        gameState.bullets.push({
          x: ally.x,
          y: ally.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          damage: gameState.aiControlledAllies ? damage * 1.3 : damage,
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
  
  playSound('shoot');
  
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
      gameState.gold += 5 * gameState.comboMultiplier;
      gameState.kills++;
      gameState.killStreak++;
      addCombo();
      playSound('kill');
      playSound('coin');
      
            const weapon = gameState.player.currentWeapon;
      gameState.weaponKills[weapon] = (gameState.weaponKills[weapon] || 0) + 1;
      
      if (gameState.healOnKill) {
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + gameState.healOnKill);
      }
      createParticles(enemy.x, enemy.y, '#ff0000', 10);
      
      // 25% chance to drop pickup
      if (Math.random() < 0.25) {
        spawnPickup(enemy.x, enemy.y);
      }
      
            if (gameState.kills === 1) unlockAchievement('firstBlood');
      if (gameState.killStreak === 5) unlockAchievement('killStreak');
      if (gameState.maxCombo >= 10) unlockAchievement('comboKing');
      if (gameState.wave >= 10) unlockAchievement('wavemaster');
      if (gameState.totalDamageDealt >= 10000) unlockAchievement('damageDealer');
      if (gameState.allies.length >= 3) unlockAchievement('allySavior');
      if (Object.keys(gameState.weaponKills).length >= 5) unlockAchievement('weaponMaster');
      if (gameState.wavesSurvived >= 20) unlockAchievement('survivalKing');
      if (gameState.headshots >= 10) unlockAchievement('criticalHit');
      
      return false;
    }
    
    if (!enemy.frozen && !enemy.stunned) {
            const target = enemy.ally ? null : gameState.player;
      if (target && !enemy.ally) {
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * (enemy.speed || 2);
        enemy.y += (dy / dist) * (enemy.speed || 2);
      }
      
            if (gameState.gravityPoint) {
        const dx = gameState.gravityPoint.x - enemy.x;
        const dy = gameState.gravityPoint.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * gameState.gravityPoint.strength;
        enemy.y += (dy / dist) * gameState.gravityPoint.strength;
      }
      
            const dx = enemy.x - gameState.player.x;
      const dy = enemy.y - gameState.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30 && !enemy.ally) {
        const now = Date.now();
        if (!gameState.invincible && !gameState.godMode && (now - gameState.player.lastDamageTime > 500)) {
          gameState.hp -= enemy.damage || 10;
          gameState.player.lastDamageTime = now;
          gameState.killStreak = 0;           if (gameState.hp <= 0) {
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
    
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      return false;
    }
    
        let hit = false;
    gameState.enemies.forEach(enemy => {
      if (enemy.ally) return;
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
                const isCrit = Math.random() < 0.15;
        let damage = bullet.damage;
        if (isCrit) {
          damage *= 2;
          gameState.headshots++;
          createParticles(bullet.x, bullet.y, '#ff00ff', 8);
          showNotification(`🎯 CRITICAL HIT! ${Math.floor(damage)}!`);
        }
        
        gameState.totalDamageDealt += damage;
        enemy.hp -= damage;
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
    gameState.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 30;
    ctx.fillRect(p.x, p.y, 3, 3);
  });
  ctx.globalAlpha = 1;
  
    gameState.bullets.forEach(bullet => {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
    gameState.enemies.forEach(enemy => {
    const enemySize = enemy.isBoss ? 50 : 15;
    ctx.fillStyle = enemy.ally ? '#00ff00' : (enemy.frozen ? '#88ccff' : (enemy.isBoss ? '#ff00ff' : '#ff0000'));
    ctx.globalAlpha = enemy.hidden ? 0.4 : 1;
    
    if (enemy.isBoss) {
            ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Date.now() / 500);
      ctx.fillRect(-enemySize/2, -enemySize/2, enemySize, enemySize);
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 4;
      ctx.strokeRect(-enemySize/2, -enemySize/2, enemySize, enemySize);
      ctx.restore();
      
            ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('👑 BOSS 👑', enemy.x, enemy.y - 70);
    } else {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemySize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
        const barWidth = enemy.isBoss ? 80 : 30;
    const barY = enemy.isBoss ? -65 : -25;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(enemy.x - barWidth/2, enemy.y + barY, barWidth, enemy.isBoss ? 5 : 3);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(enemy.x - barWidth/2, enemy.y + barY, barWidth * (enemy.hp / enemy.maxHp), enemy.isBoss ? 5 : 3);
  });
  
    ctx.save();
  ctx.translate(gameState.player.x, gameState.player.y);
  ctx.rotate(gameState.player.angle);
  
    const size = 40;
  
    ctx.fillStyle = '#ffffff';
  ctx.fillRect(-size/2 - 3, -size/2 - 3, size + 6, size + 6);
  
    ctx.fillStyle = '#00ff00';
  ctx.fillRect(-size/2, -size/2, size, size);
  
    ctx.fillStyle = '#000000';
  ctx.fillRect(-size/4, -size/4, size/2, size/2);
  
    ctx.fillStyle = '#ffff00';
  ctx.fillRect(size/2, -4, 20, 8);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(size/2, -4, 20, 8);
  
  ctx.restore();
  
    gameState.allies.forEach((ally, i) => {
    ctx.fillStyle = ally.type === 'medic' ? '#00ff00' : ally.type === 'tank' ? '#0088ff' : '#ff8800';
    ctx.fillRect(ally.x - 12, ally.y - 12, 24, 24);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(ally.x - 12, ally.y - 12, 24, 24);
    
        ctx.fillStyle = '#ff0000';
    ctx.fillRect(ally.x - 12, ally.y - 20, 24, 3);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(ally.x - 12, ally.y - 20, 24 * (ally.hp / ally.maxHp), 3);
    
        if (gameState.aiControlledAllies) {
      ctx.fillStyle = '#ffff00';
      ctx.font = '8px Arial';
      ctx.fillText('AI', ally.x - 8, ally.y - 25);
    }
  });
  
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
  
    gameState.pickups.forEach(pickup => {
    const p = PICKUPS[pickup.type];
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, pickup.x, pickup.y);
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
  
    if (gameState.bossWave) {
    const bossX = canvas.width / 2;
    const bossY = 50;
    gameState.enemies.push({
      x: bossX,
      y: bossY,
      type: 'boss',
      hp: 500 + gameState.wave * 100,
      maxHp: 500 + gameState.wave * 100,
      speed: 1,
      damage: 50 + gameState.wave * 5,
      reward: 500 + gameState.wave * 50,
      isBoss: true,
      size: 50
    });
    playSound('achievement');
    return;
  }
  
    const specialWave = rollSpecialWave();
  if (specialWave) {
    if (specialWave.type === 'berserk') count = specialWave.enemies;
    gameState.scoreMultiplier = specialWave.bonus || 1;
  } else {
    gameState.scoreMultiplier = 1;
  }
  
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
    
    let hp = stats.hp + gameState.wave * 10;
    let speed = stats.speed + gameState.wave * 0.1;
    
        if (specialWave && specialWave.type === 'stealth') {
      hp *= 0.7;
      speed *= 1.5;
    }
    
    gameState.enemies.push({
      x, y,
      type: enemyType,
      hp: hp,
      maxHp: hp,
      speed: speed,
      damage: stats.damage + gameState.wave,
      reward: stats.reward,
      hidden: specialWave && specialWave.type === 'stealth'
    });
  }
  
    const chestCount = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < chestCount; i++) {
    gameState.chests.push({
      x: Math.random() * (canvas.width - 100) + 50,
      y: Math.random() * (canvas.height - 100) + 50,
      opened: false,
      size: 30
    });
  }
  
    if (Math.random() < 0.5) {
    spawnPickup(
      Math.random() * (canvas.width - 100) + 50,
      Math.random() * (canvas.height - 100) + 50
    );
  }
}

function nextWave() {
  gameState.wave++;
  gameState.wavesSurvived++;
  gameState.gold += 100 * gameState.wave * gameState.scoreMultiplier;
  gameState.upgradePoints++;     if (gameState.wave > gameState.wavesToWin) {
    showVictory();
    return;
  }
  
    if (gameState.wave % 5 === 0) {
    gameState.bossWave = true;
    showNotification(`🔥 BOSS WAVE ${gameState.wave}! 🔥`, '#ff0000');
  }
  
    if (gameState.domains.jackpotCarryover > 0) {
    activateDomain(4, gameState.domains.jackpotCarryover * 1000);
    gameState.domains.jackpotCarryover = 0;
  }
  
  setTimeout(() => spawnWave(gameState.bossWave ? 1 : 7), 2000);
  gameState.bossWave = false;
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
  
    if (!gameState.hasAdminAccess) {
    log('ADMIN NOT UNLOCKED! Cost: 10000 coins');
    return;
  }
  
  const parts = cmd.split(' ');
  const command = parts[0];
  const arg = parts[1];
  
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
  
    const comboEl = document.getElementById('comboText');
  if (comboEl) {
    if (gameState.comboCount > 0) {
      comboEl.textContent = `x${gameState.comboCount} COMBO!`;
      comboEl.style.color = gameState.comboCount >= 10 ? '#ff00ff' : '#ffff00';
    } else {
      comboEl.textContent = '';
    }
  }
  
    const streakEl = document.getElementById('streakText');
  if (streakEl) {
    if (gameState.killStreak > 0) {
      streakEl.textContent = gameState.killStreak > 5 ? `🔥x${gameState.killStreak}` : `x${gameState.killStreak}`;
      streakEl.style.color = gameState.killStreak >= 5 ? '#ff0000' : '#ffaa00';
    } else {
      streakEl.textContent = '';
    }
  }
  
  const allyCount = gameState.allies.filter(a => a.hp > 0).length;
  document.getElementById('alliesText').textContent = `${allyCount}/${gameState.maxAllies}`;
  
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
  
    const shopGold = document.getElementById('shopGold');
  if (shopGold) shopGold.textContent = gameState.gold;
  
    updateMenuCoins();
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
  updateEquipButtonVisibility();
  
    const savedData = JSON.parse(localStorage.getItem('tankGameSave') || '{}');
  const totalGold = (savedData.gold || 0) + gameState.gold;
  
    savedData.gold = totalGold;
  savedData.totalKills = (savedData.totalKills || 0) + gameState.kills;
  savedData.bestWave = Math.max(savedData.bestWave || 0, gameState.wave);
  localStorage.setItem('tankGameSave', JSON.stringify(savedData));
  
  document.getElementById('finalWave').textContent = gameState.wave;
  document.getElementById('finalGold').textContent = gameState.gold;
  document.getElementById('finalKills').textContent = gameState.kills;
  document.getElementById('gameover').style.display = 'flex';
  document.getElementById('game').style.display = 'none';
  
  showNotification(`💰 Earned ${gameState.gold} coins! Total: ${totalGold}`, '#ffff00');
}

function showVictory() {
  gameState.running = false;
  updateEquipButtonVisibility();
  
    const winBonus = 5000;
  gameState.gold += winBonus;
  
  const savedData = JSON.parse(localStorage.getItem('tankGameSave') || '{}');
  const totalGold = (savedData.gold || 0) + gameState.gold;
  
  savedData.gold = totalGold;
  savedData.wins = (savedData.wins || 0) + 1;
  localStorage.setItem('tankGameSave', JSON.stringify(savedData));
  
  alert(`🎉 YOU WON! 🎉\n\nWave: ${gameState.wave}\nKills: ${gameState.kills}\nCoins Earned: ${gameState.gold}\nWin Bonus: ${winBonus}\n\nTotal Coins: ${totalGold}`);
  
    document.getElementById('game').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
}

let miniGameState = {
  active: false,
  score: 0,
  coins: [],
  player: { x: 300, y: 350, width: 30, height: 30 },
  gameRunning: false,
  miniGameCanvas: null,
  miniGameCtx: null
};

let miniGameMouseListener = null;

function startMiniGame() {
  miniGameState.active = true;
  miniGameState.score = 0;
  miniGameState.coins = [];
  miniGameState.gameRunning = true;
  miniGameState.miniGameCanvas = document.getElementById('miniGameCanvas');
  miniGameState.miniGameCtx = miniGameState.miniGameCanvas.getContext('2d');
  
  for (let i = 0; i < 5; i++) {
    miniGameState.coins.push({
      x: Math.random() * 550 + 25,
      y: Math.random() * 300,
      width: 15,
      height: 15,
      value: 10
    });
  }
  
  miniGameMouseListener = (e) => {
    const rect = miniGameState.miniGameCanvas.getBoundingClientRect();
    miniGameState.player.x = e.clientX - rect.left;
  };
  
  miniGameState.miniGameCanvas.addEventListener('mousemove', miniGameMouseListener);
  miniGameLoop();
}

function stopMiniGame() {
  miniGameState.active = false;
  miniGameState.gameRunning = false;
  if (miniGameMouseListener && miniGameState.miniGameCanvas) {
    miniGameState.miniGameCanvas.removeEventListener('mousemove', miniGameMouseListener);
  }
}

function miniGameLoop() {
  if (!miniGameState.active) return;
  
  const ctx = miniGameState.miniGameCtx;
  
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 600, 400);
  
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(miniGameState.player.x - 15, miniGameState.player.y, 30, 30);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(miniGameState.player.x - 15, miniGameState.player.y, 30, 30);
  
  for (let i = miniGameState.coins.length - 1; i >= 0; i--) {
    const coin = miniGameState.coins[i];
    coin.y += 2;
    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (coin.y > miniGameState.player.y - 20 &&
        coin.y < miniGameState.player.y + 30 &&
        coin.x > miniGameState.player.x - 20 &&
        coin.x < miniGameState.player.x + 20) {
      miniGameState.score += coin.value;
      miniGameState.coins.splice(i, 1);
      document.getElementById('miniGameScore').textContent = miniGameState.score;
      playSound('coin');
      continue;
    }
    
    if (coin.y > 400) {
      miniGameState.coins.splice(i, 1);
    }
  }
  
  if (miniGameState.coins.length < 5 && Math.random() < 0.05) {
    miniGameState.coins.push({
      x: Math.random() * 550 + 25,
      y: -15,
      width: 15,
      height: 15,
      value: 10
    });
  }
  
  ctx.fillStyle = '#fff';
  ctx.font = '16px Aptos Display';
  ctx.fillText(`SCORE: ${miniGameState.score}`, 20, 30);
  
  if (miniGameState.gameRunning) {
    requestAnimationFrame(miniGameLoop);
  }
}

loadGameData();
updateAdminButtons();
updateBadges();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAvatarShop);
} else {
  initAvatarShop();
}

console.log('Game loaded! Press Start to begin.');
console.log('Press ~ to open admin console. Use "setlevel 3" for dev access.');