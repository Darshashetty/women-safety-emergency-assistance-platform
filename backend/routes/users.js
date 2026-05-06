const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Get profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update emergency contacts
router.put('/contacts', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.emergencyContacts = req.body.contacts;
    await user.save();
    res.json(user.emergencyContacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all volunteers (for map)
router.get('/volunteers', protect, async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer', isOnline: true }).select('-password');
    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
