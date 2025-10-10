const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/user');

module.exports = async (req, res) => {
  try {
    const { email, username, password, age, country } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      req.flash('validationErrors', ['อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว']);
      return res.redirect('/register');
    }

    // ✅ สร้าง token สำหรับ verify
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = Date.now() + 24 * 60 * 60 * 1000; // หมดอายุ 24 ชม.

    // ✅ สร้าง user ใหม่
    const newUser = new User({
      email,
      username,
      password,
      age,
      country,
      role: 'trader',
      level: 1,
      verified: false,
      verifyToken: token,
      verifyExpires: tokenExpires
    });
    await newUser.save();

    // ✅ สร้าง transporter (ใช้ Gmail)
//    const transporter = nodemailer.createTransport({
//      service: 'gmail',
//      auth: {
//        user: process.env.SMTP_USER,
//        pass: process.env.SMTP_PASS
//      }
//    });

    // ✅ สร้างลิงก์ verify
//    const verifyLink = `http://localhost:4000/verify?token=${token}`;

    // ✅ ส่งอีเมล
//    await transporter.sendMail({
//      from: `"Trader Leveling" <${process.env.SMTP_USER}>`,
//      to: email,
//      subject: 'ยืนยันอีเมลของคุณ',
//      html: `
//        <h3>สวัสดี ${username}</h3>
//        <p>กรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
//       <a href="${verifyLink}" style="background:#0d6efd;color:white;padding:10px 15px;border-radius:6px;text-decoration:none;">ยืนยันอีเมล</a>
//        <p>ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง</p>
//      `
//    });

    req.flash('success', 'สมัครสมาชิกสำเร็จ! โปรดยืนยันอีเมลของคุณ');
    res.redirect('/register');
  } catch (error) {
    console.error('❌ storeUserController error:', error);
    req.flash('validationErrors', ['เกิดข้อผิดพลาดในการสมัคร']);
    res.redirect('/register');
  }
};