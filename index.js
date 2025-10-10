// Import และตั้งค่าต่าง ๆ ของ Express, MongoDB, Socket.io
process.env.TZ = 'Asia/Bangkok';
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
const TournamentUser = require('./models/TournamentUser');
const OpenPosition = require('./models/OpenPosition');
const TradeLog = require('./models/TradeLog');
const axios = require('axios');

// ตั้งค่า multer สำหรับ multipart/form-data
const upload = multer();

// เชื่อมต่อ MongoDB
mongoose.connect('mongodb+srv://admin:1234@cluster0.dczs0k3.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Event handler ของ mongoose
mongoose.connection.on('connected', () => {
  // console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  // console.log('⚠️ Mongoose disconnected from MongoDB');
});

// ตัวแปร global สำหรับ session
global.loggedIn = null;

// Import controllers และ routes
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

// Middleware สำหรับ auth และ guest
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

// Session และ flash message
app.use(flash());
app.use(expressSession({
  secret: "node secret",
  resave: false,
  saveUninitialized: false
}));

// Local variable สำหรับ view
app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.user;
  next();
});

// ตั้งค่า view engine เป็น EJS
app.set('view engine', 'ejs');

// แชร์ io ให้ routes ใช้งานได้
app.set('io', io);

// Socket.io: join room สำหรับ tournament
io.on('connection', (socket) => {
  socket.on('joinTournament', (tournamentId) => {
    socket.join(tournamentId);
  });
});

// Routes หลักของแอป
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

// API routes พร้อม multer middleware
app.use('/api/trade', upload.any(), require('./routes/api/trade'));
app.use('/api/tournament-request', require('./routes/api/tournamentRequests'));
app.use('/api/tournament-actions', require('./routes/api/tournament-actions'));
app.use('/api/close-position', require('./routes/api/close-position'));
app.use('/api/user-level', require('./routes/api/user-level'));
app.use('/api/tournament-join', require('./routes/api/tournament-join'));

// ✅ API ดึง balance ของผู้ใช้ใน tournament

app.get('/api/user/balance', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const userId = req.session.userId;

    if (!userId || !tournamentId) {
      return res.json({ success: false, error: 'Missing user or tournament ID' });
    }

    const tournamentUser = await TournamentUser.findOne({ userId, tournamentId });
    if (!tournamentUser) {
      return res.json({ success: false, error: 'Tournament user not found' });
    }

    return res.json({ success: true, balance: tournamentUser.balance });
  } catch (err) {
    console.error('Balance fetch error:', err);
    res.json({ success: false, error: 'Internal server error' });
  }
});

// ฟังก์ชันดึงราคาตลาดจาก backend (ใช้ axios)
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

// autoCloseWorker
require('./services/orderWatcher');

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ App running on port ${PORT}`));