const User = require('../models/user');

module.exports = async (req, res) => {
  try {
    const validationErrors = req.flash('validationErrors') || [];
    const successMessages = req.flash('success') || [];

    res.render('register', {
      validationErrors,
      messages: { success: successMessages },
      error: [], // ✅ เพิ่มบรรทัดนี้ ป้องกัน error undefined
      email: '',
      username: '',
      password: '',
      age: '',
      country: '',
      role: 'trader'
    });
  } catch (err) {
    console.error('❌ Error rendering register page:', err);
    res.status(500).send('Internal Server Error');
  }
};