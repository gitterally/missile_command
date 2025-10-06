// --- DOM ELEMENTS ---
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
const resetButton = document.querySelector("#reset-button");
const restartButton = document.querySelector("#restart-button");
const pauseButton = document.querySelector("#pause-button");
const customLevelGoButton = document.querySelector("#custom-level-go");

// --- GAME CONSTANTS ---
const canvasWidth = 1280;
const canvasHeight = 720;
const SILO_HIT_LIMIT = 5;
const SILO_WIDTH = 100;
const SILO_HEIGHT = 10;
const BASE_ENEMY_SPEED = 60; // px/sec
const SPEED_INCREMENT_PER_LEVEL = 0.1;
const BASE_SCORE_PER_LEVEL = 100;

// --- GAME STATE ---
let gameState = {
  gameStarted: false,
  gamePaused: false,
  gameOver: false,
  animationId: null,
  score: 0,
  kills: 0,
  missilesFired: 0,
  level: 1,
  speed: BASE_ENEMY_SPEED,
  maxMissilesPerSilo: 20,
  scoreForNextLevel: BASE_SCORE_PER_LEVEL,
  scoreAtLevelStart: 0,
  levelUpToggle: true,
  mouse: { x: 0, y: 0 },
  screenShake: {
    magnitude: 0,
    duration: 0,
    startTime: 0,
  },
  powerUp: {
    active: false,
    type: null,
    endTime: 0,
    duration: 10000, // 10 seconds
    nextSpawnTime: 0, // Earliest time a new power-up can spawn
  },
  lastPassiveScoreTime: 0,
  lastTime: 0,
  nextSpawnTime: 0,
};

let enemies = [];
let powerUps = [];
let missiles = [];
let explosions = [];
let floatingTexts = [];
let levelUpNotification;
let warningSystem;
let silos = [];

// --- UTILITY FUNCTIONS ---
function resizeGame() {
  const gameWrapper = document.getElementById("game-wrapper");
  const nativeAspectRatio = canvasWidth / canvasHeight;
  const windowAspectRatio = window.innerWidth / window.innerHeight;

  let newWidth, newHeight;

  if (windowAspectRatio > nativeAspectRatio) {
    // Window is wider than the game, so height is the limiting factor
    newHeight = window.innerHeight * 0.90; // Use 98% of window height for a small margin
    newWidth = newHeight * nativeAspectRatio;
  } else {
    // Window is taller than the game, so width is the limiting factor
    newWidth = window.innerWidth * 0.95; // Use 98% of window width
    newHeight = newWidth / nativeAspectRatio;
  }

  gameWrapper.style.width = `${newWidth}px`;
  gameWrapper.style.height = `${newHeight}px`;
}

function diffScale() {
  // Speed now scales logarithmically, so the increase tapers off at higher levels.
  gameState.speed = BASE_ENEMY_SPEED + 100.0 * Math.log10(gameState.level);
  // The number of missiles gained also scales back at higher levels.
  gameState.maxMissilesPerSilo = 20 + Math.floor(Math.log10(gameState.level)*10);
}

// Function to flash the screen
function flashScreen(times, color, duration) {
  let count = 0;
  const interval = setInterval(() => {
    if (count % 2 === 0) {
      canvas.style.backgroundColor = color;
    } else {
      canvas.style.backgroundColor = "black";
    }

    count++;

    if (count === times * 2) {
      clearInterval(interval);
      canvas.style.backgroundColor = "black";
    }
  }, duration);
}

function triggerScreenShake(magnitude, duration) {
  gameState.screenShake.magnitude = magnitude;
  gameState.screenShake.duration = duration;
  gameState.screenShake.startTime = Date.now();
}

class WarningSystem {
  constructor() {
    this.lowMissileWarning = false;
    this.siloDownWarning = false;
  }

  update() {
    // Calculate total remaining missiles across all operational silos
    let totalMissilesLeft = 0;
    const operationalSilos = silos.filter((silo) => !silo.isDestroyed);
    operationalSilos.forEach((silo) => {
      totalMissilesLeft += gameState.maxMissilesPerSilo - silo.missileCount;
    });

    this.lowMissileWarning =
      totalMissilesLeft <= 10 && operationalSilos.length > 0;

    // Check if at least one silo is down, but not all of them
    const destroyedSiloCount = silos.filter((silo) => silo.isDestroyed).length;
    this.siloDownWarning =
      destroyedSiloCount > 0 && destroyedSiloCount < silos.length;

    if (this.lowMissileWarning || this.siloDownWarning) {
      canvas.classList.add("flashing-border");
    } else {
      canvas.classList.remove("flashing-border");
    }
  }

  draw() {
    const time = Date.now() / 500; // Controls flash speed
    if (Math.sin(time * Math.PI) < 0) return; // Flash on/off

    c.font = "bold 32px Arial";
    c.fillStyle = "red";
    c.textAlign = "center";

    if (this.lowMissileWarning) {
      c.fillText("LOW AMMO", canvasWidth / 2, 50);
    } else if (this.siloDownWarning) {
      c.fillText("SILO DOWN", canvasWidth / 2, 50);
    }
    c.textAlign = "left"; // Reset alignment
  }
}

function drawPowerUpBorder() {
  if (!gameState.powerUp.active) return;

  const timeRemaining = gameState.powerUp.endTime - Date.now();
  if (timeRemaining <= 0) {
    gameState.powerUp.active = false;
    return;
  }

  // --- Constant Speed Depletion Logic ---
  const timeElapsed = gameState.powerUp.duration - timeRemaining;
  const perimeter = canvasWidth * 2 + canvasHeight * 2; // Full perimeter
  const depletionRate = perimeter / (gameState.powerUp.duration / 1000); // pixels per second
  const pixelsDepleted = depletionRate * (timeElapsed / 1000);

  const topHalfWidth = canvasWidth / 2;
  const rightHeight = canvasHeight;
  const bottomWidth = canvasWidth;
  const leftHeight = canvasHeight;
  // The final segment is the other half of the top
  const borderWidth = 5;

  // Flashing color
  const time = Date.now() / 150;
  c.fillStyle = Math.sin(time) > 0 ? "#FFD700" : "#FFA500";

  // Define the segments and their lengths
  const segments = [
    { length: topHalfWidth, draw: (p) => c.fillRect(canvasWidth / 2, 0, p, borderWidth) }, // Top-Right
    { length: rightHeight, draw: (p) => c.fillRect(canvasWidth - borderWidth, 0, borderWidth, p) }, // Right
    { length: bottomWidth, draw: (p) => c.fillRect(canvasWidth - p, canvasHeight - borderWidth, p, borderWidth) }, // Bottom
    { length: leftHeight, draw: (p) => c.fillRect(0, canvasHeight - p, borderWidth, p) }, // Left
    { length: topHalfWidth, draw: (p) => c.fillRect(0, 0, p, borderWidth) }, // Top-Left
  ];

  let pixelsToDraw = perimeter - pixelsDepleted;

  for (const segment of segments) {
    if (pixelsToDraw <= 0) break;

    const lengthToDraw = Math.min(pixelsToDraw, segment.length);
    segment.draw(lengthToDraw);
    pixelsToDraw -= segment.length;
  }
}

