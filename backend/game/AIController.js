/**
 * AIController Class
 * Controls AI opponent behavior with HARD difficulty
 * Features: Aggressive behavior, smart positioning, varied attacks, counter-attacks
 */

class AIController {
  constructor(aiPlayer, humanPlayer) {
    this.aiPlayer = aiPlayer;
    this.humanPlayer = humanPlayer;
    this.updateCounter = 0;
    this.actionCooldown = 0;
    this.currentAction = null;
    this.targetX = null;
    
    // Hard difficulty settings
    this.reactionSpeed = 10; // Slower reactions (updates every 10 frames ~170ms)
    this.attackAccuracy = 0.70; // 70% chance to attack when in range (reduced from 85%)
    this.dodgeChance = 0.5; // 50% chance to dodge incoming attacks (reduced from 70%)
    this.aggressiveness = 0.6; // 60% aggressive (reduced from 80%)
    this.comboChance = 0.4; // 40% chance to follow up attacks (reduced from 60%)
    this.perfectDistanceRange = 80; // Optimal attack distance (increased from 50)
  }

  /**
   * Main AI update loop - called every frame
   */
  update() {
    if (!this.aiPlayer.isAlive || !this.humanPlayer.isAlive) return;

    this.updateCounter++;

    // AI makes decisions every few frames (reaction speed)
    if (this.updateCounter % this.reactionSpeed === 0) {
      this.makeDecision();
    }

    // Execute current action
    this.executeAction();

    // Decrease cooldowns
    if (this.actionCooldown > 0) {
      this.actionCooldown--;
    }
  }

  /**
   * AI decision-making logic
   */
  makeDecision() {
    const distance = Math.abs(this.aiPlayer.x - this.humanPlayer.x);
    const heightDiff = Math.abs(this.aiPlayer.y - this.humanPlayer.y);
    const isHumanAttacking = this.humanPlayer.isAttacking;
    const aiHP = this.aiPlayer.hp;
    const humanHP = this.humanPlayer.hp;

    // Priority 1: Dodge if human is attacking and in range
    if (isHumanAttacking && distance < 80 && Math.random() < this.dodgeChance) {
      this.dodgeAttack();
      return;
    }

    // Priority 2: Attack if in perfect range
    if (distance < 70 && heightDiff < 50 && this.actionCooldown === 0) {
      if (Math.random() < this.attackAccuracy) {
        this.chooseAttack(distance);
        return;
      }
    }

    // Priority 3: Aggressive behavior - chase if HP advantage
    if (aiHP > humanHP && this.aggressiveness > Math.random()) {
      this.chaseOpponent(distance);
      return;
    }

    // Priority 4: Strategic positioning
    if (distance > 100) {
      // Too far - move closer
      this.moveTowards(this.humanPlayer.x);
    } else if (distance < 30) {
      // Too close - create space for attack
      this.moveAway(this.humanPlayer.x);
    } else if (distance > 60 && distance < 100) {
      // Good distance - position for attack
      this.positionForAttack(distance);
    }

    // Random jump to avoid predictability (10% chance)
    if (Math.random() < 0.1 && !this.aiPlayer.isJumping) {
      this.currentAction = 'jump';
    }
  }

  /**
   * Dodge incoming attack by jumping or moving away
   */
  dodgeAttack() {
    const distance = this.aiPlayer.x - this.humanPlayer.x;
    
    if (Math.random() < 0.5) {
      // Jump dodge
      this.currentAction = 'jump';
    } else {
      // Move away
      this.targetX = this.aiPlayer.x + (distance > 0 ? 50 : -50);
      this.currentAction = 'move';
    }
    
    this.actionCooldown = 25; // Increased from 15
  }

  /**
   * Choose which attack to use based on distance and combo potential
   */
  chooseAttack(distance) {
    // Combo attack if recently attacked
    if (this.aiPlayer.isAttacking && Math.random() < this.comboChance) {
      this.actionCooldown = 10; // Increased from 5
      return;
    }

    // Close range - prefer punch (faster)
    // Medium range - prefer kick (more damage, longer reach)
    if (distance < 50) {
      this.currentAction = Math.random() < 0.6 ? 'punch' : 'kick';
    } else {
      this.currentAction = Math.random() < 0.3 ? 'punch' : 'kick';
    }

    this.actionCooldown = this.currentAction === 'punch' ? 30 : 45; // Increased cooldowns
  }

  /**
   * Aggressively chase the opponent
   */
  chaseOpponent(distance) {
    this.moveTowards(this.humanPlayer.x);
    
    // Jump while chasing for unpredictability
    if (Math.random() < 0.15 && !this.aiPlayer.isJumping) {
      this.currentAction = 'jump';
    }
  }

  /**
   * Position AI at optimal attack distance
   */
  positionForAttack(distance) {
    const targetDistance = this.perfectDistanceRange;
    
    if (distance > targetDistance + 10) {
      this.moveTowards(this.humanPlayer.x);
    } else if (distance < targetDistance - 10) {
      this.moveAway(this.humanPlayer.x);
    } else {
      // Perfect distance - stop moving
      this.currentAction = 'stop';
    }
  }

  /**
   * Move towards a target X position
   */
  moveTowards(targetX) {
    if (this.aiPlayer.x < targetX - 10) {
      this.currentAction = 'right';
      this.aiPlayer.direction = 1;
    } else if (this.aiPlayer.x > targetX + 10) {
      this.currentAction = 'left';
      this.aiPlayer.direction = -1;
    } else {
      this.currentAction = 'stop';
    }
  }

  /**
   * Move away from a target X position
   */
  moveAway(fromX) {
    if (this.aiPlayer.x < fromX) {
      this.currentAction = 'left';
      this.aiPlayer.direction = -1;
    } else {
      this.currentAction = 'right';
      this.aiPlayer.direction = 1;
    }
  }

  /**
   * Execute the current action
   */
  executeAction() {
    if (!this.currentAction) return;

    return {
      action: this.currentAction,
      attackType: (this.currentAction === 'punch' || this.currentAction === 'kick') 
        ? this.currentAction 
        : null
    };
  }

  /**
   * Get current AI action for the game room
   */
  getAction() {
    const action = this.executeAction();
    
    // Clear single-use actions
    if (action && (action.action === 'jump' || action.action === 'punch' || action.action === 'kick')) {
      this.currentAction = null;
    }
    
    return action;
  }

  /**
   * Reset AI state
   */
  reset() {
    this.updateCounter = 0;
    this.actionCooldown = 0;
    this.currentAction = null;
    this.targetX = null;
  }
}

module.exports = AIController;
