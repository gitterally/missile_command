// Variables and Constants
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
const resetButton = document.querySelector("#reset-button");
const restartButton = document.querySelector("#restart-button");
const pauseButton = document.querySelector("#pause-button");
const rect = canvas.getBoundingClientRect();
const canvasWidth = 1280;
const canvasHeight = 720;
const hitCount  = 0;
const siloHitLimit = 5;
let maxMissiles=0;
let silo1MissileCount=0;
let silo2MissileCount=0;
let silo3MissileCount=0;
let silo1valid = true;
let silo2valid = true;
let silo3valid = true;
let gameOverState = false;
let gameStarted = false;
let gamePaused = false;
let missileFired = 0;
let animationId;
let player;
let counter=1;
let score = 0;
let kills=0;
let existEnemy = false;
let updateToggle = false;
var level = 1;
var enemies = [];
var missiles = [];
var explosions = [];
var difficulty = 1;
var speed = 0.5;
const siloWidth = 100;
const siloHeight = 10;
const [silo1Y, silo2Y, silo3Y] = [
  canvasHeight - siloHeight,
  canvasHeight - siloHeight,
  canvasHeight - siloHeight,
];
const [silo1X, silo2X, silo3X] = [
  canvasWidth / 6 - siloWidth / 2,
  canvasWidth / 2 - siloWidth / 2,
  (canvasWidth * 5) / 6 - siloWidth / 2,
];
let [silo1Hit, silo2Hit, silo3Hit] = [false, false, false];
let [silo1HitCount, silo2HitCount, silo3HitCount] = [0, 0, 0];

function diffScale() {
  const baseSpeed = 1;
  const speedIncrement = 0.1;
  speed = baseSpeed + speedIncrement * difficulty;
  maxMissiles=19+difficulty
}
 

function lifePercentage(hitCount){
  return (siloHitLimit - hitCount) / siloHitLimit
}

