# Missile Defence

This repository contains a feature-rich, modern remake of the classic arcade game Missile Defence, implemented using HTML, CSS, and JavaScript. The game challenges players to defend three silos from increasingly difficult waves of enemy missiles by launching counter-missiles from a limited supply.

## Gameplay Overview

In this classic arcade-style game, players control missile launchers to protect their silos from enemy attacks. The objective is to intercept and destroy incoming enemy missiles before they reach and destroy the player's silos.

### Game Features

- **Dynamic Difficulty Scaling**: The game's difficulty increases organically as you progress.
    - **Enemy Speed & Spawn Rate**: Both enemy speed and the rate at which they spawn increase logarithmically with each level, providing a smooth but challenging curve.
    - **Level-Up Requirement**: The score needed to reach the next level is dynamically calculated based on the current "mass flowrate" of enemies (a combination of their speed and spawn rate).

- **Advanced Scoring System**: Maximize your score through skillful play.
    - **Chain Reactions**: Destroying an enemy causes a secondary explosion. Kills from these chain reactions grant an exponential score bonus (`2^n`).
    - **Multi-Kill Bonus**: Destroying multiple enemies with a single player-fired missile grants a stacking score multiplier, rewarding well-placed shots.
    - **Survival Bonus**: Earn a passive score every 0.5 seconds based on the number of surviving silos and your current kill-to-missile ratio.
    - **High-Value Targets**: Special "Meteor" enemies grant a higher base score, which also scales exponentially in chain reactions (`10 * 2^n`).

- **Power-Ups**: Turn the tide of battle with game-changing power-ups.
    - **"Bigger Explosions"**: A rare, golden power-up has a 1% chance to spawn instead of an enemy. Collect it by shooting it to double the radius of your missile explosions for 10 seconds.
    - **Visual Feedback**: A flashing, depleting border appears around the game screen, acting as a visual timer for the active power-up.

- **Rich Visual & UI Feedback**:
    - **Screen Shake**: Powerful explosions from meteor impacts trigger a screen shake effect.
    - **Floating Text**: Get immediate feedback with floating text for damage dealt, score gained, and multi-kill multipliers.
    - **UI Warnings**: The UI provides clear, flashing warnings for "LOW AMMO" and "SILO DOWN" states.
    - **Integrated Progress Bar**: The top statistics bar doubles as a progress bar, showing your progress to the next level.

### How to Play

1. **Starting the Game**: Click the "START GAME" button and select your desired starting level.
2. **Defending the Silos**: Use your mouse to click on the canvas to launch missiles from the nearest available silo. Intercept enemy projectiles before they reach the bottom of the screen.
3. **Resource Management**: Each silo has a limited health pool and a finite number of missiles. Conserve your shots and protect your silos!
4. **Leveling Up**: Reaching the score requirement for the next level will fully repair your silos and restock their ammunition.
5. **Game Over**: The game ends when all three of your silos are destroyed, or when you run out of all ammunition and active defenses while enemies are still on screen.

## Technical Details

This project was built with several key software engineering principles in mind to ensure performance, scalability, and maintainability.

### 1. Frame-Rate Independent Game Loop (Delta Time)

A critical aspect of creating smooth gameplay is decoupling game logic from the client's monitor refresh rate. Instead of assuming a fixed frame rate (e.g., 60 FPS), the main `animate` function calculates a `deltaTime` on every frame.

This `deltaTime` value represents the actual time elapsed since the last frame. All movement and time-based calculations (e.g., an enemy moving `speed * deltaTime`) are based on this, ensuring that the game runs at the same speed on a 60Hz monitor as it does on a 144Hz monitor.

### 2. Optimized Collision Detection with a Quadtree

A naive approach to collision detection involves checking every object against every other object, which has a costly time complexity of O(n²). With hundreds of enemies and explosions, this would quickly cripple performance.

This game implements a **Quadtree**, a tree data structure that spatially partitions the 2D game space.

