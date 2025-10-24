import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import socketService from '../services/socketService';
import './Lobby.css';

/**
 * Lobby Component
 * Main menu where players can join games or view leaderboard
 */
function Lobby() {
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const currentUser = apiService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);

    // Load leaderboard
    loadLeaderboard();

    // Connect to socket server
    socketService.connect();

    return () => {
      // Cleanup on unmount
      if (socketService.isConnected()) {
        socketService.leaveRoom();
      }
    };
  }, [navigate]);

  const loadLeaderboard = async () => {
    try {
      const data = await apiService.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  const handleQuickMatch = () => {
    setLoading(true);
    setError('');

    if (!socketService.isConnected()) {
      setError('Not connected to server. Please refresh the page.');
      setLoading(false);
      return;
    }

    // Join a random available room (matchmaking)
    socketService.joinRoom(user.username, user.id);

    // Listen for room joined event
    socketService.on('room_joined', (data) => {
      console.log('Joined room:', data);
      navigate('/game', { state: { roomId: data.roomId, playerNumber: data.playerNumber, isSinglePlayer: data.isSinglePlayer || false } });
    });

    socketService.on('error', (data) => {
      setError(data.message);
      setLoading(false);
    });
  };

  const handleSinglePlayer = () => {
    setLoading(true);
    setError('');

    if (!socketService.isConnected()) {
      setError('Not connected to server. Please refresh the page.');
      setLoading(false);
      return;
    }

    // Join single-player game with AI
    socketService.joinSinglePlayer(user.username, user.id);

    // Listen for room joined event (once)
    socketService.once('room_joined', (data) => {
      console.log('Joined single-player room:', data);
      navigate('/game', { state: { roomId: data.roomId, playerNumber: data.playerNumber, isSinglePlayer: true } });
    });

    socketService.on('error', (data) => {
      setError(data.message);
      setLoading(false);
    });
  };

  const handleLocalMultiplayer = () => {
    setLoading(true);
    setError('');

    if (!socketService.isConnected()) {
      setError('Not connected to server. Please refresh the page.');
      setLoading(false);
      return;
    }

    // Navigate to local multiplayer game
    navigate('/game', { state: { isLocalMultiplayer: true } });
  };

  const handleLogout = () => {
    apiService.logout();
    socketService.disconnect();
    navigate('/');
  };

  if (!user) {
    return <div className="lobby-container">Loading...</div>;
  }

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1>⚔️ StickArena Lobby</h1>
        <div className="user-info">
          <span>Welcome, <strong>{user.username}</strong>!</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      <div className="lobby-content">
        <div className="lobby-main">
          <div className="stats-card">
            <h2>Your Stats</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Wins</span>
                <span className="stat-value">{user.wins}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Losses</span>
                <span className="stat-value">{user.losses}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Matches</span>
                <span className="stat-value">{user.totalMatches}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Win Rate</span>
                <span className="stat-value">
                  {user.totalMatches > 0 
                    ? `${((user.wins / user.totalMatches) * 100).toFixed(1)}%` 
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          <div className="action-card">
            <h2>Start Playing</h2>
            {error && <div className="error-message">{error}</div>}
            
            <button 
              onClick={handleLocalMultiplayer} 
              className="btn-play btn-local-multiplayer"
              disabled={loading}
            >
              {loading ? '🎮 Starting Game...' : '👥 Local Multiplayer (2 Players)'}
            </button>
            <p className="help-text">
              Two players on the same keyboard
            </p>

            <div className="divider">OR</div>

            <button 
              onClick={handleSinglePlayer} 
              className="btn-play btn-single-player"
              disabled={loading}
            >
              {loading ? '🤖 Starting Game...' : '🤖 Single Player (vs AI)'}
            </button>
            <p className="help-text">
              Fight against a hard AI opponent
            </p>

            <div className="divider">OR</div>

            <button 
              onClick={handleQuickMatch} 
              className="btn-play btn-multiplayer"
              disabled={loading}
            >
              {loading ? '🔍 Finding Opponent...' : '🎮 Multiplayer Match'}
            </button>
            <p className="help-text">
              You'll be matched with another player automatically
            </p>
          </div>

          <div className="controls-card">
            <h2>Controls</h2>
            <div style={{marginBottom: '15px'}}>
              <h3 style={{color: '#667eea', marginTop: 0}}>Player 1</h3>
              <div className="controls-grid">
                <div className="control-item">
                  <span className="key">A/D</span>
                  <span className="action">Move Left/Right</span>
                </div>
                <div className="control-item">
                  <span className="key">W</span>
                  <span className="action">Jump</span>
                </div>
                <div className="control-item">
                  <span className="key">Z</span>
                  <span className="action">Punch</span>
                </div>
                <div className="control-item">
                  <span className="key">X</span>
                  <span className="action">Kick</span>
                </div>
              </div>
            </div>
            <div>
              <h3 style={{color: '#764ba2', marginTop: 0}}>Player 2</h3>
              <div className="controls-grid">
                <div className="control-item">
                  <span className="key">I/K</span>
                  <span className="action">Move Left/Right</span>
                </div>
                <div className="control-item">
                  <span className="key">O</span>
                  <span className="action">Jump</span>
                </div>
                <div className="control-item">
                  <span className="key">U</span>
                  <span className="action">Punch</span>
                </div>
                <div className="control-item">
                  <span className="key">P</span>
                  <span className="action">Kick</span>
                </div>
              </div>
            </div>
            <p className="alt-controls">Try Local Multiplayer mode!</p>
          </div>
        </div>

        <div className="lobby-sidebar">
          <div className="leaderboard-card">
            <h2>🏆 Leaderboard</h2>
            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <p className="no-data">No players yet. Be the first!</p>
              ) : (
                leaderboard.map((player) => (
                  <div key={player.rank} className="leaderboard-item">
                    <span className="rank">#{player.rank}</span>
                    <span className="username">{player.username}</span>
                    <span className="wins">{player.wins}W</span>
                    <span className="winrate">{player.winRate}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
