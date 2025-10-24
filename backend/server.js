require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const GameRoom = require('./game/GameRoom');
const User = require('./models/User');
const Match = require('./models/Match');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIO(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://stick-man-vert.vercel.app'
    ],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://stick-man-vert.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// ============================================
// SOCKET.IO GAME LOGIC
// ============================================

// Store active game rooms and waiting players
const gameRooms = new Map(); // roomId -> GameRoom instance
const playerSocketMap = new Map(); // socketId -> { roomId, username, userId }
const waitingPlayers = []; // Queue for matchmaking

// Game loop: Update all active games at 30 FPS (slower, more playable)
const TICK_RATE = 1000 / 30; // 30 FPS instead of 60
let tickCounter = 0;
setInterval(() => {
  gameRooms.forEach((room, roomId) => {
    // Continue updating even if game ended, so final state can be shown on canvas
    if (room.gameState === 'playing' || room.gameState === 'ended') {
      room.update(); // Update physics and AI
      const gameState = room.getGameState(); // Get current state
      
      // Log every 60 ticks (once per second)
      if (tickCounter % 60 === 0) {
        const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
        console.log(`📡 Broadcasting to room ${roomId}, sockets: ${socketsInRoom ? Array.from(socketsInRoom).join(', ') : 'none'}`);
        // Also log player positions briefly for debugging
        if (gameState && gameState.players) {
          const positions = gameState.players.map(p => `${p.username}(${p.x},${p.y})`).join(' | ');
          console.log(`📍 Room ${roomId} positions: ${positions}`);
        }
      }
      
      // Broadcast updated state to all players in the room
      io.to(roomId).emit('state_update', gameState);
      
      // ALSO send directly to each socket in playerSocketMap for this room
      playerSocketMap.forEach((info, socketId) => {
        if (info.roomId === roomId) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('state_update', gameState);
          }
        }
      });

      // Check if game ended
      if (room.gameState === 'ended') {
        handleMatchEnd(room);
      }
    }
  });
  tickCounter++;
}, TICK_RATE);

/**
 * Handle match end: Save to database and notify players
 */
async function handleMatchEnd(room) {
  const result = room.getMatchResult();
  
  if (!result) return;

  try {
    // Update player statistics in database
    await User.findByIdAndUpdate(result.winner.userId, {
      $inc: { wins: 1, totalMatches: 1 }
    });

    await User.findByIdAndUpdate(result.loser.userId, {
      $inc: { losses: 1, totalMatches: 1 }
    });

    // Save match record
    const match = new Match({
      winner: result.winner.userId,
      loser: result.loser.userId,
      winnerUsername: result.winner.username,
      loserUsername: result.loser.username,
      winnerHP: result.winner.hp,
      loserHP: result.loser.hp,
      duration: result.duration
    });
    await match.save();

    // Broadcast match end to room
    io.to(room.roomId).emit('match_end', {
      winner: result.winner.username,
      loser: result.loser.username,
      winnerHP: result.winner.hp,
      duration: result.duration
    });

    console.log(`✅ Match ended in room ${room.roomId}: ${result.winner.username} defeated ${result.loser.username}`);
  } catch (error) {
    console.error('Error saving match result:', error);
  }
}

