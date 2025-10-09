const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true // ✅ ห้าม email ซ้ำ
  },
  username: {
    type: String,
    required: [true, 'Please provide username'],
    unique: true // ✅ ห้าม username ซ้ำ
  },
  password: {
    type: String,
    required: [true, 'Please provide password']
  },
  age: {
    type: Number,
    required: [true, 'Please provide age']
  },
  country: {
    type: String,
    required: [true, 'Please provide country']
  },
  profileImage: {
    type: String,
    default: '/uploads/default.jpg'
  },
  level: {
    type: Number,
    default: 1
  },
  exp: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['admin', 'trader', 'guest'],
    default: 'trader' // ✅ สมัครใหม่เป็น Trader อัตโนมัติ
  }
});

// ✅ เข้ารหัสรหัสผ่านก่อนบันทึก
UserSchema.pre('save', function (next) {
  const user = this;
  if (!user.isModified('password')) return next();

  bcrypt.hash(user.password, 10)
    .then(hash => {
      user.password = hash;
      next();
    })
    .catch(error => next(error));
});

module.exports = mongoose.model('User', UserSchema);