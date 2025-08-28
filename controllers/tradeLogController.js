const User = require('../models/User');

async function increaseLevel(userId) {
  const user = await User.findById(userId);
  if (user) {
    user.level += 1;
    await user.save();
  }
}
