// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if(!user) return res.status(401).json({ message: 'User không tồn tại' });

  const isMatch = await user.comparePassword(password);
  if(!isMatch) return res.status(401).json({ message: 'Sai mật khẩu' });

  // Tạo token JWT
  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.json({ token, username: user.username });
});

module.exports = router;
