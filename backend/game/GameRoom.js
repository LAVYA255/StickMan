/**
 * GameRoom Class
 * Manages game state, player actions, collision detection, and match outcomes
 * Supports local multiplayer (2 players) mode only
 */

class GameRoom {
  constructor(roomId, isSinglePlayer = false) {
    this.roomId = roomId;
    this.players = {}; // { socketId: playerData }
    this.gameState = 'waiting'; // waiting, playing, ended
    this.startTime = null;
    this.isSinglePlayer = isSinglePlayer; // Not used, kept for compatibility
    
    // Game constants
    this.CANVAS_WIDTH = 800;
    this.CANVAS_HEIGHT = 400;
    this.GROUND_Y = 350;
  // Physics tuned for snappier, street-fighter-like feel
  this.GRAVITY = 1.0; // balanced gravity for new sprite scale
  this.JUMP_FORCE = -16; // increased upward force to compensate for doubled sprite size
  this.MOVE_SPEED = 3.5; // Base movement speed
  this.ACCELERATION = 0.6; // Acceleration when moving
  this.DECELERATION = 0.8; // Friction when stopping
  this.MAX_MOVE_SPEED = 4.5; // Terminal velocity for movement
  this.ATTACK_RANGE = 100; // wider reach for larger sprites
  this.ATTACK_DAMAGE = 12;
  this.COLLISION_DAMAGE = 6; // damage when an attacking sprite overlaps opponent
  // hitbox approximations (used for overlap checks)
  this.HITBOX_WIDTH = 120;
  this.HITBOX_HEIGHT = 160;
    this.MAX_HP = 100;
    this.BOUNDARY_PADDING = 40; // How close to edge before being pushed back
  }

  /**
   * Add a player to the room
   */
  addPlayer(socketId, username, userId) {
    const playerNumber = Object.keys(this.players).length + 1;
    
    this.players[socketId] = {
      socketId,
      username,
      userId,
      playerNumber,
      x: playerNumber === 1 ? 150 : 650, // Starting positions
      y: this.GROUND_Y,
      velocityX: 0,
      velocityY: 0,
      hp: this.MAX_HP,
      isJumping: false,
      isAttacking: false,
      attackType: null, // 'punch' or 'kick'
      attackCooldown: 0,
      direction: playerNumber === 1 ? 1 : -1, // 1 = right, -1 = left
      isAlive: true,
      isAI: false,
      // Attack bookkeeping to avoid multi-applying damage from a single animation
      attackHitApplied: false
    };

    // Start game when both players join
    if (Object.keys(this.players).length === 2) {
      this.gameState = 'playing';
      this.startTime = Date.now();
    }

    return this.players[socketId];
  }

  /**
   * Remove a player from the room
   */
  removePlayer(socketId) {
    delete this.players[socketId];
    
    if (Object.keys(this.players).length === 0) {
      this.gameState = 'ended';
    }
  }

  /**
   * Handle player movement input
   */
  handlePlayerMove(socketId, direction) {
    const player = this.players[socketId];
    if (!player || !player.isAlive || this.gameState !== 'playing') return;

    // Acceleration-based movement like Street Fighter
    if (direction === 'left') {
      player.velocityX = Math.max(player.velocityX - this.ACCELERATION, -this.MAX_MOVE_SPEED);
      player.direction = -1; // Always face the direction moving
    } else if (direction === 'right') {
      player.velocityX = Math.min(player.velocityX + this.ACCELERATION, this.MAX_MOVE_SPEED);
      player.direction = 1;
    } else if (direction === 'stop') {
      // Deceleration with friction
      if (player.velocityX > 0) {
        player.velocityX = Math.max(0, player.velocityX - this.DECELERATION);
      } else if (player.velocityX < 0) {
        player.velocityX = Math.min(0, player.velocityX + this.DECELERATION);
      }
    }
  }

  /**
   * Handle player jump
   */
  handlePlayerJump(socketId) {
    const player = this.players[socketId];
    if (!player || !player.isAlive || this.gameState !== 'playing') return;

    // Only jump if on ground
    if (!player.isJumping && player.y >= this.GROUND_Y) {
      player.velocityY = this.JUMP_FORCE;
      player.isJumping = true;
    }
  }

