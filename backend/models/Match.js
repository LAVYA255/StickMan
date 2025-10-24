const mongoose = require('mongoose');

/**
 * Match Schema for storing game history and leaderboard data
 * Tracks winner, loser, and match details
 */
const matchSchema = new mongoose.Schema({
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  winnerUsername: {
    type: String,
    required: true
  },
  loserUsername: {
    type: String,
    required: true
  },
  winnerHP: {
    type: Number,
    required: true
  },
  loserHP: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  playedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Match', matchSchema);