class PowerUp {
  constructor(x, y, dirX, dirY) {
    this.x = x;
    this.y = y;
    this.radius = canvasWidth / 333; // Same size as a special meteor
    this.dirX = dirX;
    this.dirY = dirY;
    // Power-ups move at a slow, constant speed relative to base enemy speed
    const powerUpSpeed = gameState.speed * 0.4;
    this.velocity = powerUpSpeed;
    this.type = "doubleExplosion";
    this.baseColor = "#FFD700"; // Gold
    this.flashColor = "#FFFFFF"; // White
    this.color = this.baseColor;
  }

  draw() {
    // Flashing effect
    const time = Date.now() / 150;
    this.color = Math.sin(time) > 0 ? this.baseColor : this.flashColor;

    c.save();
    c.fillStyle = this.color;
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "white";
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }

  update(dt) {
    this.x += this.dirX * dt;
    this.y += this.dirY * dt;
  }
}
// --- CLASSES ---

class Silo {
  constructor(x) {
    this.x = x;
    this.y = canvasHeight - SILO_HEIGHT;
    this.width = SILO_WIDTH;
    this.height = SILO_HEIGHT;
    this.missileCount = 0;
    this.maxHealth = 10000;
    this.health = this.maxHealth;
    this.isDestroyed = false;
  }

  draw(color = "grey") {
    if (this.isDestroyed) return;

    const domeRadius = this.width / 10;

    const missilesLeft = gameState.maxMissilesPerSilo - this.missileCount;
    let textContent = "Missiles: " + missilesLeft;
    let textColor = "white";

    if (missilesLeft <= 0) {
      textContent = "NO AMMO";
      const time = Date.now() / 200; // Fast flash speed
      if (Math.sin(time * Math.PI) > 0) {
        textColor = "red";
      }
    } else if (missilesLeft <= 5) {
      // When 3 or fewer missiles are left, flash the count text red slowly.
      const time = Date.now() / 1000; // Time in seconds
      if (Math.sin(time * Math.PI) > 0) {
        // Flash every second
        textColor = "red";
      }
    }

    // Draw missile count
    c.textAlign = "center";
    c.font = "20px Arial";
    c.fillStyle = textColor;
    c.fillText(textContent, this.x + this.width / 2, this.y - 20);
    c.textAlign = "left"; // Reset alignment

    // Draw life bar
    const lifeIndicatorHeight = 10;
    const lifeIndicatorWidth = this.width * (this.health / this.maxHealth);
    c.fillStyle = "green";
    c.fillRect(this.x, this.y, lifeIndicatorWidth, lifeIndicatorHeight);

    // Draw health text on the bar
    c.font = "12px Arial";
    c.fillStyle = "white";
    c.textAlign = "center";
    c.fillText(
      `${Math.round(this.health)}/${this.maxHealth}`,
      this.x + this.width / 2,
      this.y + lifeIndicatorHeight - 1
    );
    c.textAlign = "left"; // Reset alignment

    // Draw silo base and dome
    c.save();
    c.fillStyle = color;
    c.fillRect(this.x, this.y - 10, this.width, this.height);

    const domeCenterX = this.x + this.width / 2;
    const domeCenterY = this.y - 10;
    c.beginPath();
    c.arc(domeCenterX, domeCenterY, domeRadius, 0, Math.PI, true);
    c.closePath();
    c.fill();
    c.restore();
  }

  takeDamage(amount) {
    if (this.isDestroyed) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
    }
    return true;
  }

  repair() {
    if (this.health < this.maxHealth) {
      // Restore 25% of max health on level up
      this.health += 2500;
      if (this.health > this.maxHealth) this.health = this.maxHealth;
      this.isDestroyed = false;
    }
  }

  reset() {
    this.missileCount = 0;
    this.health = this.maxHealth;
    this.isDestroyed = false;
  }
}

function checkEnemySiloCollision(enemy, returnSilo = false) {
  let silo1Hit = false;
  let silo2Hit = false;
  let silo3Hit = false;
  let wasHit = false;
  let hitSilo = null;

  silos.forEach((silo) => {
    if (silo.isDestroyed) return;

    const enemyBottomY = enemy.y + enemy.radius;
    const enemyLeftX = enemy.x - enemy.radius;
    const enemyRightX = enemy.x + enemy.radius;

    if (
      enemyBottomY >= silo.y - 10 &&
      enemyLeftX <= silo.x + silo.width &&
      enemyRightX >= silo.x
    ) {
      wasHit = true;
      hitSilo = silo;
    }
  });
  return returnSilo ? hitSilo : wasHit;
}

function updateUI() {
  const scoreDisplay = document.getElementById("score");
  scoreDisplay.textContent = "SCORE: " + gameState.score.toString();
  const missileLaunched = document.getElementById("missiles");
  missileLaunched.textContent =
    "MISSILES FIRED: " + gameState.missilesFired.toString();
  const level = document.getElementById("difficulty");
  level.textContent = "LEVEL: " + gameState.level.toString();
  const ratio =
    gameState.missilesFired === 0
      ? 0
      : (gameState.kills / gameState.missilesFired) * 100;
  document.getElementById("killR").textContent =
    "KILL RATIO: " + ratio.toFixed(2) + " %";

  const nextLevelProgressDisplay = document.getElementById(
    "next-level-progress"
  );
  const scoreInCurrentLevel = gameState.score - gameState.scoreAtLevelStart;
  const scoreRemaining = Math.max(
    0,
    Math.round(gameState.scoreForNextLevel - scoreInCurrentLevel)
  );
  nextLevelProgressDisplay.textContent = `NEXT LVL IN: ${scoreRemaining} PTS`;

  // Update the progress bar
  const scoreNeededForLevel = gameState.scoreForNextLevel;
  const progressPercentage = (scoreInCurrentLevel / scoreNeededForLevel) * 100;

  const progressBar = document.getElementById("level-progress-bar");
  progressBar.style.width = `${progressPercentage}%`;
}