  /**
   * Handle player attack
   */
  handlePlayerAttack(socketId, attackType) {
    const player = this.players[socketId];
    if (!player || !player.isAlive || this.gameState !== 'playing') return;

    // Check attack cooldown (prevent spamming)
    if (player.attackCooldown > 0 || player.isAttacking) return;

    player.isAttacking = true;
    player.attackType = attackType; // 'punch' or 'kick'
    player.attackCooldown = attackType === 'punch' ? 20 : 30; // frames
    // allow this attack to apply damage once
    player.attackHitApplied = false;

    // On attack start, immediately check collision (authoritative)
    this.checkAttackCollision(socketId);

    // Reset attack state after animation
    setTimeout(() => {
      player.isAttacking = false;
      player.attackType = null;
      // reset hit flag so next attack can apply damage
      player.attackHitApplied = false;
    }, attackType === 'punch' ? 200 : 300);
  }

  /**
   * Check if an attack hits the opponent
   */
  checkAttackCollision(attackerSocketId) {
    const attacker = this.players[attackerSocketId];
    
    // Find opponent
    const opponentSocketId = Object.keys(this.players).find(id => id !== attackerSocketId);
    const opponent = this.players[opponentSocketId];

    if (!opponent || !opponent.isAlive) return;

    // Build bounding boxes for attacker attack hitbox and opponent hitbox
    // Attacker hitbox is offset in facing direction by a bit (attack reach)
    const attackReach = this.ATTACK_RANGE;
    const attackWidth = this.HITBOX_WIDTH;
    const attackHeight = this.HITBOX_HEIGHT;

    const attackerBox = {
      x: attacker.x + (attacker.direction * (attackReach / 2)),
      y: attacker.y - attackHeight / 2,
      w: attackWidth,
      h: attackHeight
    };

    const opponentBox = {
      x: opponent.x - this.HITBOX_WIDTH / 2,
      y: opponent.y - this.HITBOX_HEIGHT / 2,
      w: this.HITBOX_WIDTH,
      h: this.HITBOX_HEIGHT
    };

    // Simple AABB overlap test
    const overlap = !(attackerBox.x + attackerBox.w < opponentBox.x ||
                      attackerBox.x > opponentBox.x + opponentBox.w ||
                      attackerBox.y + attackerBox.h < opponentBox.y ||
                      attackerBox.y > opponentBox.y + opponentBox.h);

    if (overlap) {
      // Ensure we only apply damage once per attack animation
      if (attacker.attackHitApplied) return true;

      const baseDamage = attacker.attackType === 'kick' ? this.ATTACK_DAMAGE + 5 : this.ATTACK_DAMAGE;
      // apply both attack damage and a small collision damage bonus
      const damage = baseDamage + this.COLLISION_DAMAGE;
      opponent.hp = Math.max(0, opponent.hp - damage);
      attacker.attackHitApplied = true;

      // Check if opponent is defeated
      if (opponent.hp <= 0) {
        opponent.isAlive = false;
        this.gameState = 'ended';
      }

      return true; // Hit confirmed
    }

    return false; // Miss
  }

