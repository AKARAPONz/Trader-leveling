const User = require('../models/user')

exports.viewAllUsers = async (req, res) => {
  const users = await User.find({});
  res.render('admin/users', { 
    users,
    user: req.session.user,
    loggedIn: !!req.session.user,
    currentUserId: req.session.user._id
  });
};

exports.updateUserRoleLevel = async (req, res) => {
  const { userId, role, level } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { role, level });
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/users');
  }
};

exports.deleteUser = async (req, res) => {
  const { userId } = req.body;
  await User.findByIdAndDelete(userId);
  res.redirect('/admin/users');
};
