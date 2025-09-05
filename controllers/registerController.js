const User = require('../models/User');

module.exports = async (req, res) => {
  let username = '';
  let password = '';
  let age = '';
  let country = '';
  let role = 'guest'; // default
  let level = 1;

  let data = req.flash('data')[0];

  if (typeof data !== 'undefined') {
    username = data.username;
    password = data.password;
    age = data.age;
    country = data.country;
    role = data.role || 'guest';
  }

  if (req.method === 'POST') {
    console.log('Register request received:', req.body);
    const { username, password, age, country, role: selectedRole } = req.body;

    try {
      const user = new User({
        username,
        password,
        age,
        country,
        role: selectedRole || 'guest',
        level: 1
      });

      await user.save();
      console.log('User registered successfully:', user);
      req.flash('success', 'Registration successful! Please log in.');
      return res.redirect('/login');
    } catch (error) {
      console.error('Registration error:', error);
      req.flash('validationError', 'Registration failed. Please check your input.');
      req.flash('data', { username, password, age, country, role: selectedRole });
      return res.redirect('/register');
    }
  }

  // Render registration form
  res.render('register', {
    error: req.flash('validationError'),
    username,
    password,
    age,
    country,
    role
  });
};
