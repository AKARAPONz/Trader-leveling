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
const awardExpForTournament = require('./controllers/awardExpController');
const Tournament = require('./models/tournament');
const TournamentUser = require('./models/tournamentuser');
const OpenPosition = require('./models/openposition');
const TradeLog = require('./models/tradelog');
const axios = require('axios');

// ตั้งค่า multer สำหรับ multipart/form-data
const upload = multer();

// เชื่อมต่อ MongoDB
mongoose.connect('mongodb+srv://admin:1234@cluster0.dczs0k3.mongodb.net/')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

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

// ✅ แจ้งข้อมูลการได้รับ EXP หลังจบทัวร์นาเมนต์
app.get('/api/tournament-exp-status', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const userId = req.session.userId;

    if (!userId || !tournamentId)
      return res.json({ success: false, message: 'Missing data' });

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || !tournament.expGiven)
      return res.json({ success: false, message: 'No EXP yet' });

    const players = await TournamentUser.find({ tournamentId }).sort({ balance: -1 });
    const playerRank = players.findIndex(p => p.userId.toString() === userId.toString()) + 1;

    if (playerRank === 0)
      return res.json({ success: false, message: 'Player not found in this tournament' });

    let expReward = 10;
    if (playerRank === 1) expReward = 100;
    else if (playerRank === 2) expReward = 50;
    else if (playerRank === 3) expReward = 25;

    res.json({
      success: true,
      username: req.session.user.username,
      expReward,
      rank: playerRank,
      tournamentName: tournament.name
    });
  } catch (err) {
    console.error('❌ exp-status error:', err);
    res.json({ success: false, message: 'Server error' });
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

// ✅ อัปเดตสถานะเป็น END ถ้าเวลาหมด
async function updateTournamentStatus() {
  try {
    const now = new Date();
    const runningTournaments = await Tournament.find({
      status: { $in: ['REGISTRATION', 'RUNNING'] }
    });

    for (const t of runningTournaments) {
      console.log(`⏱ Checking tournament: ${t.name}`);
      if (now >= t.end) {
        t.status = 'END';
        await t.save();
        console.log(`🏁 Tournament "${t.name}" ended automatically.`);
      }
    }
  } catch (err) {
    console.error('❌ Error updating tournament status:', err);
  }
}

// ✅ ตรวจ tournament ที่ END และยังไม่ได้แจก EXP
async function checkEndedTournaments() {
  try {
    const endedTournaments = await Tournament.find({
      status: 'END',
      expGiven: { $ne: true }
    });

    for (const t of endedTournaments) {
      console.log(`🎯 Found ended tournament: ${t.name}`);
      await awardExpForTournament(t._id);
      t.expGiven = true;
      await t.save();
      console.log(`✅ EXP awarded for ${t.name}`);
    }
  } catch (err) {
    console.error('❌ Error checking ended tournaments:', err);
  }
}

// ✅ รันทั้งคู่ทุก 10 วิ
setInterval(async () => {
  await updateTournamentStatus();
  await checkEndedTournaments();
}, 10000); // 10 seconds

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ App running on port ${PORT}`));