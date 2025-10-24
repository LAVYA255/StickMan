import React, { useEffect, useRef, useState } from 'react';
import socketService from '../services/socketService';
import idleSheet from '../assets/Idle-outline.png';
import walkSheet from '../assets/walk-outline.png';
import jumpSheet from '../assets/jump-outline.png';
import punchSheet from '../assets/Punch-outline.png';
import kickSheet from '../assets/kick-outline.png';
import './Game.css';

// Sprite animation config - based on separate sprite sheets
const SPRITE_CONFIG = {
  idle: { sheet: 'idle', frames: 4, speed: 0.08 },
  walk: { sheet: 'walk', frames: 8, speed: 0.04 }, // Slower animation
  walk: { sheet: 'walk', frames: 8, speed: 0.06 }, // slightly faster walk animation
  jump: { sheet: 'jump', frames: 2, speed: 0.25 }, // shorter visual jump duration
  punch: { sheet: 'punch', frames: 3, speed: 0.08 }, // Slower for single cycle
  kick: { sheet: 'kick', frames: 3, speed: 0.08 }, // Slower for single cycle
  run: { sheet: 'walk', frames: 8, speed: 0.1 }
};

const SHEET_DIMENSIONS = {
  idle: { frameWidth: 32, frameHeight: 32, framesPerRow: 4 },
  walk: { frameWidth: 32, frameHeight: 32, framesPerRow: 4 },
  jump: { frameWidth: 32, frameHeight: 32, framesPerRow: 2 },
  punch: { frameWidth: 32, frameHeight: 32, framesPerRow: 3 },
  kick: { frameWidth: 32, frameHeight: 32, framesPerRow: 3 }
};

