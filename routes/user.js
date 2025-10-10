//const User = require('./models/user');

//app.get('/verify', async (req, res) => {
//  const { token } = req.query;
//  if (!token) return res.send('❌ ไม่พบ Token');

//  const user = await User.findOne({
//    verifyToken: token,
//   verifyExpires: { $gt: Date.now() }
//  });

//  if (!user) {
//    return res.send('❌ ลิงก์นี้หมดอายุหรือไม่ถูกต้อง');
//  }

// user.verified = true;
//  user.verifyToken = undefined;
//  user.verifyExpires = undefined;
//  await user.save();

//  res.send(`
//    <h2 style="color:green;">✅ ยืนยันอีเมลสำเร็จ!</h2>
//    <p>คุณสามารถเข้าสู่ระบบได้แล้ว</p>
//    <a href="/login">เข้าสู่ระบบ</a>
//  `);
//});