const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true
  },
  username: {
    type: String,
    required: [true, 'Please provide username'],
    unique: true
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
    default: 'trader'
  },
  //verified: { type: Boolean, default: false },
  //verifyToken: { type: String },
  //verifyExpires: { type: Date }
});

// ✅ เข้ารหัสรหัสผ่านก่อนบันทึก
UserSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();

  bcrypt.hash(this.password, 10)
    .then(hash => {
      this.password = hash;
      next();
    })
    .catch(error => next(error));
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);