const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Alert = require('../models/Alert');
const SafetyZone = require('../models/SafetyZone');

// Get KPIs and Stats
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalVolunteers = await User.countDocuments({ role: 'volunteer' });
    const totalAlerts = await Alert.countDocuments();
    const completedAlerts = await Alert.countDocuments({ status: 'completed' });
    
    // Average response time could be calculated here by iterating over completed alerts
    // For simplicity, we just return basic counts
    res.json({
      totalUsers,
      totalVolunteers,
      totalAlerts,
      completedAlerts,
      successRate: totalAlerts === 0 ? 0 : Math.round((completedAlerts / totalAlerts) * 100)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manage users
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/users/:id/verify', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.verificationStatus = req.body.status; // 'verified' or 'rejected'
    await user.save();
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all alerts for monitoring
router.get('/alerts', protect, admin, async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('userId', 'name phone')
      .populate('assignedVolunteerId', 'name phone')
      .sort('-createdAt');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Safety Zones
router.get('/zones', protect, async (req, res) => {
  try {
    const zones = await SafetyZone.find();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/zones', protect, admin, async (req, res) => {
  try {
    const zone = await SafetyZone.create(req.body);
    res.status(201).json(zone);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete safety zone
router.delete('/zones/:id', protect, admin, async (req, res) => {
  try {
    await SafetyZone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Zone removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