function checkLevelUp() {
  if (
    gameState.score - gameState.scoreAtLevelStart >=
    gameState.scoreForNextLevel
  ) {
    gameState.level++;
    gameState.scoreAtLevelStart = gameState.score;
    gameState.scoreForNextLevel = calculateScoreNeededForLevel(gameState.level);
    diffScale();
    levelUpNotification.show(gameState.level);
    silos.forEach((silo) => {
      silo.missileCount = 0; // Refill ammo
      silo.repair(); // Repair one level of damage
    });
    //playLevelledUpSound(1);
    //playLevelledUpSound(1);
    soundManager.play("levelUp");
  }
}

//class constructors
class Missile {
  constructor(targetX, targetY, startX, startY, colour) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.colour = colour;
    // Missile speed now scales logarithmically with the level, just like enemies.
    this.speed = gameState.speed * 4; // Missiles are 4x faster than base enemies
    this.dx = -targetX + startX;
    this.dy = -targetY + startY;
    this.trail = new Trail();
    this.powerUpEffects = []; // To store effects active at launch
  }

  draw() {
    const length = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    const Dx = this.dx / length;
    const Dy = this.dy / length;

    const endX = this.x + (Dx * canvasWidth) / 100;
    const endY = this.y + (Dy * canvasWidth) / 100;

    this.trail.draw();

    c.beginPath();
    c.moveTo(this.x, this.y);
    c.lineTo(endX, endY);
    c.lineWidth = canvasWidth / 600;
    c.strokeStyle = this.colour;
    c.stroke();
  }

  update(dt) {
    // Update missile position based on the target position
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const travelDistance = this.speed * dt;

    if (distance < travelDistance) {
      return { x: this.targetX, y: this.targetY };
    }

    const unitX = dx / distance;
    const unitY = dy / distance;

    this.x += unitX * travelDistance;
    this.y += unitY * travelDistance;

    this.trail.emitMissileTrail(this.x, this.y);
    this.trail.update();

    this.draw();

    return null;
  }
}

class Enemy {
  constructor(x, y, radius, dirX, dirY, color, type = "normal") {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = gameState.speed;
    this.dirX = dirX;
    this.dirY = dirY;
    this.baseColor = color; // Store the original color
    this.color = this.baseColor;
    this.type = type;
    this.maxHealth = this.type === "meteor" ? 2000 : 1000;
    this.health = this.maxHealth;
    this.trail = new Trail();
  }

  draw() {
    // Calculate color based on health percentage
    const healthPercentage = this.health / this.maxHealth;
    this.color = this.interpolateColor(
      this.baseColor,
      "#FF0000",
      1 - healthPercentage
    );

    // Draw the enemy
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();

    this.trail.draw();
  }

