# Missile Defence!

This repository contains a simple Missile Defence game implemented using HTML, CSS, and JavaScript. The game challenges players to defend three silos from incoming enemy missiles by launching counter-missiles.

## Gameplay Overview

In this classic arcade-style game, players control missile launchers to protect their silos from enemy attacks. The objective is to intercept and destroy incoming enemy missiles before they reach and destroy the player's silos.

### Game Features

- **Interactive Canvas**: The game is played on an interactive HTML5 canvas.
- **Dynamic Enemy Missiles**: Enemies approach from random trajectories and increase in speed as the level increases. The level increases for every 100 enemies destroyed.
- **Missile Launching**: Players can launch counter-missiles by clicking on the canvas. the missiles explode upon reaching the target destination, and the      resulting explosion destroys the enemies.
- **Score Tracking**: The game keeps track of the player's score, missiles fired, and kill ratio (percentage of enemy missiles destroyed).
- **Level Progression**: As the player's score increases, the game difficulty level rises with faster enemies.

### How to Play

1. **Starting the Game**: Click the "START GAME" button to begin the game.
2. **Defending the Silos**: Use your mouse to click on the canvas to launch missiles and intercept enemy projectiles. Be careful! Silos rendered inoperational after 5 enemy hits and will no longer be able to launch missiles. 
3. **Score Points**: Earn points for each enemy missile destroyed.
4. **Track Progress**: Monitor your score, kill ratio, and level as you progress through the game.
5. **Game Over**: The game ends if all silos are destroyed. See your final score and statistics on the game over screen.

### Controls

- **Launch Missiles**: Click on the canvas to launch missiles from your silos.
- **Pause/Resume**: Use the "PAUSE GAME" button to pause or resume the game during play.
- **Restart**: After a game over, click "Restart" to begin a new game.

### Game Objective

The primary objective of Missile Defence is to protect your silos from enemy missiles for as long as possible. As the game progresses, enemies become faster and more challenging to intercept, testing your reflexes and strategic abilities.

## Getting Started

To play the Missile Defence game:

1. click on the following link https://gitterally.github.io/missile-command-remake

## Challenges

1. Difficulty creating particle trails that are precisely behind enemy and missile elements.
2. Level mechanics for edge cases.
3. Dynamic gameplay based on relative to screensizes.
4. Flashing of canvas screen does not work.

## Future work
1. Sorting out silo mechanics at edge cases.
2. Implementing proper handling of sound files.
3. Distance based hit chances for enemies.
4. Improved gameover screen.
5. Overlaying sprites over the game elements.
6. Additional enemy types, powerups and bonus game mechanics.
7. Display life remaining for silos, either via direct display (i.e. number of lives) or perhaps smoke effects.

## Credits

This game was inspired by classic arcade missile defence game by Atari.
Soundfiles:
1. https://creatorassets.com/a/8bit-explosion-sound-effects
2. https://pixabay.com/sound-effects/search/8%20bit/

## License