- **How it Works**: The game area is recursively subdivided into four quadrants. Each object is inserted into the smallest quadrant that fully contains it.
- **Optimization**: When checking for collisions (e.g., an explosion's blast radius), we only query the Quadtree for objects in the same or adjacent quadrants as the explosion. This dramatically reduces the number of checks needed.
- **Implementation**: A new Quadtree is built each frame in the `animate` loop, populated with all enemies and power-ups. Each explosion then queries the tree to get a small list of potential collision candidates.

### 3. Dynamic Aspect Ratio & Responsive Scaling

The game is designed to be fully responsive, maintaining its 1280x720 aspect ratio regardless of the browser window's size.

- **JavaScript-driven Scaling**: The `resizeGame()` function calculates whether the window's width or height is the limiting factor and scales the `#game-wrapper` element accordingly.
- **Canvas Coordinate Correction**: Mouse click coordinates are scaled to match the canvas's internal resolution, ensuring targeting remains accurate even when the rendered canvas size changes.
- **REM-based UI Scaling**: The root `font-size` of the document is adjusted based on the scale factor. All UI element sizes (buttons, text) are defined in `rem` units in the CSS, allowing the entire interface to scale proportionally with the game canvas.

### 4. Advanced Gameplay Mechanics (Code Insights)

The game's difficulty and scoring systems are implemented with an eye for rewarding skillful play.

- **Logarithmic Difficulty Scaling**: To avoid a linear and predictable difficulty spike, enemy speed and spawn rates scale logarithmically (`Math.log10(level)`). This provides a curve that is challenging for new players but remains engaging at very high levels without becoming impossible too quickly.

- **Complex Scoring System**:
    - **Chain Reactions**: When an enemy is destroyed, it creates a new explosion. This new explosion carries a `chainDepth` property, which is incremented from the parent explosion. The score awarded for kills from this chain reaction is exponential (`2 ** chainDepth`), rewarding players for setting off large cascades.
    - **Multi-Kill Bonus**: Each player-fired explosion tracks `enemiesHitCount`. The score for each kill from that single explosion increases linearly (`baseScore * enemiesHitCount`), rewarding precise, high-density targeting.

### 5. Object-Oriented Design

The codebase is structured using JavaScript classes to manage complexity. Each game entity (`Enemy`, `Missile`, `Silo`, `Explosion`, `PowerUp`) is a class that encapsulates its own state (e.g., position, health) and behavior (e.g., `draw()`, `update()`, `takeDamage()`). This makes the code easier to read, debug, and extend with new features. For example, creating a new enemy type is as simple as extending the base `Enemy` class.

### Controls

- **Launch Missiles**: Click on the canvas to launch missiles from your silos.
- **Pause/Resume**: Use the "PAUSE GAME" button to pause or resume the game during play.
- **Restart**: After a game over, click "RESTART" to return to the level select screen.

### Game Objective

The primary objective of Missile Defence is to protect your silos from enemy missiles for as long as possible. As the game progresses, enemies become faster and more challenging to intercept, testing your reflexes and strategic abilities.

## Getting Started

To play the Missile Defence game, click on the following link: (https://gitterally.github.io/missile_command/)

## Future work
1. **Advanced Sound**: Transition from the simple `Audio` object to the Web Audio API for more advanced control over sound effects, including pitch variation and preventing audio clipping.
2. **Visual Polish**: Overlaying sprites over the game elements to move beyond primitive shapes and give the game a more distinct visual identity.
3. **More Content**: Adding new enemy types (e.g., splitting enemies, evasive enemies) and more power-ups (e.g., temporary freeze, rapid fire) to increase gameplay variety.
4. **Background Effects**: Implementing a dynamic, visually interesting background (e.g., a parallax scrolling starfield) to enhance immersion.

## Credits

This game was inspired by classic arcade missile defence game by Atari.
Soundfiles:
1. CreatorAssets - 8bit Explosion Sound Effects
2. Pixabay - 8 Bit Sound Effects

## License
