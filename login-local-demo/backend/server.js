const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_jwt_secret_key_here';

mongoose.connect('mongodb://localhost:27017/loginLocalDemo', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const User = mongoose.model('User', UserSchema);

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const userExist = await User.findOne({ username });
  if(userExist) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();
  res.json({ message: 'User registered successfully' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if(!user) return res.status(400).json({ message: 'Invalid username or password' });

  const isMatch = await bcrypt.compare(password, user.password);
  if(!isMatch) return res.status(400).json({ message: 'Invalid username or password' });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, username: user.username });
});

// Protected route example
app.get('/api/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ message: 'This is protected data.', userId: decoded.id });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});