  /**
   * Update game physics and state (called every frame)
   */
  update() {
    // Continue updating even if game ended, so final state can be sent to clients
    if (this.gameState !== 'playing' && this.gameState !== 'ended') return;

    this.updateCounter = (this.updateCounter || 0) + 1;

    // Get both players
    const players = Object.values(this.players);
    if (players.length !== 2) return;

    const player1 = players.find(p => p.playerNumber === 1);
    const player2 = players.find(p => p.playerNumber === 2);

    // Only update physics if game is still playing
    if (this.gameState === 'playing') {
      players.forEach(player => {
        if (!player.isAlive) return;

        // Apply gravity
        player.velocityY += this.GRAVITY;

        // Update position
        player.x += player.velocityX;
        player.y += player.velocityY;

        // Boundary checks - push back if hitting edges
        if (player.x < this.BOUNDARY_PADDING) {
          player.x = this.BOUNDARY_PADDING;
          player.velocityX = 0; // Stop momentum at boundary
        }
        if (player.x > this.CANVAS_WIDTH - this.BOUNDARY_PADDING) {
          player.x = this.CANVAS_WIDTH - this.BOUNDARY_PADDING;
          player.velocityX = 0; // Stop momentum at boundary
        }

        // Ground collision
        if (player.y >= this.GROUND_Y) {
          player.y = this.GROUND_Y;
          player.velocityY = 0;
          player.isJumping = false;
        }

        // Decrease attack cooldown
        if (player.attackCooldown > 0) {
          player.attackCooldown--;
        }
      });
    }

    // Make players always face each other (even when game ended)
    if (player1 && player2) {
      if (player1.x < player2.x) {
        player1.direction = 1;  // P1 faces right (towards P2)
        player2.direction = -1; // P2 faces left (towards P1)
      } else {
        player1.direction = -1; // P1 faces left (towards P2)
        player2.direction = 1;  // P2 faces right (towards P1)
      }

      // Check if players crossed over (jumped to other side)
      if (player1.playerNumber === 1 && player2.playerNumber === 2) {
        // If P1 is now to the right of P2, they've switched sides
        if (player1.x > player2.x) {
          // They've crossed - this is handled automatically by the facing logic above
        }
      }
    }

    // During the update, if someone is mid-attack and hasn't applied damage yet, re-check collision
    players.forEach(player => {
      if (!player.isAlive) return;
      if (player.isAttacking && !player.attackHitApplied) {
        this.checkAttackCollision(player.socketId);
      }
    });

    return this.getGameState();
  }

  /**
   * Get current game state for broadcasting
   */
  getGameState() {
    const playerStates = Object.values(this.players).map(p => ({
      socketId: p.socketId,
      username: p.username,
      playerNumber: p.playerNumber,
      x: Math.round(p.x),
      y: Math.round(p.y),
      hp: p.hp,
      direction: p.direction,
      isJumping: p.isJumping,
      isAttacking: p.isAttacking,
      attackType: p.attackType,
      isAlive: p.isAlive
    }));

    let winner = null;
    if (this.gameState === 'ended') {
      const alivePlayer = playerStates.find(p => p.isAlive);
      winner = alivePlayer ? { playerNumber: alivePlayer.playerNumber, username: alivePlayer.username } : null;
    }

    return {
      roomId: this.roomId,
      gameState: this.gameState,
      players: playerStates,
      winner: winner,
      timestamp: Date.now()
    };
  }

  /**
   * Get match result when game ends
   */
  getMatchResult() {
    const players = Object.values(this.players);
    
    if (players.length !== 2) return null;

    const winner = players.find(p => p.isAlive) || players[0];
    const loser = players.find(p => !p.isAlive) || players[1];

    const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;

    return {
      winner: {
        socketId: winner.socketId,
        username: winner.username,
        userId: winner.userId,
        hp: winner.hp
      },
      loser: {
        socketId: loser.socketId,
        username: loser.username,
        userId: loser.userId,
        hp: loser.hp
      },
      duration
    };
  }

  /**
   * Check if room is full
   */
  isFull() {
    return Object.keys(this.players).length >= 2;
  }

  /**
   * Check if room is empty
   */
  isEmpty() {
    return Object.keys(this.players).length === 0;
  }

  /**
   * Restart the game - reset HP and states for both players
   */
  restartGame() {
    Object.values(this.players).forEach(player => {
      player.hp = this.MAX_HP;
      player.isAlive = true;
      player.isAttacking = false;
      player.isJumping = false;
      player.attackType = null;
      player.attackCooldown = 0;
      player.velocityX = 0;
      player.velocityY = 0;
      player.attackHitApplied = false;
      // Reset positions
      player.x = player.playerNumber === 1 ? 150 : 650;
      player.y = this.GROUND_Y;
    });
    this.gameState = 'playing';
    this.startTime = Date.now();
  }
}

module.exports = GameRoom;
