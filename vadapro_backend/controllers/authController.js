const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

exports.register = async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Account already exists. Please login instead.',
        errorType: 'USER_EXISTS'
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        message: 'Account does not exist. Please register first.',
        errorType: 'USER_NOT_FOUND'
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      res.json({ message: 'Login successful', token: 'demo-token', user: { username: user.username } });
    } else {
      res.status(401).json({ 
        message: 'Invalid password',
        errorType: 'INVALID_PASSWORD'
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};