  interpolateColor(color1, color2, factor) {
    const c1 = {
      r: parseInt(color1.slice(1, 3), 16),
      g: parseInt(color1.slice(3, 5), 16),
      b: parseInt(color1.slice(5, 7), 16),
    };
    const c2 = {
      r: parseInt(color2.slice(1, 3), 16),
      g: parseInt(color2.slice(3, 5), 16),
      b: parseInt(color2.slice(5, 7), 16),
    };
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r},${g},${b})`;
  }

  update(dt) {
    // Update enemy position
    this.x += this.dirX * dt;
    this.y += this.dirY * dt;
    this.trail.emitEnemyTrail(this.x, this.y);
    this.trail.update();
    this.draw();
  }

  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }
}

class TrailParticle {
  constructor(x, y, width, height, color, transparency) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.transparency = transparency;
  }

  draw() {
    c.globalAlpha = this.transparency;
    c.fillStyle = this.color;
    c.fillRect(this.x, this.y, this.width, this.height);
    c.globalAlpha = 1;
  }
}

class Trail {
  constructor() {
    this.particles = [];
  }

  emitEnemyTrail(x, y) {
    const width = canvasWidth / 500;
    const height = canvasWidth / 500;
    const numParticles = 3;
    const color = "rgba(255, 165, 0, 0.5)";

    for (let i = 0; i < numParticles; i++) {
      const transparency = 0.2;
      const particle = new TrailParticle(
        x,
        y,
        width,
        height,
        color,
        transparency
      );
      this.particles.push(particle);
    }
  }

  emitMissileTrail(x, y) {
    const width = 3;
    const height = 3;
    const numParticles = 2;
    const color = "yellow";

    for (let i = 0; i < numParticles; i++) {
      const transparency = 0.2;
      const particle = new TrailParticle(
        x,
        y,
        width,
        height,
        color,
        transparency
      );
      this.particles.push(particle);
    }
  }

  update() {
    this.particles.forEach((particle) => {
      particle.transparency -= 0.005;
    });
    this.particles = this.particles.filter(
      (particle) => particle.transparency > 0
    );
  }

  draw() {
    this.particles.forEach((particle) => {
      particle.draw();
    });
  }
}

class FloatingText {
  constructor(x, y, value, color = "white", size = 20) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.color = color;
    this.size = size;
    this.alpha = 1;
    this.velocity = -1; // Moves upwards
    this.lifespan = 60; // 60 frames = 1 second
  }

  draw() {
    c.save();
    c.globalAlpha = this.alpha;
    c.fillStyle = this.color;
    c.font = `${this.size}px Arial`;
    c.fillText(this.value, this.x, this.y);
    c.restore();
  }

  update() {
    this.y += this.velocity;
    this.lifespan--;
    this.alpha = this.lifespan / 60; // Fade out over its lifespan
    this.draw();
  }
}

class LevelUpNotification {
  constructor() {
    this.text = "";
    this.alpha = 0;
    this.lifespan = 0;
    this.maxLifespan = 120; // 2 seconds
  }

  show(level) {
    this.text = `LEVEL ${level}`;
    this.alpha = 1;
    this.lifespan = this.maxLifespan;
  }

  update() {
    if (this.lifespan > 0) {
      this.lifespan--;
      // Fade out in the last half of its life
      if (this.lifespan < this.maxLifespan / 2) {
        this.alpha = this.lifespan / (this.maxLifespan / 2);
      }
      this.draw();
    }
  }

  draw() {
    if (this.alpha <= 0) return;
    c.save();
    c.globalAlpha = this.alpha;
    c.fillStyle = "white";
    c.font = "bold 48px Arial";
    c.textAlign = "center";
    c.fillText(this.text, canvasWidth / 2, canvasHeight / 2);
    c.restore();
  }
}

class Explosion {
  constructor(
    x,
    y,
    radius,
    maxRadius,
    color,
    duration,
    chainDepth = 0,
    damagesSilos = false,
    baseDamage = 0
  ) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxRadius = maxRadius;
    this.color = color;
    this.baseDamage = baseDamage;
    // Calculate duration so expansion speed is 110% of enemy speed
    const targetSpeedPxPerFrame = 5; // Constant explosion speed
    this.elapsedTime = 0;
    this.chainDepth = chainDepth;
    this.damagesSilos = damagesSilos;
    this.hitSilos = []; // Track which silos have been hit by this explosion
    this.hitEnemies = []; // Track which enemies have been hit by this explosion
    this.enemiesHitCount = 0; // For multi-kill bonus
    this.shockwaveRadius = 0;
    this.shockwaveMaxRadius = this.maxRadius; // Shockwave expands to the explosion's limit
    this.expansionRate = 250; // pixels per second (slower rate = longer duration)
    this.duration = this.maxRadius / this.expansionRate; // in seconds
    this.shockwaveDuration = this.duration / 4; // Shockwave is very fast, lasts 1/4 of the explosion time
  }

  draw() {
    const fadeAlpha = Math.max(0, 1 - this.elapsedTime / this.duration);
    // Draw main explosion with transparency
    c.save();
    c.globalAlpha = 0.75 * fadeAlpha;
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.restore();

    // Draw a more dramatic, fading shockwave
    if (this.elapsedTime < this.shockwaveDuration) {
      const shockwaveAlpha = Math.max(
        0,
        1 - this.elapsedTime / this.shockwaveDuration
      );
      c.beginPath();
      c.arc(this.x, this.y, this.shockwaveRadius, 0, Math.PI * 2, false);
      c.strokeStyle = `rgba(255, 255, 255, ${shockwaveAlpha})`;
      c.lineWidth = 10; // More pronounced shockwave
      c.stroke();
    }
  }

  update(dt) {
    this.elapsedTime += dt;

    // Explosion now expands over its entire duration
    this.radius = this.elapsedTime * this.expansionRate;

    // Update shockwave radius only during its active duration
    if (this.elapsedTime < this.shockwaveDuration) {
      this.shockwaveRadius =
        (this.elapsedTime / this.shockwaveDuration) * this.shockwaveMaxRadius;
    }
    if (this.radius > this.maxRadius) this.radius = this.maxRadius;
    this.draw();
  }
}

//Game Logic

// function enemyDir() {
//   const rand = Math.random();
//   const LR = Math.random() < 0.5 ? -1 : 1;
//   const speedy = speed * (0.9 + 0.2 * Math.random());
//   const dirY = Math.sqrt(1 - Math.pow(rand, 2)) * speedy;

//   const x = Math.max(10, Math.random() * (canvasWidth - 20));
//   const distanceToCenter = Math.abs(x - canvasWidth / 2);
//   const dirX = LR * (1 - distanceToCenter / (canvasWidth / 2)) * speedy;

//   return [x, dirX, dirY];
// }

function enemyDir() {
  let startX = Math.random() * (canvasWidth - 20) + 10;
  let endX = Math.random() * canvasWidth;

  // 1% chance to spawn a power-up instead of an enemy
  if (Math.random() < 0.01 && Date.now() > gameState.powerUp.nextSpawnTime) {
    const endXPowerUp = Math.random() * canvasWidth;
    const dx = endXPowerUp - startX;
    const dy = canvasHeight;
    const length = Math.sqrt(dx * dx + dy * dy);
    const powerUpSpeed = gameState.speed * 0.4; // Slower speed for power-ups
    const dirX = (dx / length) * powerUpSpeed;
    const dirY = (dy / length) * powerUpSpeed;
    const powerUp = new PowerUp(startX, 1, dirX, dirY);
    powerUps.push(powerUp);
    return null; // Don't spawn an enemy this time
  }

  // Chance to spawn a "Meteor" enemy
  if (Math.random() < 0.1) {
    // 10% chance
    const meteorSpeedMultiplier = 0.6 + Math.random() * 0.2; // 60% to 80% of base speed
    const dx = endX - startX;
    const dy = canvasHeight;
    const length = Math.sqrt(dx * dx + dy * dy);
    const dirX = (dx / length) * gameState.speed * meteorSpeedMultiplier;
    const dirY = (dy / length) * gameState.speed * meteorSpeedMultiplier;
    return { startX, dirX, dirY, type: "meteor", color: "#9370DB" }; // Base purple for flashing
  }

  // Normal enemy logic
  const normalSpeedMultiplier = 0.9 + Math.random() * 0.2; // 90% to 110% of base speed
  const dx = endX - startX;
  const dy = canvasHeight;
  const length = Math.sqrt(dx * dx + dy * dy);
  const Dx = dx / length;
  const Dy = dy / length;
  const dirX = Dx * gameState.speed * normalSpeedMultiplier;
  const dirY = Dy * gameState.speed * normalSpeedMultiplier;
  return { startX, dirX, dirY, type: "normal", color: "#FFA500" }; // Orange
}

//enemy code
function createEnemy() {
  const dir = enemyDir();
  if (dir) {
    // Only create an enemy if enemyDir() returned enemy data
    const enemy = new Enemy(
      dir.startX,
      1,
      dir.type === "meteor" ? canvasWidth / 333 : canvasWidth / 500, // Meteors are ~50% larger
      dir.dirX,
      dir.dirY,
      dir.color,
      dir.type
    );
    enemies.push(enemy);
  }
}

//missile code

function createMissile(x, y) {
  // Define positions and validity status for each silo
  const availableSilos = silos.filter(
    (silo) =>
      !silo.isDestroyed && silo.missileCount < gameState.maxMissilesPerSilo
  );

  if (availableSilos.length === 0) return;

  const distances = availableSilos.map((silo) =>
    Math.abs(x - (silo.x + silo.width / 2))
  );

  // Find the index of the nearest silo
  const nearestIndex = distances.indexOf(Math.min(...distances));
  const nearestSilo = availableSilos[nearestIndex];

  const missileStartY = canvasHeight - 20;
  const missileColour = "white";

  // Create missile at the position of the nearest valid silo
  const missile = new Missile(
    x,
    y,
    nearestSilo.x + nearestSilo.width / 2,
    missileStartY,
    missileColour
  );
  missiles.push(missile);

  // "Tag" the missile if the doubleExplosion power-up is active at launch
  if (gameState.powerUp.active && gameState.powerUp.type === 'doubleExplosion') {
    missile.powerUpEffects.push('doubleExplosion');
  }

  nearestSilo.missileCount++;
  gameState.missilesFired++;
  updateUI();
  //playMissileLaunchedSound(1);
  soundManager.play("missileLaunch", 0.5);
}

function animateMissile(dt) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const missile = missiles[i];
    const explosionPosition = missile.update(dt);
    if (explosionPosition) {
      // Player explosions are chainDepth 0
      let radius = 160;
      if (missile.powerUpEffects.includes('doubleExplosion')) {
        radius *= 2;
      }
      createExplosion(
        explosionPosition.x,
        explosionPosition.y,
        "orange",
        radius, // Pass the potentially modified radius
        0
      ); // Player explosions are chainDepth 0
      missiles.splice(i, 1);
    }
  }
}

function animateExplosion(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    // Update and draw explosions
    explosion.update(dt);
    if (explosion.elapsedTime >= explosion.duration) {
      explosions.splice(i, 1);
    }
  }
}

function animateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const text = floatingTexts[i];
    text.update();
    if (text.lifespan <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}
//explosion code

// constructor(x, y, radius, maxRadius, color, duration)
function createExplosion(
  x,
  y,
  color,
  maxRadius,
  duration,
  chainDepth,
  damagesSilos = false,
  baseDamage = 0
) {
  const explosion = new Explosion(
    x,
    y,
    0,
    maxRadius,
    color,
    duration,
    chainDepth,
    damagesSilos,
    baseDamage
  );
  explosions.push(explosion);
  return explosion;
  //playExplosionSound(1);
  soundManager.play("explosion", 0.3);
  //console.log("explosion at:", x, y);
}

// Collision check

function checkCollision(explosion, enemy) {
  const dx = explosion.x - enemy.x;
  const dy = explosion.y - enemy.y;
  const distanceSq = dx * dx + dy * dy;
  const radiusSumSq = (explosion.radius + enemy.radius) ** 2;
  return distanceSq < radiusSumSq;
}

//Game Over

function gameOver() {
  gameState.gameOver = true;
  cancelAnimationFrame(gameState.animationId);
  showGameOverScreen();
  soundManager.play("gameOver");
  // flashScreen(3, 'red', 500); // This flashes the canvas background
}

function showGameOverScreen() {
  const gameOverScreen = document.getElementById("game-over-screen");
  const scoreValueElement = document.getElementById("final-score");
  const killRatioElement = document.getElementById("final-kill-ratio");
  const levelElement = document.getElementById("final-game-level");
  const missilesFiredElement = document.getElementById("final-missiles-fired");
  const ratio =
    gameState.missilesFired === 0
      ? 0
      : (gameState.kills / gameState.missilesFired) * 100;
  scoreValueElement.textContent = gameState.score;
  killRatioElement.textContent = ratio.toFixed(2) + " %";
  levelElement.textContent = gameState.level;
  missilesFiredElement.textContent = gameState.missilesFired;

  gameOverScreen.style.display = "flex";
}

let lastScoreMilestone = 0;

class Quadtree {
  constructor(boundary, capacity) {
    // boundary is an object like { x: 0, y: 0, width: canvasWidth, height: canvasHeight }
    // capacity is how many items before subdivision
    this.boundary = boundary;
    this.capacity = capacity;
    this.objects = []; // Store objects (enemies, etc.) here
    this.divided = false; // Has this quadtree subdivided?

    // Children quadtrees
    this.topLeft = null;
    this.topRight = null;
    this.bottomLeft = null;
    this.bottomRight = null;
  }

  subdivide() {
    // Half-dimensions
    const halfW = this.boundary.width / 2;
    const halfH = this.boundary.height / 2;

    // Boundaries for child quadtrees
    let tl = {
      x: this.boundary.x,
      y: this.boundary.y,
      width: halfW,
      height: halfH,
    };
    let tr = {
      x: this.boundary.x + halfW,
      y: this.boundary.y,
      width: halfW,
      height: halfH,
    };
    let bl = {
      x: this.boundary.x,
      y: this.boundary.y + halfH,
      width: halfW,
      height: halfH,
    };
    let br = {
      x: this.boundary.x + halfW,
      y: this.boundary.y + halfH,
      width: halfW,
      height: halfH,
    };

    this.topLeft = new Quadtree(tl, this.capacity);
    this.topRight = new Quadtree(tr, this.capacity);
    this.bottomLeft = new Quadtree(bl, this.capacity);
    this.bottomRight = new Quadtree(br, this.capacity);
    this.divided = true;
  }

  // Check if a rectangle (w,h) at x,y is inside this quadtree boundary
  // For simplicity, treat each object by its bounding box
  // boundary = { x, y, width, height }
  // obj = { x, y, width, height, reference }
  contains(obj) {
    return (
      obj.x >= this.boundary.x &&
      obj.x + obj.width <= this.boundary.x + this.boundary.width &&
      obj.y >= this.boundary.y &&
      obj.y + obj.height <= this.boundary.y + this.boundary.height
    );
  }

  // Insert an object into the quadtree
  insert(obj) {
    // If not inside boundary, do nothing
    if (!this.contains(obj)) {
      return false;
    }

    // If we still have space in this node, accept the object
    if (this.objects.length < this.capacity && !this.divided) {
      this.objects.push(obj);
      return true;
    }

    // Otherwise, we must subdivide if not already
    if (!this.divided) {
      this.subdivide();
    }

    // Then try inserting into each child
    if (this.topLeft.insert(obj)) return true;
    if (this.topRight.insert(obj)) return true;
    if (this.bottomLeft.insert(obj)) return true;
    if (this.bottomRight.insert(obj)) return true;

    // If somehow it doesn't fit, just return false
    return false;
  }

  // Query the quadtree for objects within a certain bounding box range
  // range = { x, y, width, height }
  query(range, found = []) {
    // If range does not overlap boundary, return
    if (!this.intersects(range, this.boundary)) {
      return found;
    }

    // Check objects at this level
    for (let obj of this.objects) {
      if (this.intersects(range, obj)) {
        found.push(obj);
      }
    }

    // Recurse into children if subdivided
    if (this.divided) {
      this.topLeft.query(range, found);
      this.topRight.query(range, found);
      this.bottomLeft.query(range, found);
      this.bottomRight.query(range, found);
    }
    return found;
  }

  // Utility to check bounding-box intersection
  intersects(a, b) {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }
}

// This should be called at the start of the animate function
function applyScreenShake() {
  const { screenShake } = gameState;
  const timePassed = Date.now() - screenShake.startTime;
  if (timePassed < screenShake.duration) {
    const shakeX = (Math.random() - 0.5) * screenShake.magnitude;
    const shakeY = (Math.random() - 0.5) * screenShake.magnitude;
    c.translate(shakeX, shakeY);
  } else {
    screenShake.magnitude = 0;
  }
}

//animate
function animate(timestamp) {
  if (!gameState.gamePaused) {
    // --- DELTA TIME CALCULATION ---
    if (!gameState.lastTime) {
      gameState.lastTime = timestamp;
    }
    const deltaTime = (timestamp - gameState.lastTime) / 1000; // Time in seconds
    gameState.lastTime = timestamp;

    c.save(); // Save the canvas state before any transformations
    applyScreenShake();

    c.clearRect(0, 0, canvas.width, canvas.height);

    // Create a new quadtree each frame
    const quadtree = new Quadtree(
      { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
      4 // capacity can be tweaked
    );

    enemies.forEach((enemy) => {
      const r = enemy.radius;
      quadtree.insert({
        x: enemy.x - r,
        y: enemy.y - r,
        width: r * 2,
        height: r * 2,
        reference: enemy,
      });
    });

    // --- ENEMY SPAWNING ---
    if (!gameState.gameOver && !gameState.gamePaused && timestamp > gameState.nextSpawnTime) {
      createEnemy();
      // Calculate and set the time for the next spawn
      const spawnRate = 400 / (1 + 5.0 * Math.log10(gameState.level)) + 100;
      gameState.nextSpawnTime = timestamp + spawnRate;
    }

    // Update & Draw Game Objects
    powerUps.forEach(p => p.update(deltaTime));
    enemies.forEach((enemy) => enemy.update(deltaTime));
    animateMissile(deltaTime);
    

    // --- COLLISION DETECTION ---
    explosions.forEach((explosion, explosionIndex) => {
      const er = explosion.radius;
      const exBB = {
        x: explosion.x - er,
        y: explosion.y - er,
        width: er * 2,
        height: er * 2,
      };
      const possibleEnemies = quadtree.query(exBB);

      // Check for power-up collection
      if (explosion.color === 'orange') {
        for (let i = powerUps.length - 1; i >= 0; i--) {
          const powerUp = powerUps[i];
          const dx = explosion.x - powerUp.x;
          const dy = explosion.y - powerUp.y;
          if (Math.sqrt(dx*dx + dy*dy) < explosion.radius + powerUp.radius) {
            gameState.powerUp.active = true;
            gameState.powerUp.type = powerUp.type;
            gameState.powerUp.endTime = Date.now() + gameState.powerUp.duration;
            gameState.powerUp.nextSpawnTime = Date.now() + gameState.powerUp.duration + 5000; // Cooldown starts on pickup
            // Create a prominent notification text
            floatingTexts.push(
              new FloatingText(canvasWidth / 2, canvasHeight / 2, "BIGGER EXPLOSIONS", "orange", 48)
            );
            powerUps.splice(i, 1);
            // Optional: play a power-up collection sound
          }
        }
      }

      for (let i = possibleEnemies.length - 1; i >= 0; i--) {
        const obj = possibleEnemies[i];
        const enemy = obj.reference;
        const enemyIndex = enemies.indexOf(enemy);

        if (enemyIndex === -1) continue; // Already destroyed

        // If this explosion has already hit this enemy, skip.
        if (explosion.hitEnemies.includes(enemy)) continue;

        const dx = explosion.x - enemy.x;
        const dy = explosion.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < explosion.radius + enemy.radius) {
          // Damage falls off as a square of the normalized distance from the center.
          const normalizedDistance =
            distance / (explosion.maxRadius + enemy.radius);
          const damageFalloff = (1 - normalizedDistance) ** 2;
          const maxDamage = explosion.color === "orange" ? 10000 : 15000; // Chain reaction damage is now doubled
          const damage = maxDamage * damageFalloff;

          explosion.hitEnemies.push(enemy); // Mark this enemy as hit by this explosion.

          floatingTexts.push(
            new FloatingText(enemy.x, enemy.y, Math.round(damage), "red", 16)
          );

          const healthBeforeDamage = enemy.health; // Capture health before applying damage

          if (enemy.takeDamage(damage)) {
            // Enemy is destroyed
            if (explosion.color === "orange") {
              explosion.enemiesHitCount++;
              const baseScore = enemy.type === "meteor" ? 10 : 1;
              const scoreToAdd = baseScore * explosion.enemiesHitCount;
              gameState.score += scoreToAdd;
              gameState.kills++;

              // Display the score text above the enemy
              floatingTexts.push(
                new FloatingText(enemy.x, enemy.y - 30, `+${scoreToAdd}`, "lime", 28)
              );

              // Display the multiplier text at the explosion's center
              if (explosion.enemiesHitCount > 1) {
                const multiplierText = `x${explosion.enemiesHitCount}`;
                floatingTexts.push(
                  new FloatingText(explosion.x, explosion.y, multiplierText, "orange", 36)
                );
              }
            } else {
              const scoreToAdd =
                enemy.type === "meteor"
                  ? 10 * 2 ** explosion.chainDepth
                  : 2 ** explosion.chainDepth;
              gameState.score += scoreToAdd;
              gameState.kills++;
              floatingTexts.push(
                new FloatingText(enemy.x, enemy.y - 30, `+${scoreToAdd}`, "lime", 28)
              );
            }

            soundManager.play("enemyKill", 0.4);
            const explosionType =
              enemy.type === "meteor"
                ? ["#FF1493", 150, 1000, true]
                : ["cyan", 100, 800, false];
            createExplosion(
              enemy.x,
              enemy.y,
              explosionType[0],
              explosionType[1],
              explosionType[2],
              explosion.chainDepth + 1,
              explosionType[3],
              enemy.maxHealth
            );

            enemies.splice(enemyIndex, 1);
          }
        }
      }
    });

    // Enemy-Silo Collision
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.y + enemy.radius > canvasHeight - 50) {
        // Check for direct meteor hits on silos first
        const hitSilo = checkEnemySiloCollision(enemy, true);
        if (hitSilo) {
          const siloIndex = silos.indexOf(hitSilo);
          const damage = enemy.type === "meteor" ? enemy.health * 2 : enemy.health * 1;
          hitSilo.takeDamage(damage); // Apply direct hit damage immediately
          floatingTexts.push(
            new FloatingText(
              hitSilo.x + hitSilo.width / 2,
              hitSilo.y - 30,
              Math.round(damage),
              "red"
            )
          );
          soundManager.play("siloHit", 0.8);

          if (enemy.type === "meteor") {
            triggerScreenShake(8, 400); // Reduced screen shake
            const explosion = createExplosion(
              enemy.x,
              enemy.y,
              "#FF1493",
              150,
              1000,
              0,
              true,
              damage
            );
            if (explosion) explosion.hitSilos.push(siloIndex); // Prevent double damage
          } else {
            triggerScreenShake(5, 300); // Reduced screen shake
            const explosion = createExplosion(
              enemy.x,
              enemy.y,
              "#FF4500",
              75,
              1500,
              0,
              true,
              damage
            );
            if (explosion) explosion.hitSilos.push(siloIndex); // Prevent double damage
          }
          enemies.splice(i, 1);
        }
      }
      // Remove enemies that go off-screen
      if (enemy.y - enemy.radius > canvasHeight) {
        enemies.splice(i, 1);
      }
    }

    // Check if silo-damaging explosions hit silos
    explosions.forEach((explosion) => {
      if (!explosion.damagesSilos) return;

      silos.forEach((silo, siloIndex) => {
        // If this silo has already been hit by this explosion, skip it
        if (explosion.hitSilos.includes(siloIndex)) return;

        // Find the closest point on the silo to the explosion's center
        const closestX = Math.max(
          silo.x,
          Math.min(explosion.x, silo.x + silo.width)
        );
        const closestY = Math.max(
          silo.y - silo.height,
          Math.min(explosion.y, silo.y)
        ); // Silo is drawn from bottom up

        const dx = explosion.x - closestX;
        const dy = explosion.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < explosion.radius) {
          const normalizedDistance = distance / explosion.maxRadius;
          const damageFalloff = (1 - normalizedDistance) ** 2;
          // Damage is based on the health of the meteor that created the explosion
          const damage = explosion.baseDamage * 2 * damageFalloff;
          silo.takeDamage(damage);
          floatingTexts.push(
            new FloatingText(
              silo.x + silo.width / 2,
              silo.y - 30,
              Math.round(damage),
              "red"
            )
          );
          explosion.hitSilos.push(siloIndex); // Mark this silo as hit by this explosion
        }
      });
    });

    // Update and draw visual effects after all logic is processed
    animateFloatingTexts();
    levelUpNotification.update();

    drawPowerUpBorder();
    
    // Update and draw all active explosions
    animateExplosion(deltaTime);
    
    warningSystem.update();
    warningSystem.draw();

    // Draw Silos and highlight the one that would fire
    powerUps.forEach(p => p.draw());
    silos.forEach((silo, index) => {
      let color = "grey";
      if (!silo.isDestroyed) {
        if (index === 0 && gameState.mouse.x <= canvasWidth / 3) color = "red";
        else if (
          index === 1 &&
          gameState.mouse.x > canvasWidth / 3 &&
          gameState.mouse.x <= (canvasWidth * 2) / 3
        )
          color = "red";
        else if (index === 2 && gameState.mouse.x > (canvasWidth * 2) / 3)
          color = "red";
      }
      silo.draw(color);
    });

    // --- Passive Scoring ---
    const currentTime = Date.now();
    if (currentTime - gameState.lastPassiveScoreTime >= 500) {
      // Every 0.5 seconds
      const livingSilos = silos.filter((silo) => !silo.isDestroyed).length;

      // Calculate kill ratio (as a value between 0 and 1)
      const killRatio =
        gameState.missilesFired > 0
          ? gameState.kills / gameState.missilesFired
          : 0;

      // Bonus for accuracy: 1 point per silo + up to 3 extra points based on killRatio
      const passiveScore = livingSilos + Math.floor(killRatio * 10);
      gameState.score += passiveScore;
      gameState.lastPassiveScoreTime = currentTime;
    }

    updateUI();
    checkLevelUp();

    // --- GAME OVER CHECK ---
    const allSilosDestroyedCheck = silos.every((silo) => silo.isDestroyed);
    const noMissilesLeftCheck = silos.every(
      (silo) =>
        silo.isDestroyed || silo.missileCount >= gameState.maxMissilesPerSilo
    );

    if (
      allSilosDestroyedCheck ||
      (noMissilesLeftCheck &&
        missiles.length === 0 &&
        explosions.length === 0 &&
        enemies.length > 0)
    ) {
      gameOver();
    }

    c.restore(); // Restore the canvas state to remove the translation

    // Schedule the next frame to create the animation loop
    gameState.animationId = requestAnimationFrame(animate);
  } else {
    // If paused, we make sure to cancel the scheduled frame
    cancelAnimationFrame(gameState.animationId);
  }
}

//init
function initialize() {
  diffScale();
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  silos = [
    new Silo(canvasWidth / 6 - SILO_WIDTH / 2),
    new Silo(canvasWidth / 2 - SILO_WIDTH / 2),
    new Silo((canvasWidth * 5) / 6 - SILO_WIDTH / 2),
  ];
  levelUpNotification = new LevelUpNotification();
  warningSystem = new WarningSystem();
}
initialize();

//start game
function startGame(startLevel = 1) {
  document.getElementById("level-select-screen").style.display = "none";

  //playEnemyDestroyedSound(0);
  //playExplosionSound(0);
  //playSiloHitSound(0);
  //playMissileLaunchedSound(0);
  //playLevelledUpSound(0);
  if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
  // Reset state
  gameState.score = 0;
  gameState.kills = 0;
  gameState.missilesFired = 0;
  gameState.level = 1;
  gameState.gameStarted = true;
  gameState.gamePaused = false;
  gameState.gameOver = false;
  gameState.lastPassiveScoreTime = Date.now();
  gameState.lastTime = 0;
  gameState.nextSpawnTime = 0; // Reset spawn timer

  enemies = [];
  powerUps = [];
  missiles = [];
  explosions = [];
  floatingTexts = [];
  silos.forEach((silo) => silo.reset());

  initialize();

  // Set starting level and score counter
  gameState.level = startLevel;
  gameState.scoreForNextLevel = calculateScoreNeededForLevel(startLevel);
  gameState.scoreAtLevelStart = 0;
  gameState.score = 0; // Always start score at 0
  diffScale(); // Apply difficulty scaling for the chosen level

  updateUI();
  gameState.animationId = requestAnimationFrame(animate); // Start the animation loop

  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("reset-button").textContent = "RESTART GAME";
  pauseButton.textContent = "PAUSE GAME";
}

//reset pause game
function resetGame() {
  cancelAnimationFrame(gameState.animationId);
  gameState.gameStarted = false;
  c.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("reset-button").textContent = "START GAME";
  initialize(); // Redraw initial state like silos
  updateUI();
  showLevelSelect();
}

// --- SOUND SYSTEM ---

const soundManager = {
  sounds: {
    missileLaunch: new Audio(
      "C:UsersUser1DesktopGAmissile_commandAssets8-bit-explosion-95847.mp3"
    ),
    explosion: new Audio("assets/explosion.wav"),
    enemyKill: new Audio("assets/enemy_kill.wav"),
    siloHit: new Audio("assets/silo_hit.wav"),
    levelUp: new Audio("assets/level_up.wav"),
    gameOver: new Audio("assets/game_over.wav"),
  },

  play: function (soundName, volume = 1.0) {
    const sound = this.sounds[soundName];
    if (sound) {
      // Create a new audio object for each playback to allow for overlapping sounds
      const audio = new Audio(sound.src);
      audio.volume = volume;
      audio.play().catch((error) => {
        // Autoplay was prevented, which is common before user interaction.
        // This can be ignored or handled with a "click to enable sound" button.
        console.log(`Could not play sound: ${soundName}`, error);
      });
    }
  },

  // Mute all sounds if needed (e.g., for a settings option)
  setMuted: function (isMuted) {
    for (const key in this.sounds) {
      this.sounds[key].muted = isMuted;
    }
  },
};

function calculateScoreNeededForLevel(level) {
  // Score needed is now tied to the difficulty scaling (speed and spawn rate)
  const currentSpeed = BASE_ENEMY_SPEED + 100.0 * Math.log10(level);
  const currentSpawnRate = 500 / (1 + 2.0 * Math.log10(level)) + 100;
  const difficultyFactor = (currentSpeed * (1000 / currentSpawnRate)) / 50;
  return Math.floor(BASE_SCORE_PER_LEVEL * difficultyFactor)/2;
}

function pauseGame() {
  if (!gameState.gameStarted) return;
  gameState.gamePaused = !gameState.gamePaused;

  if (gameState.gamePaused) {
    cancelAnimationFrame(gameState.animationId); // This will be handled by the animate() function's else block
    pauseButton.textContent = "RESUME GAME";
  } else {
    gameState.lastTime = 0; // Reset lastTime to avoid a large deltaTime jump
    gameState.animationId = requestAnimationFrame(animate);
    pauseButton.textContent = "PAUSE GAME";
  }
}

function showLevelSelect() {
  document.getElementById("level-select-screen").style.display = "flex";
}

//sound

// const enemyDestroyedSound = new Audio('http://127.0.0.1:8080/one_beep-99630.mp3');
// const explosionSound = new Audio('http://127.0.0.1:8080/positive-feedback-38518.mp3');
// const siloHitSound = new Audio('missile_command\Assets\8-bit-explosion-95847.mp3');
// const missileLaunchedSound = new Audio('http://127.0.0.1:8080/woosh-sfx-95844.mp3');
// const levelledUpSound = new Audio('http://127.0.0.1:8080/winsquare-6993.mp3');
// const gameOverSound = new Audio('http://127.0.0.1:8080/videogame-death-sound-43894.mp3');

// function playEnemyDestroyedSound(v) {
//   enemyDestroyedSound.currentTime = 0;
//   enemyDestroyedSound.volume = v;
//   enemyDestroyedSound.play();
// }
// function playExplosionSound(v) {
//   explosionSound.currentTime = 0;
//   explosionSound.play();
//   explosionSound.volume = v;
// }
// function playSiloHitSound(v) {
//   siloHitSound.currentTime = 0;
//   siloHitSound.play();
//   siloHitSound.volume = v;
// }
// function playMissileLaunchedSound(v) {
//   missileLaunchedSound.currentTime = 0;
//   missileLaunchedSound.play();
//   missileLaunchedSound.volume = v;
// }
// function playLevelledUpSound(v) {
//   levelledUpSound.currentTime = 0;
//   levelledUpSound.volume = v;
//   levelledUpSound.play();
// }

// function playGameOverSound(v) {
//   gameOverSound.currentTime = 0;
//   gameOverSound.volume = v;
//   gameOverSound.play();
// }

//Event Listeners

document.addEventListener("click", function (event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  if (
    event.target === canvas && // Ensure the click was on the canvas
    gameState.gameStarted &&
    !gameState.gamePaused
  ) {
    createMissile(mouseX, mouseY);
  }
});

document.querySelectorAll(".level-button").forEach((button) => {
  button.addEventListener("click", (event) => {
    const level = parseInt(event.target.getAttribute("data-level"), 10);
    startGame(level);
  });
});

customLevelGoButton.addEventListener("click", () => {
  const input = document.getElementById("custom-level-input");
  const level = parseInt(input.value, 10);
  if (level && level > 0) {
    startGame(level);
  } else {
    input.value = ""; // Clear invalid input
  }
});

resetButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
pauseButton.addEventListener("click", pauseGame);
window.addEventListener("resize", resizeGame);

// Initial resize on load
window.addEventListener("load", resizeGame);

document
  .getElementById("canvas")
  .addEventListener("mousemove", onMouseUpdate, false);
document
  .getElementById("canvas")
  .addEventListener("mouseenter", onMouseUpdate, false);

function onMouseUpdate(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  gameState.mouse.x = (event.clientX - rect.left) * scaleX;
  gameState.mouse.y = (event.clientY - rect.top) * scaleY;
}
