const mongoose = require('mongoose');

const safetyZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['safe-zone', 'hospital', 'police'], required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  radius: { type: Number, required: true, default: 500 } // in meters
}, { timestamps: true });

safetyZoneSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SafetyZone', safetyZoneSchema);
