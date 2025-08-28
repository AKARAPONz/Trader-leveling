const express = require('express');
const app = express();
const ejs = require('ejs');
const mongoose = require('mongoose');
const expressSession = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const multer = require('multer');
const http = require('http').createServer(app);           // ใช้ http server
const io = require('socket.io')(http);                    // ใช้ socket.io
const OpenPosition = require('./models/openPosition');
const TradeLog = require('./models/tradeLog');
const axios = require('axios');

// เพิ่มการ import mt5-data API route
const mt5DataRoutes = require('./routes/api/mt5-data');
app.use('/api/mt5-data', mt5DataRoutes);
// Configure multer for handling multipart/form-data
const upload = multer();

// MongoDB Connection
mongoose.connect('mongodb+srv://traderleveling:cWFog925W2tLEx7n@cluster0.kw0wsmj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  // console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  // console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Global session flag
global.loggedIn = null;

// Controllers
const indexController = require('./controllers/indexController');
const loginController = require('./controllers/loginController');
const registerController = require('./controllers/registerController');
const storeUserController = require('./controllers/storeUserController');
const loginUserController = require('./controllers/loginUserController');
const logoutController = require('./controllers/logoutController');
const profileController = require('./controllers/profileController');
const dashboardRoutes = require('./routes/dashboardRoutes');      // Import dashboard routes
const tournamentRoutes = require('./routes/tournamentRoutes');
const tradeRoutes = require('./routes/tradeRoutes');

// Middleware
const redirectIfAuth = require('./middleware/redirectIfAuth');
const authMiddleware = require('./middleware/authMiddleware');
const guestMiddleware = require('./middleware/guestMiddleware');

// Static files
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api', require('./routes/api/marketPrices'));

// Body parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Session and flash
app.use(flash());
app.use(expressSession({
  secret: "node secret",
  resave: false,
  saveUninitialized: false
}));

// Local variable for view
app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.user;
  next();
});

// View engine
app.set('view engine', 'ejs');

// แชร์ io ให้ routes ใช้งานได้
app.set('io', io);

// Join room สำหรับ tournament ผ่าน socket.io
io.on('connection', (socket) => {
  socket.on('joinTournament', (tournamentId) => {
    socket.join(tournamentId);
  });
});

// Routes
app.get('/', indexController);
app.get('/login', redirectIfAuth, loginController);
app.get('/register', redirectIfAuth, registerController);
app.post('/user/register', redirectIfAuth, storeUserController);
app.post('/user/login', redirectIfAuth, loginUserController);
app.get('/logout', logoutController);

// Protected routes - redirect guest users to home
app.use('/dashboard', guestMiddleware, dashboardRoutes);
app.use('/tournament', guestMiddleware, tournamentRoutes);
app.use('/trade', guestMiddleware, tradeRoutes);
app.use('/profile', guestMiddleware, profileController);
app.use('/admin', guestMiddleware, require('./routes/adminRoutes'));

// API routes with multer middleware for multipart/form-data
app.use('/api/trade', upload.any(), require('./routes/api/trade'));
app.use('/api/tournament-request', require('./routes/api/tournamentRequests'));
app.use('/api/tournament-actions', require('./routes/api/tournament-actions'));
app.use('/api/close-position', require('./routes/api/close-position'));
app.use('/api/user-level', require('./routes/api/user-level'));
app.use('/api/tournament-join', require('./routes/api/tournament-join'));

async function getMarketPrice(symbol) {
  try {
    if (!symbol) {
      console.warn('⚠️ getMarketPrice: No symbol provided');
      return null;
    }

    const res = await axios.get(
      `http://localhost:4000/api/price?symbol=${encodeURIComponent(symbol)}`,
      { timeout: 8000 } // 8 second timeout
    );
    
    if (res.data && res.data.status === 'success' && res.data.price) {
      return parseFloat(res.data.price);
    }
    
    console.warn(`⚠️ getMarketPrice: Invalid response for symbol ${symbol}:`, res.data);
    return null;
  } catch (e) {
    console.error(`❌ getMarketPrice error for symbol ${symbol}:`, e.message);
    return null;
  }
}

const startAutoCloseWorker = require('./scripts/autoCloseWorker');
startAutoCloseWorker({ OpenPosition, TradeLog, getMarketPrice });

// Start server
http.listen(4000, () => {
  console.log("✅ App (with socket.io) listening on port 4000");
});