// Function to flash the screen
function flashScreen(times, color, toggle, duration) {
  let count = 0;
  let interval = setInterval(function () {
    if (count % 2 === 0) {
      if (toggle === 'background') {
        document.body.style.backgroundColor = color;
      } else if (toggle === 'canvas') {
        canvas.fillStyle = color;
        c.fillStyle = color;
        c.fillRect(10, 10, canvasWidth - 20, canvasHeight - 20);
        c.transparency = 0.5
      }
    } else {
      if (toggle === 'background') {
        document.body.style.backgroundColor = 'black';
      } else if (toggle === 'canvas') {
        c.fillStyle = 'black';
        c.fillRect(10, 10, canvasWidth - 20, canvasHeight - 20);
        c.transparency = 0.5
      }
    }

    count++;

    if (count === times * 2) {
      clearInterval(interval);
      document.body.style.backgroundColor = '';
      if (toggle === 'canvas') {
        c.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, duration);
}


//Silos
function drawSilo(x, y, width, height, color, hitCount, missilesLeft) {
  const domeRadius = width / 10;

  c.font = "20px Arial";
  c.fillStyle = "white";
  c.fillText("Missiles: " + missilesLeft, x,y-20, 70);

  const lifeIndicatorHeight = 10; // Height of the life indicator bar
  const lifeIndicatorWidth = width * lifePercentage(hitCount);
  c.fillStyle = "green"; // Color of the life indicator
  c.fillRect(x, y, lifeIndicatorWidth, lifeIndicatorHeight);

  c.save();

  c.fillStyle = color;
  c.fillRect(x, y-10, width, height);


  const domeCenterX = x + width / 2;
  const domeCenterY = y-10;
  const domeStartAngle = 0;
  const domeEndAngle = Math.PI;

  c.beginPath();
  c.arc(
    domeCenterX,
    domeCenterY,
    domeRadius,
    domeStartAngle,
    domeEndAngle,
    true
  );
  c.closePath();
  c.fill();

  c.restore();
}
function drawSilos(color1, color2, color3) {
  if (silo1valid) {
    drawSilo(silo1X, silo1Y, siloWidth, siloHeight, color1, silo1HitCount, maxMissiles-silo1MissileCount);
  }
  if (silo2valid) {
    drawSilo(silo2X, silo2Y, siloWidth, siloHeight, color2, silo2HitCount, maxMissiles-silo2MissileCount);
  }
  if (silo3valid) {
    drawSilo(silo3X, silo3Y, siloWidth, siloHeight, color3, silo3HitCount, maxMissiles-silo3MissileCount);
  }
}

function checkEnemySiloCollision(enemy) {
  let silo1Hit = false;
  let silo2Hit = false;
  let silo3Hit = false;

  const enemyBottomY = enemy.y - enemy.radius;
  const enemyLeftX = enemy.x - enemy.radius;
  const enemyRightX = enemy.x + enemy.radius;

  if (
    enemyBottomY >= silo1Y-10 &&
    enemyLeftX <= silo1X + siloWidth &&
    enemyRightX >= silo1X &&
    silo1HitCount < siloHitLimit
  ) {
    // console.log("silo1Hit");
    silo1valid = true
    silo1HitCount++;
    silo1Hit = true;
  } else if(silo1HitCount >= siloHitLimit){
    silo1valid = false
  };

  if (
    enemyBottomY >= silo2Y-10 &&
    enemyLeftX <= silo2X + siloWidth &&
    enemyRightX >= silo2X &&
    silo2HitCount < siloHitLimit
  ) {
    // console.log("silo2Hit");
    silo2valid = true
    silo2HitCount++;
    silo2Hit = true;
  } else if(silo2HitCount >= siloHitLimit){
    silo2valid = false
  }

  if (
    enemyBottomY >= silo3Y-10 &&
    enemyLeftX <= silo3X + siloWidth &&
    enemyRightX >= silo3X &&
    silo3HitCount < siloHitLimit
  ) {
    // console.log("silo3Hit");
    silo3valid = true
    silo3HitCount++;
    silo3Hit = true;
  } else if(silo3HitCount >= siloHitLimit){
    silo3valid = false
  }
  return silo1Hit || silo2Hit || silo3Hit;
}

function updateKillRatio() {
  if (missileFired === 0) {
    ratio = 0;
  } else {
    ratio = (kills / missileFired) * 100;
  }
  document.getElementById("killR").textContent =
    "KILL RATIO: " + ratio.toFixed(2) + " %";
}

function updateScore() {
  const scoreDisplay = document.getElementById("score");
  scoreDisplay.textContent = "SCORE: " + score.toString();
  const missileLaunched = document.getElementById("missiles");
  missileLaunched.textContent = "MISSILES LAUNCHED: " + missileFired.toString();
  const level = document.getElementById("difficulty");
  level.textContent = "LEVEL: " + difficulty.toString();
  updateKillRatio();
  diffScale();
  // console.log("score: ", score);
  
  if (Math.floor(score/(100*counter))>=1 && score !== 0) {
    if (updateToggle) {
      counter++;
    
      console.log('counter": ', counter);
      difficulty++;
      updateToggle = false
      silo1MissileCount=0;
      silo2MissileCount=0;
      silo3MissileCount=0;
      if (silo1HitCount > 0) {
        silo1valid = true;
        silo1HitCount-=1;
      };
      if (silo2HitCount > 0) {
        silo2valid = true;
        silo2HitCount-=1;
      };
      if (silo3HitCount > 0) {
        silo3valid = true;
        silo3HitCount-=1;
      };
      //playLevelledUpSound(1);
    }
  } else {
    updateToggle = true
  }
}


//class constructors
class Missile {
  constructor(targetX, targetY, startX, startY, colour, speed) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.colour = colour;
    this.speed = speed;
    this.dx = -targetX + startX;
    this.dy = -targetY + startY;
    this.trail = new Trail();
  }

  draw() {
    const length = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    const Dx = this.dx / length;
    const Dy = this.dy / length;

    const endX = this.x + Dx * canvasWidth / 100;
    const endY = this.y + Dy * canvasWidth / 100;

    this.trail.draw();

    c.beginPath();
    c.moveTo(this.x, this.y);
    c.lineTo(endX, endY);
    c.lineWidth = canvasWidth / 600;
    c.strokeStyle = this.colour;
    c.stroke();
  }

  update() {
    // Update missile position based on the target position
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / distance;
    const unitY = dy / distance;

    this.x += unitX * this.speed;
    this.y += unitY * this.speed;

    this.trail.emitMissileTrail(this.x, this.y);
    this.trail.update();

    this.draw();

    let toggle=true;
    if (distance < this.speed && toggle) {
      toggle=false;
      console.log("toggle", toggle);
      return { explosionX: this.targetX, explosionY: this.targetY};
    }
    return null; 
}
}


class Enemy {
  constructor(x, y, radius, dirX, dirY, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.dirX = dirX;
    this.dirY = dirY;
    this.color = color;
    this.trail = new Trail();
  }

  draw() {
    // Draw the enemy
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();

    this.trail.draw();
  }

  update() {
    // Update enemy position
    this.x += this.dirX;
    this.y += this.dirY;
    this.trail.emitEnemyTrail(this.x, this.y);
    this.trail.update();
    this.draw();
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


class Explosion {
  constructor(x, y, radius, maxRadius, color, duration) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxRadius = maxRadius;
    this.color = color;
    this.duration = duration;
    this.elapsedTime = 0;
  }

  draw() {
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
  }

  update(runTime) {
    this.elapsedTime += runTime;
    this.radius = (this.elapsedTime / this.duration) * this.maxRadius; //to control explosion speed
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
  const startX = Math.random() * (canvasWidth - 20) + 10;
  const endX = Math.random() * canvasWidth;
  const speedy = speed * (0.9 + 0.2 * Math.random());

  const dx = endX - startX;
  const dy = canvasHeight;
  const length = Math.sqrt(dx * dx + dy * dy);
  const Dx = dx / length;
  const Dy = dy / length;

  const dirX = Dx * speedy;
  const dirY = Dy * speedy;

  return [startX, dirX, dirY];
}

//enemy code
function createEnemy() {
  const dir = enemyDir();
  existEnemy = true;
  const enemy = new Enemy(
    dir[0],
    1,
    canvasWidth / 500,
    dir[1],
    dir[2],
    "orange"
  ); //constructor(x,y,radius, dirX, dirY, color)
  enemies.push(enemy);
  //console.log(`enemy at: ${dir[0]},travelling in direction ${dir[1]}, ${dir[2]}`);
  const nextEnemyDelay = Math.random() * 1000 + 0;
  setTimeout(function () {
    createEnemy();
  }, nextEnemyDelay);
}

function animateEnemy() {
  enemies.forEach(function (enemy, index) {
    if (enemy.y > canvasHeight - 50) {
      if (checkEnemySiloCollision(enemy, index)) {
        flashScreen(2, 'red', 'canvas', 100);
        createExplosion(enemy.x, enemy.y, 'pink', 50);
        //playSiloHitSound(1);
        enemies.splice(index, 1);
      }
    }
    enemy.update();
  });
}

//missile code

function createMissile(x, y) {
  
    // Define positions and validity status for each silo
    const silos = [
      { posX: canvasWidth / 6, valid: silo1valid, maxMissiles: maxMissiles, missileCount: silo1MissileCount },
      { posX: canvasWidth / 2, valid: silo2valid, maxMissiles: maxMissiles, missileCount: silo2MissileCount },
      { posX: (canvasWidth * 5) / 6, valid: silo3valid, maxMissiles: maxMissiles, missileCount: silo3MissileCount }
    ];
  
    // Filter valid silos where the missile count is below the maximum allowed count
    const validSilos = silos.filter(silo => silo.valid && silo.missileCount < silo.maxMissiles);
    const distances = validSilos.map(silo => Math.abs(x - silo.posX));
  
    // Find the index of the nearest silo
    const nearestIndex = distances.indexOf(Math.min(...distances));
  
    // Check if a valid nearest silo was found
    if (nearestIndex !== -1) {
      const nearestSilo = validSilos[nearestIndex];
      const missileStartY = canvasHeight - 20;
      const missileColour = "white";
      
      // Create missile at the position of the nearest valid silo
      const missile = new Missile(x, y, nearestSilo.posX, missileStartY, missileColour, speed*1.5);
      missiles.push(missile);
      missileFired += 1;
      updateScore();
  
      // Update the missile count for the firing silo
      if (nearestSilo === silos[0]) {
        silo1MissileCount++;
      } else if (nearestSilo === silos[1]) {
        silo2MissileCount++;
      } else if (nearestSilo === silos[2]) {
        silo3MissileCount++;
      }
      //playMissileLaunchedSound(1);
    }
  }
  

function animateMissile() {
  missiles.forEach(function (missile, index) {
    explosionPosition = missile.update();
    if (explosionPosition) {
    createExplosion(explosionPosition.explosionX, explosionPosition.explosionY, 'orange', maxRadius);
    missiles.splice(index, 1); 
  }
});
}


let scoreMultiplier = 1;
function animateExplosion() {
  let scoreMultiplierUpdated = false;
  
  explosions.forEach((explosion, index) => {
    explosion.update(1000 / 60);
    if (explosion.elapsedTime >= explosion.duration) {
      explosions.splice(index, 1);
      scoreMultiplier=1;
    }
    if (scoreMultiplierUpdated) {
    scoreMultiplier = 1;
    scoreMultiplierUpdated = true;
    }
      enemies.forEach((enemy, index) => {
          if (checkCollision(explosion, enemy)) {
              kills++;
              score += scoreMultiplier;
          
              scoreMultiplier++;

              if (score >= lastScoreMilestone + 10) {
                  lastScoreMilestone = Math.floor(score/10)*10+10; 
          
                
                  if (silo1valid && silo1MissileCount > 0) {
                      silo1MissileCount-(Math.ceil(score/10)-lastScoreMilestone);
                  }
                  if (silo2valid && silo2MissileCount > 0) {
                      silo2MissileCount-(Math.ceil(score/10)-lastScoreMilestone);
                  }
                  if (silo3valid && silo3MissileCount > 0) {
                      silo3MissileCount-(Math.ceil(score/10)-lastScoreMilestone);
                  }
              }
  
  
              enemies.splice(index, 1);
              updateScore();
          }
        
    });
  });
}

//explosion code

// constructor(x, y, radius, maxRadius, color, duration)
function createExplosion(x, y, color, maxRadius) {
  const explosion = new Explosion(x, y, 0, maxRadius, color, 1200);
  explosions.push(explosion);
  //playExplosionSound(1);
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
  cancelAnimationFrame(animationId);
  showGameOverScreen();
  flashScreen(3, 'white', 'background', 500);
}


function showGameOverScreen() {
  const gameOverScreen = document.getElementById("game-over-screen");
  const scoreValueElement = document.getElementById("final-score");
  const killRatioElement = document.getElementById("final-kill-ratio");
  const levelElement = document.getElementById("final-game-level");
  const missilesElement = document.getElementById("final-missiles-fired");

  scoreValueElement.textContent = score;
  killRatioElement.textContent = ratio.toFixed(2) + " %";
  levelElement.textContent = level;
  missilesElement.textContent = missileFired;

  gameOverScreen.style.display = 'flex';
}

let lastScoreMilestone =0;
//animate
function animate() {
  if (!gamePaused) {

    c.clearRect(0, 0, canvas.width, canvas.height);
    animateExplosion();
    animateEnemy();
    animateMissile();


    if (x <= canvasWidth / 3 && silo1valid) {
      drawSilos("red", "grey", "grey");
    } else if (x > canvasWidth / 3 && x <= (canvasWidth / 3) * 2 && silo2valid) {
      drawSilos("grey", "red", "grey");
    } else if (x > (canvasWidth / 3) * 2 && silo3valid) {
      drawSilos("grey", "grey", "red");
    }

    animationId = requestAnimationFrame(animate);

    enemies.forEach(function (enemy, index) {
      if (
        enemy.y >= canvasHeight ||
        enemy.y < 0 ||
        enemy.x > canvasWidth ||
        enemy.x < 0
      ) {
        enemies.splice(index, 1);
      }
    });
    missiles.forEach(function (missile, index) {
      if (
        missile.y >= canvasHeight ||
        missile.y < 0 ||
        missile.x > canvasWidth ||
        missile.x < 0
      ) {
        missiles.splice(index, 1);
      }
    });
    const allSilosDestroyed = silo1HitCount === siloHitLimit && silo2HitCount === siloHitLimit && silo3HitCount === siloHitLimit;
    const noMissilesLeft = maxMissiles-silo1MissileCount === 0 && maxMissiles-silo2MissileCount === 0 && maxMissiles-silo3MissileCount === 0;

    if ((allSilosDestroyed) || missiles.length===0 && noMissilesLeft){
      gameOver();
    }

  } else {
    cancelAnimationFrame(animationId);
  }
}


//init
function initialize() {
    diffScale();
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  maxRadius = Math.min(canvasWidth, canvasHeight) / 6;
}
initialize();


//start game
function startGame() {
  initialize();
  //playEnemyDestroyedSound(0);
  //playExplosionSound(0);
  //playSiloHitSound(0);
  //playMissileLaunchedSound(0);
  //playLevelledUpSound(0);
  cancelAnimationFrame(animationId);
  enemies = [];
  missiles = [];
  explosions = [];
  difficulty = 1;
  [silo1HitCount, silo2HitCount, silo3HitCount] = [0, 0, 0];
  missileFired = 0;
  score = 0;
  kills=0;
  updateScore();
  animate();
  gameStarted = true;
  if (!existEnemy) {
    createEnemy();
  }
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("reset-button").textContent = "RESTART GAME";
  pauseButton.textContent = "PAUSE GAME";
}

//reset pause game

function resetGame() {
  enemies = [];
  missiles = [];
  explosions = [];
  silo1MissileCount=0;
  silo2MissileCount=0;
  silo3MissileCount=0;
  silo1valid = true;
  silo2valid = true;
  silo3valid = true;
  updateToggle = false;
  counter=1;
  [silo1HitCount, silo2HitCount, silo3HitCount] = [0, 0, 0];
  missileFired = 0;
  score = 0;
  kills=0
  difficulty = 1;
  updateScore();
  cancelAnimationFrame(animationId);
  c.clearRect(0, 0, canvas.width, canvas.height);
  initialize();
  startGame();
}

function pauseGame() {
  gamePaused = !gamePaused;

  if (gamePaused) {
    cancelAnimationFrame(animationId);
    pauseButton.textContent = "RESUME GAME";
  } else {
    animate();
    pauseButton.textContent = "PAUSE GAME";
  }
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
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  if (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom &&
    gameStarted && !gamePaused
  ) {
    createMissile(mouseX, mouseY);
  }
});



resetButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
pauseButton.addEventListener("click", pauseGame);
window.addEventListener("resize", initialize);

document
  .getElementById("canvas")
  .addEventListener("mousemove", onMouseUpdate, false);
document
  .getElementById("canvas")
  .addEventListener("mouseenter", onMouseUpdate, false);

function onMouseUpdate(event) {
  const rect = canvas.getBoundingClientRect();
  x = event.clientX - rect.left;
  return x
}
onMouseUpdate()