const GameCanvas = () => {
  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [wins, setWins] = useState({ player1: 0, player2: 0 });
  const winRecordedRef = useRef(false); // Track if we already recorded this win
  const spriteSheetsRef = useRef({
    idle: null,
    walk: null,
    jump: null,
    punch: null,
    kick: null
  });
  const animationStateRef = useRef({
    player1: { state: 'idle', frameIndex: 0, counter: 0, lastAttackType: 'punch', attackAnimComplete: false },
    player2: { state: 'idle', frameIndex: 0, counter: 0, lastAttackType: 'punch', attackAnimComplete: false }
  });
  const inputRef = useRef({
    // Player 1 (A/D for left/right + W for jump + Q for punch + E for kick)
    p1_left: false,
    p1_right: false,
    p1_jump: false,
    p1_punch: false,
    p1_kick: false,
    p1_jumpPressed: false,
    p1_punchPressed: false,
    p1_kickPressed: false,
    // Player 2 (J/L for left/right + I for jump + U for punch + P for kick)
    p2_left: false,
    p2_right: false,
    p2_jump: false,
    p2_punch: false,
    p2_kick: false,
    p2_jumpPressed: false,
    p2_punchPressed: false,
    p2_kickPressed: false
  });

  useEffect(() => {
    console.log('🎮 GameCanvas mounted, ensuring socket connection...');
    socketService.connect();
    
    // Small delay to ensure socket is fully connected
    const connectionTimeout = setTimeout(() => {
      const socket = socketService.getSocket();
      
      if (!socket) {
        console.error('❌ Socket not available!');
        return;
      }
      
      console.log('✅ Socket available, setting up listeners...');
      
      // Load sprite sheets
      const loadImage = (src, key) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          spriteSheetsRef.current[key] = img;
        };
        img.onerror = () => console.error(`Failed to load sprite: ${key}`);
      };

      loadImage(idleSheet, 'idle');
      loadImage(walkSheet, 'walk');
      loadImage(jumpSheet, 'jump');
      loadImage(punchSheet, 'punch');
      loadImage(kickSheet, 'kick');

      socket.on('room_joined', (data) => {
        console.log('✅ Room joined:', data);
        setGameStarted(true);
      });

      socket.on('state_update', (state) => {
        console.log('📨 state_update received:', state);
        gameStateRef.current = state;
        
        // Check if game ended - ONLY increment win score ONCE
        if (state.gameState === 'ended' && !gameEnded && !winRecordedRef.current) {
          console.log('🏆 Game ended! Winner:', state.winner);
          winRecordedRef.current = true; // Mark that we've recorded this win
          setGameEnded(true);
          if (state.winner) {
            setWinner(state.winner);
            // Update win score ONLY ONCE
            setWins(prevWins => ({
              ...prevWins,
              [state.winner.playerNumber === 1 ? 'player1' : 'player2']: 
                prevWins[state.winner.playerNumber === 1 ? 'player1' : 'player2'] + 1
            }));
          }
        }
      });

      socket.on('match_restarted', (data) => {
        console.log('🔄 Match restarted:', data);
        winRecordedRef.current = false; // Reset win recording flag for next match
        setGameEnded(false);
        setWinner(null);
      });

      // Emit join_local_multiplayer
      console.log('📡 Emitting join_local_multiplayer...');
      socket.emit('join_local_multiplayer', {
        player1Name: localStorage.getItem('username') || 'Player 1',
        player2Name: 'Player 2',
        userId: localStorage.getItem('userId') || 'unknown'
      });

      // Keyboard handlers (now inside setTimeout so socket is in scope)
      const handleKeyDown = (e) => {
        const key = e.key.toLowerCase();
        console.log('⌨️ Key down:', key);
        
        // Player 1 controls (A/D for move, W for jump, Q for punch, E for kick)
        if (key === 'a') {
          inputRef.current.p1_left = true;
          console.log('👤 P1 left');
        }
        if (key === 'd') {
          inputRef.current.p1_right = true;
          console.log('👤 P1 right');
        }
        if (key === 'w') {
          if (!inputRef.current.p1_jumpPressed) {
            inputRef.current.p1_jumpPressed = true;
            socket.emit('player_jump');
            console.log('👤 P1 jump');
          }
        }
        if (key === 'q') {
          if (!inputRef.current.p1_punchPressed) {
            inputRef.current.p1_punchPressed = true;
            socket.emit('player_attack', { attackType: 'punch' });
            console.log('👤 P1 punch');
          }
        }
        if (key === 'e') {
          if (!inputRef.current.p1_kickPressed) {
            inputRef.current.p1_kickPressed = true;
            socket.emit('player_attack', { attackType: 'kick' });
            console.log('👤 P1 kick');
          }
        }

        // Player 2 controls (J/L for move, I for jump, U for punch, P for kick)
        if (key === 'j') {
          inputRef.current.p2_left = true;
          console.log('👥 P2 left');
        }
        if (key === 'l') {
          inputRef.current.p2_right = true;
          console.log('👥 P2 right');
        }
        if (key === 'i') {
          if (!inputRef.current.p2_jumpPressed) {
            inputRef.current.p2_jumpPressed = true;
            socket.emit('player2_jump');
            console.log('👥 P2 jump');
          }
        }
        if (key === 'u') {
          if (!inputRef.current.p2_punchPressed) {
            inputRef.current.p2_punchPressed = true;
            socket.emit('player2_attack', { attackType: 'punch' });
            console.log('👥 P2 punch');
          }
        }
        if (key === 'p') {
          if (!inputRef.current.p2_kickPressed) {
            inputRef.current.p2_kickPressed = true;
            socket.emit('player2_attack', { attackType: 'kick' });
            console.log('👥 P2 kick');
          }
        }
      };

      const handleKeyUp = (e) => {
        const key = e.key.toLowerCase();
        
        // Player 1 key releases
        if (key === 'a') inputRef.current.p1_left = false;
        if (key === 'd') inputRef.current.p1_right = false;
        if (key === 'w') inputRef.current.p1_jumpPressed = false;
        if (key === 'q') inputRef.current.p1_punchPressed = false;
        if (key === 'e') inputRef.current.p1_kickPressed = false;

        // Player 2 key releases
        if (key === 'j') inputRef.current.p2_left = false;
        if (key === 'l') inputRef.current.p2_right = false;
        if (key === 'i') inputRef.current.p2_jumpPressed = false;
        if (key === 'u') inputRef.current.p2_punchPressed = false;
        if (key === 'p') inputRef.current.p2_kickPressed = false;
      };

      // Attach keyboard listeners to window
      console.log('🎮 Adding keyboard event listeners to window');
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        console.log('🎮 Removing keyboard event listeners');
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        socket.off('room_joined');
        socket.off('state_update');
      };
    }, 200);

    return () => {
      clearTimeout(connectionTimeout);
    };
  }, []);

  // Debug input state
  useEffect(() => {
    const debugInterval = setInterval(() => {
      const state = inputRef.current;
      if (state.p1_left || state.p1_right || state.p2_left || state.p2_right) {
        console.log('📥 Input state:', {
          p1_left: state.p1_left, p1_right: state.p1_right,
          p2_left: state.p2_left, p2_right: state.p2_right
        });
      }
    }, 500);
    return () => clearInterval(debugInterval);
  }, []);

  // Send movement to server
  useEffect(() => {
    const interval = setInterval(() => {
      const socket = socketService.getSocket();
      
      // Player 1 movement (J/L keys)
      if (inputRef.current.p1_left) {
        socket.emit('player_move', { direction: 'left' });
      } else if (inputRef.current.p1_right) {
        socket.emit('player_move', { direction: 'right' });
      } else {
        socket.emit('player_move', { direction: 'stop' });
      }

      // Player 2 movement (J/L keys - same as P1)
      if (inputRef.current.p2_left) {
        socket.emit('player2_move', { direction: 'left' });
      } else if (inputRef.current.p2_right) {
        socket.emit('player2_move', { direction: 'right' });
      } else {
        socket.emit('player2_move', { direction: 'stop' });
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Canvas rendering loop
  useEffect(() => {
    if (!gameStarted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let renderCounter = 0;

    const renderLoop = () => {
      renderCounter++;
      
      // Clear canvas
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, 800, 400);

      // Draw ground
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 350);
      ctx.lineTo(800, 350);
      ctx.stroke();

      const gameState = gameStateRef.current;
      if (gameState && gameState.players) {
        const humanPlayer = gameState.players.find(p => p.playerNumber === 1);
        const player2 = gameState.players.find(p => p.playerNumber === 2);

        if (humanPlayer) {
          // Adjust position upward to fit larger sprites (doubled size)
          const adjustedPlayer1 = { ...humanPlayer, y: humanPlayer.y - 80 };
          if (renderCounter % 30 === 0) {
            console.log('🎨 Rendering P1 at', adjustedPlayer1.x, adjustedPlayer1.y, 'vel:', humanPlayer.velocityX);
          }
          drawStickman(ctx, adjustedPlayer1, 'player1');
        }
        if (player2) {
          // Adjust position upward to fit larger sprites (doubled size)
          const adjustedPlayer2 = { ...player2, y: player2.y - 80 };
          if (renderCounter % 30 === 0) {
            console.log('🎨 Rendering P2 at', adjustedPlayer2.x, adjustedPlayer2.y, 'vel:', player2.velocityX);
          }
          drawStickman(ctx, adjustedPlayer2, 'player2');
        }

        // Draw health bars for both players
        drawHealthBar(ctx, humanPlayer, 20, 20);
        drawHealthBar(ctx, player2, 620, 20);

        // Draw instructions for local multiplayer
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Arial';
        ctx.fillText('P1: A/D Move, W Jump, Z Punch, X Kick', 10, 395);
        ctx.fillText('P2: I/K Move, O Jump, U Punch, P Kick', 10, 408);
      }

      requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }, [gameStarted]);

  const updateAnimationState = (playerKey, currentVelocityX, isAttacking, attackType, isJumping, hp) => {
    const animState = animationStateRef.current[playerKey];
    let newState = 'idle';

    if (!hp || hp <= 0) {
      newState = 'idle'; // No dead animation
    } else if (isAttacking) {
      // Store attack type for animation selection
      animState.lastAttackType = attackType;
      animState.attackAnimComplete = false; // Reset on new attack
      if (attackType === 'kick') {
        newState = 'kick';
      } else {
        newState = 'punch';
      }
    } else if (isJumping) {
      newState = 'jump';
    } else if (Math.abs(currentVelocityX) > 0) {
      // Use walk animation for any left/right movement
      newState = 'walk';
    } else {
      newState = 'idle';
    }

    // If state changed, reset animation
    if (animState.state !== newState) {
      animState.state = newState;
      animState.frameIndex = 0;
      animState.counter = 0;
    }

    // Update frame animation - but stick to frame 1 while jumping
    const config = SPRITE_CONFIG[newState];
    if (config) {
      // For jump animation, stick to frame 1 (mid-air) - don't animate
      if (newState === 'jump') {
        animState.frameIndex = 1;
      } else if (newState === 'punch' || newState === 'kick') {
        // For punch/kick, play once and stop
        animState.counter += config.speed;

        if (animState.counter >= 1) {
          if (animState.frameIndex < config.frames - 1) {
            animState.frameIndex++;
            animState.counter = 0;
          } else {
            // Animation complete, mark it
            animState.attackAnimComplete = true;
            // Keep last frame visible
          }
        }
      } else {
        // Regular looping animation
        animState.counter += config.speed;

        if (animState.counter >= 1) {
          animState.frameIndex = (animState.frameIndex + 1) % config.frames;
          animState.counter = 0;
        }
      }
    }
  };

  const drawSpriteFrame = (ctx, state, frameIndex, x, y, flipH = false) => {
    const spriteSheet = spriteSheetsRef.current[state];
    if (!spriteSheet) return;

    const dims = SHEET_DIMENSIONS[state];
    if (!dims) return;

    const { frameWidth, frameHeight, framesPerRow } = dims;
    
    // Calculate row and column from frame index
    const row = Math.floor(frameIndex / framesPerRow);
    const col = frameIndex % framesPerRow;

    const sourceX = col * frameWidth;
    const sourceY = row * frameHeight;

  // Display size - scale up ~10x to visually double the characters
  const scale = 10;
    const displayWidth = frameWidth * scale;
    const displayHeight = frameHeight * scale;

    if (flipH) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(
        spriteSheet,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        -displayWidth / 2,
        -displayHeight / 2,
        displayWidth,
        displayHeight
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        spriteSheet,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        x - displayWidth / 2,
        y - displayHeight / 2,
        displayWidth,
        displayHeight
      );
    }
  };

  const drawStickman = (ctx, player, playerKey) => {
    if (!player) return;

    const x = player.x;
    const y = player.y;

    // Update animation - pass attackType
    updateAnimationState(playerKey, player.velocityX, player.isAttacking, player.attackType, player.isJumping, player.hp);
    const animState = animationStateRef.current[playerKey];
    const config = SPRITE_CONFIG[animState.state];
    
    if (!config) return;

    // Get frame from current animation
    const frameIndex = animState.frameIndex % config.frames;

    // Draw sprite with the current state
    drawSpriteFrame(ctx, animState.state, frameIndex, x, y, player.direction === -1);

    // Name below character
    const nameColor = playerKey === 'player1' ? '#ff0000' : '#0000ff';
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.username, x, y + 50);
  };

  const drawHealthBar = (ctx, player, x, y) => {
    if (!player) return;

    const barWidth = 150;
    const barHeight = 20;
    const healthPercent = Math.max(0, player.hp) / 100;

    // Background
    ctx.fillStyle = '#330000';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Health bar
    let barColor = '#00ff00';
    if (healthPercent <= 0.25) barColor = '#ff0000';
    else if (healthPercent <= 0.5) barColor = '#ffff00';

    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${player.username}: ${Math.max(0, Math.floor(player.hp))}`, x + 5, y + 35);
  };

  const handleRestartMatch = () => {
    const socket = socketService.getSocket();
    socket.emit('restart_match');
  };

  return (
    <div className="game-container">
      {/* Game Header with Title and Win Scores */}
      <div style={{
        width: '100%',
        maxWidth: '900px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ margin: '0', color: '#333', fontSize: '28px' }}>⚔️ StickArena</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Local Multiplayer</p>
        </div>
        <div style={{
          display: 'flex',
          gap: '30px',
          alignItems: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '10px 20px',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            borderRadius: '8px',
            border: '2px solid #ff0000'
          }}>
            <div style={{ color: '#ff0000', fontWeight: 'bold', fontSize: '16px' }}>Player 1</div>
            <div style={{ color: '#ff0000', fontSize: '20px', fontWeight: 'bold' }}>{wins.player1}</div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '10px 20px',
            backgroundColor: 'rgba(0, 0, 255, 0.1)',
            borderRadius: '8px',
            border: '2px solid #0000ff'
          }}>
            <div style={{ color: '#0000ff', fontWeight: 'bold', fontSize: '16px' }}>Player 2</div>
            <div style={{ color: '#0000ff', fontSize: '20px', fontWeight: 'bold' }}>{wins.player2}</div>
          </div>
        </div>
      </div>

      {/* Game Canvas Wrapper */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '900px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        marginBottom: '20px'
      }}>
        {!gameStarted && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px' }}>🔄 Waiting for game to start...</p>
            <p style={{ fontSize: '12px', color: '#999' }}>Check browser console for logs</p>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          style={{
            border: '3px solid #333',
            display: 'block',
            margin: '0 auto',
            backgroundColor: '#111111',
            borderRadius: '8px',
            cursor: 'auto'
          }}
        />

        {/* Winner Modal - Fixed Positioning */}
        {gameEnded && winner && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              backgroundColor: 'white',
              border: '4px solid gold',
              borderRadius: '15px',
              padding: '40px',
              textAlign: 'center',
              minWidth: '350px',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideDown 0.4s ease-out'
            }}>
              <h2 style={{ 
                color: 'gold', 
                fontSize: '36px', 
                marginBottom: '20px',
                marginTop: 0
              }}>🏆 VICTORY 🏆</h2>
              
              <div style={{
                backgroundColor: winner.playerNumber === 1 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '15px',
                border: `2px solid ${winner.playerNumber === 1 ? '#ff0000' : '#0000ff'}`
              }}>
                <p style={{ 
                  color: '#333',
                  fontSize: '18px', 
                  margin: '0 0 10px 0'
                }}>
                  WINNER
                </p>
                <p style={{ 
                  color: winner.playerNumber === 1 ? '#ff0000' : '#0000ff',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  margin: 0
                }}>
                  {winner.username}
                </p>
              </div>

              {/* Win Score Display */}
              <div style={{
                backgroundColor: '#f0f0f0',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '25px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                <div>
                  <div style={{ color: '#ff0000', fontWeight: 'bold', fontSize: '14px' }}>Player 1</div>
                  <div style={{ color: '#ff0000', fontSize: '24px', fontWeight: 'bold' }}>{wins.player1}</div>
                </div>
                <div>
                  <div style={{ color: '#0000ff', fontWeight: 'bold', fontSize: '14px' }}>Player 2</div>
                  <div style={{ color: '#0000ff', fontSize: '24px', fontWeight: 'bold' }}>{wins.player2}</div>
                </div>
              </div>

              <button
                onClick={handleRestartMatch}
                style={{
                  backgroundColor: '#00cc00',
                  color: '#000',
                  border: 'none',
                  padding: '14px 40px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 204, 0, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#00ff00';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#00cc00';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                🔄 Restart Match
              </button>
            </div>
            <style>{`
              @keyframes slideDown {
                from {
                  transform: translateY(-50px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Controls Information */}
      <div style={{
        width: '100%',
        maxWidth: '900px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 10px 0', color: '#ff0000', fontSize: '16px' }}>👤 Player 1 Controls</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#333', fontSize: '14px' }}>
              <li><strong>A</strong> - Move Left</li>
              <li><strong>D</strong> - Move Right</li>
              <li><strong>W</strong> - Jump</li>
              <li><strong>Q</strong> - Punch</li>
              <li><strong>E</strong> - Kick</li>
            </ul>
          </div>
          <div>
            <h3 style={{ margin: '0 0 10px 0', color: '#0000ff', fontSize: '16px' }}>👥 Player 2 Controls</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#333', fontSize: '14px' }}>
              <li><strong>J</strong> - Move Left</li>
              <li><strong>L</strong> - Move Right</li>
              <li><strong>I</strong> - Jump</li>
              <li><strong>U</strong> - Punch</li>
              <li><strong>P</strong> - Kick</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;
