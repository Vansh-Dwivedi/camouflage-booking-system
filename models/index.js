const User = require('./User');
const Service = require('./Service');
const Booking = require('./Booking');
const Setting = require('./Setting');

// Define associations
User.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Service.hasMany(Booking, { foreignKey: 'serviceId', as: 'bookings' });
Booking.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

module.exports = {
  User,
  Service,
  Booking,
  Setting
};