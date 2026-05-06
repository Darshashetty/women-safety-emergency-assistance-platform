const express = require('express');
const router = express.Router();
const { protect, volunteer } = require('../middleware/authMiddleware');
const Alert = require('../models/Alert');
const User = require('../models/User');

// Create new alert (SOS)
router.post('/', protect, async (req, res) => {
  try {
    const { coordinates } = req.body;
    
    // Create alert
    const alert = await Alert.create({
      userId: req.user._id,
      location: { type: 'Point', coordinates },
      responseTimeline: [{ status: 'created' }]
    });

    const populatedAlert = await Alert.findById(alert._id).populate('userId', 'name phone emergencyContacts');

    // Broadcast to volunteers
    const io = req.app.get('io');
    io.to('volunteers').emit('new-alert', populatedAlert);

    res.status(201).json(populatedAlert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active alert for user
router.get('/active', protect, async (req, res) => {
  try {
    const alert = await Alert.findOne({
      userId: req.user._id,
      status: { $in: ['created', 'accepted', 'en-route'] }
    }).populate('assignedVolunteerId', 'name phone');
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active alerts (for volunteers)
router.get('/queue', protect, volunteer, async (req, res) => {
  try {
    const alerts = await Alert.find({
      status: { $in: ['created', 'accepted', 'en-route'] }
    }).populate('userId', 'name phone').populate('assignedVolunteerId', 'name phone');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update alert status (Accept, En-Route, Completed)
router.put('/:id/status', protect, volunteer, async (req, res) => {
  try {
    const { status } = req.body;
    const alert = await Alert.findById(req.params.id);

    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    // Prevent accepting if already assigned to someone else
    if (status === 'accepted' && alert.status !== 'created' && alert.assignedVolunteerId?.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Alert already accepted by another volunteer' });
    }

    alert.status = status;
    alert.responseTimeline.push({ status });
    
    if (status === 'accepted') {
      alert.assignedVolunteerId = req.user._id;
      alert.assignedVolunteerName = req.user.name;
    }

    await alert.save();
    
    const populatedAlert = await Alert.findById(alert._id).populate('userId', 'name phone').populate('assignedVolunteerId', 'name phone');

    // Notify user and admins
    const io = req.app.get('io');
    io.to(alert.userId.toString()).emit('alert-status-updated', populatedAlert);
    io.to('admin').emit('alert-status-updated', populatedAlert);
    io.to('volunteers').emit('alert-status-updated', populatedAlert);

    res.json(populatedAlert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get alert history
router.get('/history', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'user') query.userId = req.user._id;
    if (req.user.role === 'volunteer') query.assignedVolunteerId = req.user._id;
    
    const alerts = await Alert.find(query).sort('-createdAt');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
