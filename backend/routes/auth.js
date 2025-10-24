const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Match = require('../models/Match');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be between 3 and 20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = new User({ username, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        wins: user.wins,
        losses: user.losses,
        totalMatches: user.totalMatches
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        wins: user.wins,
        losses: user.losses,
        totalMatches: user.totalMatches
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/**
 * @route   GET /api/auth/leaderboard
 * @desc    Get top players by wins
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const topPlayers = await User.find()
      .sort({ wins: -1, losses: 1 })
      .limit(10)
      .select('username wins losses totalMatches');

    res.json({
      leaderboard: topPlayers.map((player, index) => ({
        rank: index + 1,
        username: player.username,
        wins: player.wins,
        losses: player.losses,
        totalMatches: player.totalMatches,
        winRate: player.totalMatches > 0 
          ? ((player.wins / player.totalMatches) * 100).toFixed(1) 
          : '0.0'
      }))
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
});

/**
 * @route   GET /api/auth/profile/:username
 * @desc    Get user profile and match history
 * @access  Public
 */
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username wins losses totalMatches createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get recent matches
    const recentMatches = await Match.find({
      $or: [{ winner: user._id }, { loser: user._id }]
    })
      .sort({ playedAt: -1 })
      .limit(10)
      .select('winnerUsername loserUsername winnerHP loserHP playedAt');

    res.json({
      profile: {
        username: user.username,
        wins: user.wins,
        losses: user.losses,
        totalMatches: user.totalMatches,
        winRate: user.totalMatches > 0 
          ? ((user.wins / user.totalMatches) * 100).toFixed(1) 
          : '0.0',
        memberSince: user.createdAt
      },
      recentMatches
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

module.exports = router;
