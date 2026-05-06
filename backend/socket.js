const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Alert = require('./models/Alert');

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    // If authentication failed and socket.user is not set, disconnect gracefully
    if (!socket.user) {
      socket.disconnect(true);
      return;
    }

    // Mark user as online
    await User.findByIdAndUpdate(socket.user._id, { isOnline: true });
    io.emit('user-status-changed', { userId: socket.user._id, isOnline: true });

    socket.join(socket.user._id.toString());
    if (socket.user.role === 'admin') socket.join('admin');
    if (socket.user.role === 'volunteer') socket.join('volunteers');

    socket.on('update-location', async (coords) => {
      // coords format: [longitude, latitude]
      await User.findByIdAndUpdate(socket.user._id, {
        location: { type: 'Point', coordinates: coords }
      });
      // Broadcast volunteer locations to everyone for the map
      if (socket.user.role === 'volunteer') {
        io.emit('volunteer-location-update', {
          userId: socket.user._id,
          name: socket.user.name,
          coordinates: coords
        });
      }
      // If user has an active alert, broadcast their location to the assigned volunteer
      if (socket.user.role === 'user') {
        const activeAlert = await Alert.findOne({ userId: socket.user._id, status: { $in: ['created', 'accepted', 'en-route'] } });
        if (activeAlert && activeAlert.assignedVolunteerId) {
          io.to(activeAlert.assignedVolunteerId.toString()).emit('user-location-update', {
            userId: socket.user._id,
            coordinates: coords
          });
        }
      }
    });

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.user._id, { isOnline: false });
      io.emit('user-status-changed', { userId: socket.user._id, isOnline: false });
    });
  });
};
