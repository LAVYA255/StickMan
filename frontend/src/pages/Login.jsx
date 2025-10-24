import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import './Login.css';

/**
 * Login/Register Page Component
 * Handles user authentication
 */
function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await apiService.login(username, password);
      } else {
        await apiService.register(username, password);
      }

      // Navigate to lobby on success
      navigate('/lobby');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="game-title">⚔️ StickArena ⚔️</h1>
        <p className="game-subtitle">Real-time Multiplayer Fighting Game</p>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>{isLogin ? 'Login' : 'Register'}</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (3-20 characters)"
              minLength={3}
              maxLength={20}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>

          <p className="toggle-text">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span
              className="toggle-link"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Register' : 'Login'}
            </span>
          </p>
        </form>

        <div className="game-info">
          <h3>How to Play:</h3>
          <ul>
            <li>🎮 Use Arrow Keys or WASD to move</li>
            <li>🦘 Press Space or W/↑ to jump</li>
            <li>👊 Press Z or J to punch</li>
            <li>🦵 Press X or K to kick</li>
            <li>🎯 Reduce opponent's HP to 0 to win!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
