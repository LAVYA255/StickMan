# ⚔️ StickArena - Real-time Multiplayer 2D Fighting Game

**StickArena** is a real-time multiplayer 2D stickman fighting game built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO for real-time gameplay synchronization.

## 🎮 Features

- **Real-time Multiplayer**: Fight against other players in real-time using Socket.IO
- **User Authentication**: Register/login with secure password hashing (bcrypt)
- **Matchmaking System**: Automatic opponent matching
- **Live Game Physics**: Jump, move, punch, and kick with collision detection
- **Health System**: Track HP and determine winners
- **Leaderboard**: View top players ranked by wins
- **Match History**: Store and display past matches
- **Responsive Canvas**: Smooth 60 FPS gameplay with HTML5 Canvas

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
StickArena/
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
│   │   │   └── Game.jsx         # Game canvas + logic
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

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd StickArena
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
2. **Join Match**: Click "Quick Match" to find an opponent
3. **Fight**: Reduce your opponent's HP to 0 to win
4. **Win**: Gain +1 win in your stats and leaderboard ranking

## 📡 Socket.IO Events

### Client → Server
- `join_room`: Join/create a game room
- `player_move`: Send movement input (left/right/stop)
- `player_jump`: Jump action
- `player_attack`: Attack action (punch/kick)
- `leave_room`: Leave current room

### Server → Client
- `room_joined`: Confirmation of room join
- `game_start`: Game begins (2 players ready)
- `state_update`: Real-time game state (60 FPS)
- `player_attacked`: Attack animation trigger
- `match_end`: Match result with winner/loser
- `player_disconnected`: Opponent left

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/leaderboard` - Get top 10 players
- `GET /api/auth/profile/:username` - Get user profile + match history

## 🎨 Game Features

### Physics System
- **Gravity**: 0.8 units/frame
- **Jump Force**: -15 units
- **Move Speed**: 5 units/frame
- **Attack Range**: 60 pixels
- **Canvas Size**: 800x400 pixels

### Combat System
- **Punch**: 10 damage, 200ms cooldown
- **Kick**: 15 damage, 300ms cooldown
- **Max HP**: 100
- **Collision Detection**: Range-based hit detection

### Game States
- `waiting`: Waiting for opponent
- `playing`: Match in progress
- `ended`: Match finished

## 🚀 Deployment

### Backend Deployment (Heroku, Railway, etc.)

1. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT`
   - `CLIENT_URL`

2. Deploy backend code

### Frontend Deployment (Vercel, Netlify, etc.)

1. Update `.env` with production backend URL
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy the `dist` folder

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
1. Open two browser windows
2. Register two different users
3. Click "Quick Match" in both windows
4. Fight in real-time!

## 📝 Development Notes

### Code Architecture
- **Backend**: Event-driven architecture with Socket.IO
- **Frontend**: Component-based React with custom hooks
- **Game Loop**: Server-authoritative game state at 60 FPS
- **Database**: NoSQL document model with Mongoose ODM

### Performance
- Server processes physics at 60 FPS
- Client renders at browser refresh rate
- State updates broadcast only to room participants
- Optimistic client-side input handling

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

Created with ❤️ using the MERN stack and Socket.IO.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Happy Fighting! ⚔️🥊**
