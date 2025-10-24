import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import socketService from '../services/socketService';
import './Game.css';

const GamePhaser = () => {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const gameStateRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const roomIdRef = useRef(null);

  useEffect(() => {
    const socket = socketService.getSocket();

    // Listen for room joined
    socket.on('room_joined', (data) => {
      console.log('✅ Room joined:', data);
      roomIdRef.current = data.roomId;
      setGameStarted(true);
    });

    // Listen for game state updates
    socket.on('state_update', (state) => {
      gameStateRef.current = state;
    });

    // Emit join_single_player
    socket.emit('join_single_player', {
      username: localStorage.getItem('username') || 'Player',
      userId: localStorage.getItem('userId') || 'unknown'
    });

    return () => {
      socket.off('room_joined');
      socket.off('state_update');
    };
  }, []);

  useEffect(() => {
    if (!gameStarted || !gameRef.current) return;

    class GameScene extends Phaser.Scene {
      constructor() {
        super('GameScene');
      }

      create() {
        // Create static ground
        const graphics = this.make.graphics({ x: 0, y: 0, add: true });
        graphics.lineStyle(3, 0x888888, 1);
        graphics.lineBetween(0, 350, 800, 350);

        // Add instructions text
        this.add.text(10, 360, '← → Jump Z/X Attack', { 
          font: '12px Arial', 
          fill: '#fff' 
        });

        // Create containers for game objects
        this.player1Group = this.add.group();
        this.player2Group = this.add.group();

        // Create game text labels
        this.nameText1 = this.add.text(20, 10, 'You: 100 HP', { 
          font: 'bold 14px Arial', 
          fill: '#ff0000' 
        });
        this.nameText2 = this.add.text(600, 10, 'AI: 100 HP', { 
          font: 'bold 14px Arial', 
          fill: '#0000ff' 
        });

        // Create health bars background
        this.add.rectangle(100, 35, 150, 20, 0x330000);
        this.add.rectangle(700, 35, 150, 20, 0x330000);

        // Create health bar fills
        this.healthBar1 = this.add.rectangle(100, 35, 150, 20, 0x00ff00);
        this.healthBar2 = this.add.rectangle(700, 35, 150, 20, 0x00ff00);

        // Setup input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-Z', () => this.handleAttack('punch'));
        this.input.keyboard.on('keydown-X', () => this.handleAttack('kick'));

        this.attackCooldown = 0;
        this.lastDirection = 'stop';
      }

      update() {
        const gameState = gameStateRef.current;
        if (!gameState || !gameState.players || gameState.players.length < 2) return;

        const socket = socketService.getSocket();
        const humanPlayer = gameState.players.find(p => !p.isAI);
        const aiPlayer = gameState.players.find(p => p.isAI);

        if (!humanPlayer || !aiPlayer) return;

        // Handle input
        let direction = 'stop';
        if (this.cursors.left.isDown) {
          direction = 'left';
        } else if (this.cursors.right.isDown) {
          direction = 'right';
        } else if (this.cursors.up.isDown) {
          socket.emit('player_jump');
        }

        if (direction !== this.lastDirection) {
          socket.emit('player_move', { direction });
          this.lastDirection = direction;
        }

        // Clear groups
        this.player1Group.clear(true);
        this.player2Group.clear(true);

        // Draw both players
        this.drawStickman(this.player1Group, humanPlayer, 0xff0000);
        this.drawStickman(this.player2Group, aiPlayer, 0x0000ff);

        // Update health bars
        this.updateHealthBar(this.healthBar1, humanPlayer);
        this.updateHealthBar(this.healthBar2, aiPlayer);

        // Update labels
        this.nameText1.setText(`You: ${Math.max(0, Math.floor(humanPlayer.hp))} HP`);
        this.nameText2.setText(`AI: ${Math.max(0, Math.floor(aiPlayer.hp))} HP`);

        // Update attack cooldown
        if (this.attackCooldown > 0) {
          this.attackCooldown--;
        }
      }

      drawStickman(group, player, color) {
        if (!player) return;

        const x = player.x;
        const y = player.y;

        // Head - use a circle
        const head = this.add.circle(x, y - 35, 12, color);
        group.add(head);

        // Body - use a line
        const bodyGraphics = this.make.graphics({ x: x, y: y - 20, add: false });
        bodyGraphics.lineStyle(3, color, 1);
        bodyGraphics.lineBetween(0, 0, 0, 28);
        group.add(bodyGraphics);

        // Left arm
        const leftArmGraphics = this.make.graphics({ x: x, y: y - 12, add: false });
        leftArmGraphics.lineStyle(3, color, 1);
        leftArmGraphics.lineBetween(0, 0, -22, -10);
        group.add(leftArmGraphics);

        // Right arm
        const rightArmGraphics = this.make.graphics({ x: x, y: y - 12, add: false });
        rightArmGraphics.lineStyle(3, color, 1);
        rightArmGraphics.lineBetween(0, 0, 22, -10);
        group.add(rightArmGraphics);

        // Left leg
        const leftLegGraphics = this.make.graphics({ x: x, y: y + 8, add: false });
        leftLegGraphics.lineStyle(3, color, 1);
        leftLegGraphics.lineBetween(0, 0, -22, 22);
        group.add(leftLegGraphics);

        // Right leg
        const rightLegGraphics = this.make.graphics({ x: x, y: y + 8, add: false });
        rightLegGraphics.lineStyle(3, color, 1);
        rightLegGraphics.lineBetween(0, 0, 22, 22);
        group.add(rightLegGraphics);

        // Eyes
        const leftEye = this.add.circle(x - 5, y - 38, 2, 0x000000);
        const rightEye = this.add.circle(x + 5, y - 38, 2, 0x000000);
        group.add(leftEye);
        group.add(rightEye);

        // Username label
        const nameLabel = this.add.text(x - 25, y - 55, player.username, {
          font: '12px Arial',
          fill: color === 0xff0000 ? '#ff0000' : '#0000ff'
        });
        group.add(nameLabel);
      }

      updateHealthBar(healthBar, player) {
        const maxWidth = 150;
        const healthPercent = Math.max(0, player.hp) / 100;
        const fillWidth = Math.max(0, healthPercent * maxWidth);

        healthBar.setDisplaySize(fillWidth, 20);

        // Color based on health
        let fillColor;
        if (healthPercent > 0.5) {
          fillColor = 0x00ff00; // Green
        } else if (healthPercent > 0.25) {
          fillColor = 0xffff00; // Yellow
        } else {
          fillColor = 0xff0000; // Red
        }
        healthBar.setFillStyle(fillColor);
      }

      handleAttack(attackType) {
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 30;
          const socket = socketService.getSocket();
          socket.emit('player_attack', { attackType });
        }
      }
    }

    // Phaser Game Configuration
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 400,
      parent: gameRef.current,
      backgroundColor: '#111111',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: GameScene
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    return () => {
      if (game) {
        game.destroy(true);
      }
    };
  }, [gameStarted]);

  return (
    <div className="game-container">
      <h1>⚔️ StickArena</h1>
      {!gameStarted && <p>Loading game...</p>}
      <div ref={gameRef} id="phaser-game"></div>
    </div>
  );
};

export default GamePhaser;
