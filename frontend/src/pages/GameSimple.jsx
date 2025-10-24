import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socketService';
import apiService from '../services/apiService';
import './Game.css';

/**
 * Simple Game Component - Minimalist version
 * Uses direct socket instance and simple state management
 */
function GameSimple() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gameState, setGameState] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const user = apiService.getCurrentUser();
    if (!user) {
      navigate('/');
      return;
    }

    const { roomId } = location.state || {};
    if (!roomId) {
      navigate('/lobby');
      return;
    }

    // Get the socket
    socketRef.current = socketService.getSocket();
    if (!socketRef.current) {
      console.error('No socket available');
      return;
    }

    console.log('🎮 Game started, socket:', socketRef.current.id, 'room:', roomId);

    // Set up state_update listener
    const handleStateUpdate = (state) => {
      console.log('📡 State update:', state);
      setGameState(state);
    };

    socketRef.current.on('state_update', handleStateUpdate);

    // Keyboard handler
    const handleKeyDown = (e) => {
      const socket = socketRef.current;
      if (!socket) return;

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault();
        socket.emit('player_move', { direction: 'left' });
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault();
        socket.emit('player_move', { direction: 'right' });
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        e.preventDefault();
        socket.emit('player_jump');
      } else if (e.key === 'z' || e.key === 'j') {
        e.preventDefault();
        socket.emit('player_attack', { attackType: 'punch' });
      } else if (e.key === 'x' || e.key === 'k') {
        e.preventDefault();
        socket.emit('player_attack', { attackType: 'kick' });
      }
    };

    const handleKeyUp = (e) => {
      const socket = socketRef.current;
      if (!socket) return;

      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
        socket.emit('player_move', { direction: 'stop' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (socketRef.current) {
        socketRef.current.off('state_update', handleStateUpdate);
      }
    };
  }, [navigate, location]);

  if (!gameState || !gameState.players) {
    return (
      <div className="game-container">
        <div className="game-header">
          <h2>⚔️ StickArena</h2>
        </div>
        <div className="game-arena" style={{
          width: 800,
          height: 400,
          background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 85%, #228B22 85%, #228B22 100%)',
          border: '3px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          ⏳ Loading game...
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>⚔️ StickArena</h2>
      </div>

      <div
        className="game-arena"
        style={{
          width: 800,
          height: 400,
          position: 'relative',
          background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 85%, #228B22 85%, #228B22 100%)',
          border: '3px solid #333',
          overflow: 'hidden',
          margin: '20px auto'
        }}
      >
        {gameState.players.map((player) => (
          <div
            key={player.playerNumber}
            style={{
              position: 'absolute',
              left: `${player.x}px`,
              top: `${player.y}px`,
              transform: 'translate(-50%, -50%)',
              userSelect: 'none'
            }}
          >
            {/* Health Bar */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              left: '-30px',
              width: '60px',
              height: '8px',
              background: '#ff0000',
              border: '1px solid #000'
            }}>
              <div style={{
                width: `${Math.max(0, Math.min(1, player.hp / 100)) * 100}%`,
                height: '100%',
                background: '#00aa00',
                transition: 'width 0.1s'
              }} />
            </div>

            {/* Name */}
            <div style={{
              position: 'absolute',
              top: '-65px',
              left: '-30px',
              width: '60px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {player.username}
            </div>

            {/* Stickman */}
            <svg width="40" height="60" viewBox="0 0 40 60" style={{scaleX: player.direction}}>
              <circle cx="20" cy="10" r="6" stroke={player.playerNumber === 1 ? '#FF4444' : '#4444FF'} strokeWidth="2" fill="none" />
              <line x1="20" y1="16" x2="20" y2="35" stroke={player.playerNumber === 1 ? '#FF4444' : '#4444FF'} strokeWidth="2" />
              <line x1="20" y1="22" x2="30" y2="28" stroke={player.playerNumber === 1 ? '#FF4444' : '#4444FF'} strokeWidth="2" />
              <line x1="20" y1="22" x2="10" y2="28" stroke={player.playerNumber === 1 ? '#FF4444' : '#4444FF'} strokeWidth="2" />
              <line x1="20" y1="35" x2="25" y2="50" stroke={player.playerNumber === 1 ? '#FF4444' : '#4444FF'} strokeWidth="2" />
              <line x1="20" y1="35" x2="15" y2="50" stroke={player.playerNumber === 1 ? '#FF4444' : '#4444FF'} strokeWidth="2" />
            </svg>
          </div>
        ))}
      </div>

      <div className="game-controls-hint">
        <span>← → : Move</span>
        <span>↑ : Jump</span>
        <span>Z : Punch</span>
        <span>X : Kick</span>
      </div>
    </div>
  );
}

export default GameSimple;
