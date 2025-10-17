const User = require('./User');
const Service = require('./Service');
const Booking = require('./Booking');
const Setting = require('./Setting');
const Waitlist = require('./Waitlist');

// Initialize Waitlist model
const { sequelize } = require('../config/database');
const WaitlistModel = Waitlist(sequelize);

// Define associations
User.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Service.hasMany(Booking, { foreignKey: 'serviceId', as: 'bookings' });
Booking.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

User.hasMany(WaitlistModel, { foreignKey: 'customerId', as: 'waitlist' });
WaitlistModel.belongsTo(User, { foreignKey: 'customerId' });

Service.hasMany(WaitlistModel, { foreignKey: 'serviceId', as: 'waitlist' });
WaitlistModel.belongsTo(Service, { foreignKey: 'serviceId' });

module.exports = {
  User,
  Service,
  Booking,
  Setting,
  Waitlist: WaitlistModel
};