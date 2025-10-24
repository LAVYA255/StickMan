import { io } from 'socket.io-client';

/**
 * Socket Service
 * Manages WebSocket connection to the game server
 * Stores socket on window to survive HMR / double-mount in dev
 */

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const GLOBAL_SOCKET_KEY = '__STICKARENA_SOCKET__';

class SocketService {
  constructor() {
    // Reuse socket from window if present (survives HMR)
    const existing = typeof window !== 'undefined' ? window[GLOBAL_SOCKET_KEY] : null;
    this.socket = existing || null;
    this.connected = this.socket?.connected || false;
  }

  /**
   * Ensure socket exists and is connected. Returns socket instance.
   */
  connect() {
    // If already connected, return existing socket
    if (this.socket?.connected) {
      console.log('✅ Already connected with socket:', this.socket.id);
      this.connected = true;
      return this.socket;
    }

    // If socket exists but disconnected, try to reconnect
    if (this.socket && !this.socket.connected) {
      console.log('🔄 Reconnecting existing socket...');
      try { this.socket.connect(); } catch (e) { console.warn('Reconnect failed', e); }
      return this.socket;
    }

    console.log('🔌 Creating new socket connection...');
    this.socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Persist socket on window so HMR or re-imports reuse it
    if (typeof window !== 'undefined') window[GLOBAL_SOCKET_KEY] = this.socket;

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Join a game room
   */
  joinRoom(username, userId, roomId = null) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('join_room', { username, userId, roomId });
  }

  /**
   * Join local multiplayer game (2 players on same browser)
   */
  joinLocalMultiplayer(player1Name, player2Name, userId) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('join_local_multiplayer', { player1Name, player2Name, userId });
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (this.socket) {
      this.socket.emit('leave_room');
    }
  }

  /**
   * Send player movement
   */
  sendMove(direction) {
    if (this.socket) {
      this.socket.emit('player_move', { direction });
    }
  }

  /**
   * Send jump action
   */
  sendJump() {
    if (this.socket) {
      this.socket.emit('player_jump');
    }
  }

  /**
   * Send attack action
   */
  sendAttack(attackType) {
    if (this.socket) {
      this.socket.emit('player_attack', { attackType });
    }
  }

  /**
   * Get list of available rooms
   */
  getRooms() {
    if (this.socket) {
      this.socket.emit('get_rooms');
    }
  }

  /**
   * Listen for events
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Listen for an event once
   */
  once(event, callback) {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
