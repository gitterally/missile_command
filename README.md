# Missile Defence!

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

- **Technical Implementation**:
    - **Delta-Time Physics**: The game loop uses `deltaTime` to ensure all movement and animations are smooth and consistent, regardless of the user's monitor refresh rate.
    - **Quadtree Optimization**: Collision detection is highly optimized using a Quadtree, allowing for hundreds of objects on screen without performance degradation.
    - **Responsive Design**: The entire game interface scales dynamically to fit any screen size while perfectly maintaining its aspect ratio, ensuring a great experience from standard HD to 4K monitors.

### How to Play

1. **Starting the Game**: Click the "START GAME" button and select your desired starting level.
2. **Defending the Silos**: Use your mouse to click on the canvas to launch missiles from the nearest available silo. Intercept enemy projectiles before they reach the bottom of the screen.
3. **Resource Management**: Each silo has a limited health pool and a finite number of missiles. Conserve your shots and protect your silos!
4. **Leveling Up**: Reaching the score requirement for the next level will fully repair your silos and restock their ammunition.
5. **Game Over**: The game ends when all three of your silos are destroyed, or when you run out of all ammunition and active defenses while enemies are still on screen.

### Controls

- **Launch Missiles**: Click on the canvas to launch missiles from your silos.
- **Pause/Resume**: Use the "PAUSE GAME" button to pause or resume the game during play.
- **Restart**: After a game over, click "RESTART" to return to the level select screen.

### Game Objective

The primary objective of Missile Defence is to protect your silos from enemy missiles for as long as possible. As the game progresses, enemies become faster and more challenging to intercept, testing your reflexes and strategic abilities.

## Getting Started

To play the Missile Defence game, click on the following link: https://gitterally.github.io/missile-command-remake

## Challenges

This project involved several interesting technical challenges, many of which have been successfully addressed:

- **Solved**: Implementing a robust, responsive scaling system that works on all screen sizes while maintaining accurate mouse input. This was achieved with a JavaScript-driven approach that manages the game's dimensions and translates coordinates.
- **Solved**: Optimizing performance for a high number of on-screen objects. This was solved by implementing a Quadtree for efficient collision detection, avoiding O(n²) complexity.
- **Solved**: Ensuring smooth, frame-rate-independent gameplay. This was achieved by converting the game loop to use a `deltaTime` calculation for all physics and animations.
- **Ongoing**: Creating visually appealing particle trails that are precisely rendered behind fast-moving objects remains a fine-tuning challenge.

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
