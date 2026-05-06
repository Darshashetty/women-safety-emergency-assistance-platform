const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI is not configured.');
    }

    await mongoose.connect(mongoUri);
    
    const existingAdmin = await User.findOne({ email: 'admin@test.local' });
    if (existingAdmin) {
      process.exit();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Test@123', salt);

    await User.create({
      name: 'System Admin',
      email: 'admin@test.local',
      password: hashedPassword,
      phone: '0000000000',
      role: 'admin'
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedAdmin();