// ============================================
// SOCKET.IO EVENT HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  /**
   * Event: join_room
   * Player requests to join a game room (matchmaking)
   */
  socket.on('join_room', ({ username, userId, roomId }) => {
    try {
      let room;
      let joinedRoomId = roomId;

      // If specific room ID provided, try to join that room
      if (roomId && gameRooms.has(roomId)) {
        room = gameRooms.get(roomId);
        
        if (room.isFull()) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }
      } else {
        // Matchmaking: Find available room or create new one
        const availableRoom = Array.from(gameRooms.values()).find(r => !r.isFull());
        
        if (availableRoom) {
          room = availableRoom;
          joinedRoomId = room.roomId;
        } else {
          // Create new room
          joinedRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          room = new GameRoom(joinedRoomId);
          gameRooms.set(joinedRoomId, room);
        }
      }

      // Add player to room
      const playerData = room.addPlayer(socket.id, username, userId);
      playerSocketMap.set(socket.id, { roomId: joinedRoomId, username, userId });
      
      // Join Socket.IO room
      socket.join(joinedRoomId);

      // Notify player they joined FIRST
      socket.emit('room_joined', {
        roomId: joinedRoomId,
        playerNumber: playerData.playerNumber,
        gameState: room.gameState
      });

      // Send immediate game state if game is already playing
      if (room.gameState === 'playing') {
        setTimeout(() => {
          const initialGameState = room.update();
          socket.emit('state_update', initialGameState);
        }, 50);
      }

      // Notify room about new player
      io.to(joinedRoomId).emit('player_joined', {
        username,
        playerNumber: playerData.playerNumber,
        playersCount: Object.keys(room.players).length
      });

      // If game is starting, notify all players
      if (room.gameState === 'playing') {
        io.to(joinedRoomId).emit('game_start', {
          players: Object.values(room.players).map(p => ({
            username: p.username,
            playerNumber: p.playerNumber
          }))
        });
      }

      console.log(`👤 ${username} joined room ${joinedRoomId} as Player ${playerData.playerNumber}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  /**
   * Event: join_local_multiplayer
   * Two local players in the same browser
   */
  socket.on('join_local_multiplayer', ({ player1Name, player2Name, userId }) => {
    try {
      console.log(`📥 join_local_multiplayer request from socket ${socket.id}`);
      
      // Create new local multiplayer room (no AI)
      const joinedRoomId = `lm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const room = new GameRoom(joinedRoomId, false); // false = not single-player (no AI)
      gameRooms.set(joinedRoomId, room);

      // Add both players manually
      const player1Data = room.addPlayer(socket.id, player1Name, userId);
      
      // Add second player with a pseudo socket ID
      const pseudoSocketId = `pseudo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      room.players[pseudoSocketId] = {
        socketId: pseudoSocketId,
        username: player2Name,
        userId: 'local_player_2',
        playerNumber: 2,
        x: 650,
        y: room.GROUND_Y,
        velocityX: 0,
        velocityY: 0,
        hp: room.MAX_HP,
        isJumping: false,
        isAttacking: false,
        attackType: null,
        attackCooldown: 0,
        direction: -1,
        isAlive: true,
        isAI: false
      };

      // Ensure game state is set to playing now that both players are added
      room.gameState = 'playing';
      room.startTime = Date.now();
      console.log('✅ Game state set to playing');

      // Store the mapping for this socket
      playerSocketMap.set(socket.id, { 
        roomId: joinedRoomId, 
        username: player1Name, 
        userId, 
        isLocalMultiplayer: true,
        pseudoSocketId: pseudoSocketId,
        player1SocketId: socket.id,
        player2SocketId: pseudoSocketId
      });

      // Join Socket.IO room
      socket.join(joinedRoomId);
      console.log(`✅ Socket ${socket.id} joined local multiplayer room ${joinedRoomId}`);

      console.log(`🎮 Local multiplayer started: ${player1Name} vs ${player2Name}`);

      // Notify player they joined
      socket.emit('room_joined', {
        roomId: joinedRoomId,
        playerNumber: 1,
        gameState: 'playing',
        isLocalMultiplayer: true
      });

      // Send initial game state
      setTimeout(() => {
        const initialGameState = room.getGameState();
        socket.emit('state_update', initialGameState);
      }, 100);

      socket.emit('game_start', {
        players: Object.values(room.players).map(p => ({
          username: p.username,
          playerNumber: p.playerNumber,
          isAI: false
        }))
      });

    } catch (error) {
      console.error('Error starting local multiplayer:', error);
      socket.emit('error', { message: 'Failed to start local multiplayer game' });
    }
  });

  /**
   * Event: player_move
   * Player sends movement input
   */
  socket.on('player_move', ({ direction }) => {
    console.log(`🎮 player_move received: ${direction} from ${socket.id}`);
    
    // Find the room this socket belongs to by checking all rooms
    let foundRoom = null;
    let foundRoomId = null;
    
    gameRooms.forEach((room, roomId) => {
      if (room.players[socket.id]) {
        foundRoom = room;
        foundRoomId = roomId;
      }
    });
    
    if (!foundRoom) {
      console.log('❌ Socket not found in any room:', socket.id);
      return;
    }

    console.log(`✅ Found socket in room ${foundRoomId}, applying movement`);
    foundRoom.handlePlayerMove(socket.id, direction);
  });

  /**
   * Event: player_jump
   * Player jumps
   */
  socket.on('player_jump', () => {
    console.log(`🎮 player_jump received from ${socket.id}`);
    
    let foundRoom = null;
    gameRooms.forEach((room) => {
      if (room.players[socket.id]) {
        foundRoom = room;
      }
    });
    
    if (!foundRoom) {
      console.log('❌ Socket not found in any room');
      return;
    }
    foundRoom.handlePlayerJump(socket.id);
  });

  /**
   * Event: player_attack
   * Player performs an attack
   */
  socket.on('player_attack', ({ attackType }) => {
    console.log(`🎮 player_attack received: ${attackType} from ${socket.id}`);
    
    let foundRoom = null;
    let foundRoomId = null;
    gameRooms.forEach((room, roomId) => {
      if (room.players[socket.id]) {
        foundRoom = room;
        foundRoomId = roomId;
      }
    });
    
    if (!foundRoom) {
      console.log('❌ Socket not found in any room');
      return;
    }

    foundRoom.handlePlayerAttack(socket.id, attackType);

    // Broadcast attack to room for animation sync
    io.to(foundRoomId).emit('player_attacked', {
      socketId: socket.id,
      attackType
    });
  });

  /**
   * Event: player2_move
   * Local player 2 sends movement input
   */
  socket.on('player2_move', ({ direction }) => {
    console.log(`🎮 player2_move received: ${direction} from ${socket.id}`);
    const playerInfo = playerSocketMap.get(socket.id);
    if (!playerInfo) {
      console.log(`❌ player2_move: Socket ${socket.id} not in playerSocketMap`);
      return;
    }
    if (!playerInfo.isLocalMultiplayer) {
      console.log(`❌ player2_move: Not in local multiplayer mode`);
      return;
    }

    const room = gameRooms.get(playerInfo.roomId);
    if (!room) {
      console.log(`❌ player2_move: Room ${playerInfo.roomId} not found`);
      return;
    }

    console.log(`✅ Applying player2 move: ${direction}`);
    const player2SocketId = playerInfo.pseudoSocketId;
    room.handlePlayerMove(player2SocketId, direction);
  });

  /**
   * Event: player2_jump
   * Local player 2 jumps
   */
  socket.on('player2_jump', () => {
    console.log(`🎮 player2_jump received from ${socket.id}`);
    const playerInfo = playerSocketMap.get(socket.id);
    if (!playerInfo || !playerInfo.isLocalMultiplayer) {
      console.log('❌ player2_jump: Not in local multiplayer');
      return;
    }

    const room = gameRooms.get(playerInfo.roomId);
    if (!room) {
      console.log('❌ player2_jump: Room not found');
      return;
    }

    console.log('✅ Applying player2 jump');
    const player2SocketId = playerInfo.pseudoSocketId;
    room.handlePlayerJump(player2SocketId);
  });

  /**
   * Event: player2_attack
   * Local player 2 performs an attack
   */
  socket.on('player2_attack', ({ attackType }) => {
    console.log(`🎮 player2_attack received: ${attackType} from ${socket.id}`);
    const playerInfo = playerSocketMap.get(socket.id);
    if (!playerInfo || !playerInfo.isLocalMultiplayer) {
      console.log('❌ player2_attack: Not in local multiplayer');
      return;
    }

    const room = gameRooms.get(playerInfo.roomId);
    if (!room) {
      console.log('❌ player2_attack: Room not found');
      return;
    }

    console.log(`✅ Applying player2 attack: ${attackType}`);
    const player2SocketId = playerInfo.pseudoSocketId;
    room.handlePlayerAttack(player2SocketId, attackType);

    io.to(playerInfo.roomId).emit('player_attacked', {
      socketId: player2SocketId,
      attackType
    });
  });

  /**
   * Event: disconnect
   * Player disconnects
   */
  socket.on('disconnect', () => {
    const playerInfo = playerSocketMap.get(socket.id);
    
    if (playerInfo) {
      const room = gameRooms.get(playerInfo.roomId);
      
      if (room) {
        room.removePlayer(socket.id);
        
        // Notify other players
        socket.to(playerInfo.roomId).emit('player_disconnected', {
          username: playerInfo.username
        });

        // If game was in progress, end it
        if (room.gameState === 'playing') {
          room.gameState = 'ended';
          handleMatchEnd(room);
        }

        // Clean up empty rooms
        if (room.isEmpty()) {
          gameRooms.delete(playerInfo.roomId);
          console.log(`🗑️ Room ${playerInfo.roomId} deleted (empty)`);
        }
      }

      playerSocketMap.delete(socket.id);
      console.log(`👋 ${playerInfo.username} disconnected from room ${playerInfo.roomId}`);
    }

    console.log(`🔌 Disconnected: ${socket.id}`);
  });

  /**
   * Event: leave_room
   * Player manually leaves room
   */
  socket.on('leave_room', () => {
    const playerInfo = playerSocketMap.get(socket.id);
    
    if (playerInfo) {
      const room = gameRooms.get(playerInfo.roomId);
      
      if (room) {
        room.removePlayer(socket.id);
        socket.leave(playerInfo.roomId);
        
        socket.to(playerInfo.roomId).emit('player_left', {
          username: playerInfo.username
        });

        if (room.isEmpty()) {
          gameRooms.delete(playerInfo.roomId);
        }
      }

      playerSocketMap.delete(socket.id);
    }
  });

  /**
   * Event: get_rooms
   * Get list of available rooms
   */
  socket.on('get_rooms', () => {
    const availableRooms = Array.from(gameRooms.entries())
      .filter(([_, room]) => !room.isFull())
      .map(([roomId, room]) => ({
        roomId,
        playersCount: Object.keys(room.players).length,
        gameState: room.gameState
      }));

    socket.emit('rooms_list', { rooms: availableRooms });
  });

  /**
   * Event: restart_match
   * Restart the current local multiplayer match
   */
  socket.on('restart_match', () => {
    const playerInfo = playerSocketMap.get(socket.id);
    
    if (!playerInfo) {
      console.log('❌ Socket not found in playerSocketMap:', socket.id);
      return;
    }

    const room = gameRooms.get(playerInfo.roomId);
    if (!room) {
      console.log('❌ Room not found:', playerInfo.roomId);
      return;
    }

    console.log(`🔄 Restarting match in room ${playerInfo.roomId}`);
    
    // Reset the game
    room.restartGame();

    // Broadcast the new game state to all players in the room
    const gameState = room.getGameState();
    io.to(playerInfo.roomId).emit('state_update', gameState);
    io.to(playerInfo.roomId).emit('match_restarted', { message: 'Match restarted!' });
    
    console.log(`✅ Match restarted in room ${playerInfo.roomId}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 StickArena server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🗄️ Connecting to MongoDB...`);
});

module.exports = { app, server, io };
