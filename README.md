# ⚔️ Street Fighter Duel (Local Edition) - 2D Fighting Game

**Street Fighter Duel (Local Edition)** is a local multiplayer 2D stickman fighting game built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO for real-time gameplay synchronization.

**Project by**: Lavya Tanotra

![Game Sprite Reference](frontend/src/assets/Idle-outline.png)

## 🎮 Features

- **Local Multiplayer**: Fight against a friend on the same device
- **User Authentication**: Register/login with secure password hashing (bcrypt)
- **Live Game Physics**: Jump, move, punch, and kick with collision detection
- **Health System**: Track HP and determine winners
- **Responsive Canvas**: Smooth 30 FPS gameplay with HTML5 Canvas
- **Real-time Synchronization**: Server-authoritative physics with Socket.IO

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js**: REST API server
- **Socket.IO**: Real-time bidirectional communication
- **MongoDB** + **Mongoose**: Database for users and match history
- **JWT**: Authentication tokens
- **bcryptjs**: Password hashing

### Frontend
- **React 19**: UI framework
- **React Router**: Client-side routing
- **Socket.IO Client**: Real-time game updates
- **Canvas API**: 2D game rendering
- **Vite**: Fast development build tool

## 📁 Project Structure

```
Street Fighter Duel/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js              # User schema (auth + stats)
│   │   └── Match.js             # Match history schema
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   ├── game/
│   │   └── GameRoom.js          # Core game logic class
│   ├── server.js                # Main server + Socket.IO
│   ├── .env                     # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login/Register page
│   │   │   ├── Lobby.jsx        # Main lobby
│   │   │   └── GameCanvas.jsx   # Game canvas + logic
│   │   ├── services/
│   │   │   ├── apiService.js    # HTTP API calls
│   │   │   └── socketService.js # Socket.IO wrapper
│   │   ├── App.jsx              # Main routing
│   │   └── main.jsx
│   ├── .env                     # Frontend env variables
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### 🎮 Play Online
- **Frontend**: https://stick-man-vert.vercel.app/
- **Backend API**: https://stickman-kmzh.onrender.com/api

### 📋 Prerequisites (for local development)

- **Node.js** (v16 or higher)
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/LAVYA255/StickMan.git
cd StickMan
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (already created, but update if needed)
# Edit .env and set your MongoDB URI:
# MONGODB_URI=mongodb://localhost:27017/stickarena
# JWT_SECRET=your_secret_key_here
# PORT=5000
# CLIENT_URL=http://localhost:5173

# Start the server
npm run dev
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (already created, but update if needed)
# VITE_API_URL=http://localhost:5000/api
# VITE_SERVER_URL=http://localhost:5000

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. MongoDB Setup

#### Option A: Local MongoDB
```bash
# Start MongoDB (if installed locally)
mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string
4. Update `MONGODB_URI` in `backend/.env`

### Game Rules

1. **Register/Login**: Create an account or log in
2. **Local Multiplayer**: Press "START LOCAL MULTIPLAYER" to fight a friend
3. **Controls**:
   - **Player 1**: A/D (move left/right), W (jump), Q (punch), E (kick)
   - **Player 2**: J/L (move left/right), I (jump), U (punch), P (kick)
4. **Fight**: Reduce your opponent's HP to 0 to win
5. **Restart**: Click "Restart" in the winner modal to play again

## 📡 Socket.IO Events

### Client → Server
- `join_local_multiplayer`: Join a local multiplayer room
- `player_move`: Send movement input (left/right)
- `player_jump`: Jump action
- `player_attack`: Attack action (punch/kick)
- `player2_move`: Player 2 movement (local)
- `player2_jump`: Player 2 jump (local)
- `player2_attack`: Player 2 attack (local)
- `restart_match`: Restart the game

### Server → Client
- `game_state`: Real-time game state (30 FPS)
- `match_ended`: Match result with winner
- `match_restarted`: Match ready to restart

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile/:username` - Get user profile

## 🎨 Game Features

### Physics System
- **Gravity**: 1.0 units/frame
- **Jump Force**: -16 units
- **Movement Acceleration**: 0.6 units/frame
- **Movement Deceleration**: 0.8 units/frame
- **Max Move Speed**: 4.5 units/frame
- **Attack Range**: 100 pixels
- **Hitbox Size**: 120x160 pixels
- **Canvas Size**: 800x400 pixels (10x sprite scale)

### Combat System
- **Punch Damage**: 10 base + collision bonus
- **Kick Damage**: 15 base + collision bonus
- **Collision Damage**: 6 damage on contact
- **Max HP**: 100
- **Attack Collision Detection**: AABB (Axis-Aligned Bounding Box) with one-hit-per-attack tracking

### Game States
- `waiting`: Waiting for opponent to join
- `playing`: Match in progress
- `ended`: Match finished, winner displayed

## 🚀 Deployment

### Backend Deployment (Render)
- **Live URL**: https://stickman-kmzh.onrender.com/api
- Deployed with MongoDB Atlas connection
- Environment variables configured on Render dashboard

### Frontend Deployment (Vercel)
- **Live URL**: https://stick-man-vert.vercel.app/
- Auto-deploys on git push to main branch
- CORS configured for production backend

## 🧪 Testing

### Test the Backend
```bash
cd backend
npm run dev
# Visit http://localhost:5000/api/health
```

### Test the Frontend
```bash
cd frontend
npm run dev
# Visit http://localhost:5173
```

### Test Multiplayer
1. Open https://stick-man-vert.vercel.app/ in your browser
2. Register two different accounts (or use two different browsers/tabs)
3. Click "START LOCAL MULTIPLAYER" in both windows
4. Fight in real-time!

## 📝 Development Notes

## 📝 Development Notes

### Code Architecture
- **Backend**: Event-driven architecture with Socket.IO
- **Frontend**: Component-based React with custom hooks
- **Game Loop**: Server-authoritative game state at 30 FPS
- **Physics**: AABB collision detection with one-hit-per-attack tracking
- **Database**: NoSQL document model with Mongoose ODM

### Key Implementation Details
- **Sprite Scaling**: All sprites doubled in size (scale = 10x)
- **One-Hit System**: `attackHitApplied` flag prevents multi-hit damage on same attack
- **Server Authority**: All physics calculations done server-side to prevent cheating
- **Real-time Sync**: State broadcasts at 30 FPS to keep clients in sync

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify `.env` file exists with correct values
- Ensure port 5000 is not in use

### Frontend won't connect
- Verify backend is running on port 5000
- Check browser console for CORS errors
- Ensure `.env` URLs are correct

### Game lag/desync
- Check network connection
- Verify server is processing at 60 FPS
- Look for Socket.IO connection errors in console

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🎉 Credits

Created with ❤️ by **Lavya Tanotra** using the MERN stack and Socket.IO.

---

**Play Now**: https://stick-man-vert.vercel.app/ ⚔️

**GitHub**: https://github.com/LAVYA255/StickMan

**Happy Fighting! ⚔️🥊**
