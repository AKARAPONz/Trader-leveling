const User = require('../models/User');

module.exports = async (req, res) => {
  try {
    const { email, username, password, age, country } = req.body;

    // ✅ ตรวจซ้ำก่อนบันทึก
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      let duplicateField = '';
      if (existingUser.email === email) duplicateField = 'อีเมลนี้ถูกใช้แล้ว';
      else if (existingUser.username === username) duplicateField = 'ชื่อผู้ใช้นี้ถูกใช้แล้ว';

      req.flash('validationErrors', [duplicateField]);
      req.flash('data', req.body);
      console.warn(`⚠️ Duplicate detected: ${duplicateField}`);
      return res.redirect('/register');
    }

    // ✅ ถ้าไม่ซ้ำ → สร้าง user ใหม่
    const newUser = new User({
      email,
      username,
      password,
      age,
      country,
      role: 'trader', // สมัครใหม่เป็น Trader อัตโนมัติ
      level: 1
    });

    await newUser.save();
    console.log(`✅ User registered successfully: ${username} (${email})`);

    req.flash('success', 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    res.redirect('/login');
  } catch (error) {
    console.error('❌ storeUserController error:', error);
    let validationErrors = [];

    if (error.code === 11000) {
      // MongoDB duplicate index
      const key = Object.keys(error.keyValue)[0];
      if (key === 'email') validationErrors = ['อีเมลนี้ถูกใช้แล้ว'];
      else if (key === 'username') validationErrors = ['ชื่อผู้ใช้นี้ถูกใช้แล้ว'];
      else validationErrors = ['ข้อมูลซ้ำในระบบ'];
    } else if (error.errors) {
      validationErrors = Object.values(error.errors).map(e => e.message);
    } else {
      validationErrors = [error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'];
    }

    req.flash('validationErrors', [duplicateField]); // เมื่อข้อมูลซ้ำ
    req.flash('success', 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ'); // เมื่อสมัครสำเร็จ
    res.redirect('/register');

  }
};