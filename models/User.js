const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
    username: {
    type: String,
    required: [true, 'Please provide username']
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
    default: 1 // เริ่มต้นที่เลเวล 1
  },
  exp: {
    type: Number,
    default: 0 // เริ่มต้นที่ 0 EXP
  },
  role: {
    type: String,
    enum: ['admin', 'trader', 'guest'],
    default: 'guest'
  },
  username: {
    type: String,
    required: [true, 'Please provide username'],
    unique: true
  }
});

// เข้ารหัสรหัสผ่านก่อนบันทึก
UserSchema.pre('save', function (next) {
  const user = this;

  if (!user.isModified('password')) return next();

  bcrypt.hash(user.password, 10)
    .then(hash => {
      user.password = hash;
      next();
    })
    .catch(error => {
      console.error('Error hashing password:', error);
      next(error);
    });
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
