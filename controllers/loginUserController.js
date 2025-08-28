const bcrypt = require('bcrypt');
const User = require('../models/User');

module.exports = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      req.flash('error', 'Email or password is incorrect');
      return res.render('login', {
        messages: req.flash(),
        email
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      req.flash('error', 'Email or password is incorrect');
      return res.render('login', {
        messages: req.flash(),
        email
      });
    }

    // บันทึกข้อมูลผู้ใช้ลงใน session รวมทั้ง role และ level
    req.session.userId = user._id;
    req.session.user = {
      name: user.name || '', // fallback ถ้าไม่มี name
      email: user.email,
      profileImage: user.profileImage || '/uploads/default.jpg',
      _id: user._id,
      age: user.age || null,
      country: user.country || null,
      role: user.role,
      level: user.level || 1,
      exp: user.exp || 0
    };

    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.render('login', {
      messages: req.flash()
    });
  }
};
