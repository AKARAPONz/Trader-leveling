const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// === Multer: ตั้งค่าเก็บไฟล์ ===
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// === แสดงหน้าโปรไฟล์ ===
router.get('/', (req, res) => {
  res.render('profile', {
    user: req.user,
    loggedIn: true
  });
});

// === แสดงหน้าแก้ไขโปรไฟล์ ===
router.get('/edit', (req, res) => {
  res.render('edit-profile', {
    user: req.user,
    loggedIn: true
  });
});

// === อัปเดตโปรไฟล์ ===
router.post('/update', upload.single('profileImage'), async (req, res) => {
  const { age, country } = req.body;

  const updatedData = {
    age: age ? parseInt(age) : null,
    country: country || null
  };

  if (req.file) {
    updatedData.profileImage = '/uploads/' + req.file.filename;
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updatedData,
      { new: true }
    );

    // ✅ อัปเดต session ใหม่จากฐานข้อมูล (รักษา role เดิมไว้)
    req.session.user = {
      _id: user._id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage || '/uploads/default.jpg',
      age: user.age || null,
      country: user.country || null,
      role: user.role, // ใช้ role จากฐานข้อมูล ไม่เปลี่ยนเป็น guest
      level: user.level || 1,
      exp: user.exp || 0
    };

    req.session.save(() => {
      res.redirect('/profile');
    });
  } catch (err) {
    console.error('Update error:', err);
    res.redirect('/profile');
  }
});

module.exports = router;
