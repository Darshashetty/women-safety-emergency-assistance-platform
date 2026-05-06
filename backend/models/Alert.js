const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedVolunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedVolunteerName: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  status: { type: String, enum: ['created', 'accepted', 'en-route', 'completed'], default: 'created' },
  responseTimeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

alertSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Alert', alertSchema);
