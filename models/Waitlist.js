// models/Waitlist.js - Smart Waitlist Management
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Waitlist = sequelize.define('Waitlist', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    preferredDates: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of preferred dates'
    },
    preferredTimes: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of preferred times (e.g., ["09:00", "14:00"])'
    },
    notificationMethod: {
      type: DataTypes.ENUM('email', 'sms', 'both'),
      defaultValue: 'both'
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Position in waitlist queue'
    },
    status: {
      type: DataTypes.ENUM('active', 'filled', 'expired', 'cancelled'),
      defaultValue: 'active'
    },
    expirationDate: {
      type: DataTypes.DATE,
      comment: 'When this waitlist entry expires'
    },
    autoBooking: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Automatically book when slot becomes available'
    },
    dateAdded: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'waitlist',
    timestamps: true
  });

  return Waitlist;
};
