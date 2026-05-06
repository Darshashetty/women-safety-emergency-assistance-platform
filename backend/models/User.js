const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'volunteer', 'admin'], default: 'user' },
  profileImage: { type: String, default: '' },
  
  // For users
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String
  }],
  
  // Location for tracking
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  
  // Volunteer specific
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  availability: { type: String, enum: ['available', 'busy', 'offline'], default: 'offline' },
  isOnline: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
