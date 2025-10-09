const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = async (req, res) => {
  const { identifier, password } = req.body; // ✅ ใช้ identifier (อาจเป็น email หรือ username)

  try {
    // ✅ หาผู้ใช้จาก username หรือ email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!user) {
      req.flash('error', 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      return res.render('login', {
        messages: req.flash(),
        username: identifier
      });
    }

    // ✅ ตรวจรหัสผ่าน
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash('error', 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      return res.render('login', {
        messages: req.flash(),
        username: identifier
      });
    }

    // ✅ บันทึกข้อมูลผู้ใช้ใน session
    req.session.userId = user._id;
    req.session.user = {
      username: user.username,
      email: user.email,
      profileImage: user.profileImage || '/uploads/default.jpg',
      _id: user._id,
      age: user.age || null,
      country: user.country || null,
      role: user.role,
      level: user.level || 1,
      exp: user.exp || 0
    };

    console.log(`✅ User logged in: ${user.username} (${user.email})`);
    return res.redirect('/'); // หรือเปลี่ยนเป็น '/dashboard'

  } catch (err) {
    console.error('❌ Login error:', err);
    req.flash('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    res.render('login', { messages: req.flash() });
  }
};