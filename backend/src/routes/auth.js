const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const SALT_ROUNDS = 12;

const registerRules = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'operator', 'viewer']).withMessage('Invalid role')
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

router.post('/register', registerRules, validate, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ username, email, passwordHash, role: role || 'viewer' });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({ success: true, data: { token, user } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

router.post('/login', loginRules, validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.json({ success: true, data: { token, user } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = router;
