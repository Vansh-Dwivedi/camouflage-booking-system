const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Can be null if using serviceIds
    references: {
      model: 'services',
      key: 'id'
    }
  },
  // NEW: Support multiple services in one booking
  serviceIds: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of service IDs for this booking (allows multiple services)'
  },
  // Store service details for reference (name, price, duration)
  services: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of service objects with details'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: new Date().toISOString()
    }
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'),
    defaultValue: 'pending'
  },
  customerInfo: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      hasRequiredFields(value) {
        if (!value.name || !value.email || !value.phone) {
          throw new Error('Customer info must include name, email, and phone');
        }
      }
    }
  },
  pricing: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      basePrice: 0,
      discount: 0,
      finalPrice: 0
    }
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded', 'failed'),
    defaultValue: 'pending'
  },
  remindersSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  bookingSource: {
    type: DataTypes.ENUM('website', 'phone', 'walk-in', 'admin'),
    defaultValue: 'website'
  },
  assignedStaff: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  cancellation: {
    type: DataTypes.JSON,
    allowNull: true
  },
  feedback: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'bookings',
  indexes: [
    {
      fields: ['startTime', 'serviceId']
    },
    {
      fields: ['customerId', 'createdAt']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeCreate: async (booking) => {
      // Validate booking time is in the future
      if (booking.startTime <= new Date()) {
        throw new Error('Booking time must be in the future');
      }
      
      // Calculate end time and pricing based on service
      const Service = require('./Service');
      const service = await Service.findByPk(booking.serviceId);
      
      if (service) {
        const totalDuration = service.preparationTime + service.duration + service.cleanupTime;
        booking.endTime = new Date(booking.startTime.getTime() + totalDuration * 60000);
        
        // Set pricing if not already set
        if (!booking.pricing.basePrice) {
          booking.pricing = {
            basePrice: parseFloat(service.price),
            discount: booking.pricing.discount || 0,
            finalPrice: parseFloat(service.price) - (booking.pricing.discount || 0)
          };
        }
      }
    },
    beforeUpdate: async (booking) => {
      if (booking.changed('startTime') || booking.changed('serviceId')) {
        const Service = require('./Service');
        const service = await Service.findByPk(booking.serviceId);
        
        if (service) {
          const totalDuration = service.preparationTime + service.duration + service.cleanupTime;
          booking.endTime = new Date(booking.startTime.getTime() + totalDuration * 60000);
        }
      }
    }
  }
});

// Instance method for booking duration in minutes
Booking.prototype.getDurationMinutes = function() {
  return Math.ceil((this.endTime - this.startTime) / (1000 * 60));
};

// Method to check if booking can be cancelled
Booking.prototype.canBeCancelled = function() {
  const now = new Date();
  const hoursUntilBooking = (this.startTime - now) / (1000 * 60 * 60);
  
  return this.status === 'confirmed' && hoursUntilBooking >= 24;
};

// Method to check if reminder should be sent
Booking.prototype.shouldSendReminder = function() {
  const now = new Date();
  const hoursUntilBooking = (this.startTime - now) / (1000 * 60 * 60);
  
  // Send reminder 24 hours before if not sent yet
  return hoursUntilBooking <= 24 && hoursUntilBooking > 0 && this.remindersSent === 0;
};

// Static method to check for conflicts
Booking.checkConflicts = async function(serviceId, startTime, endTime, excludeBookingId = null) {
  const where = {
    serviceId: serviceId,
    status: {
      [Op.in]: ['pending', 'confirmed', 'in-progress']
    },
    [Op.or]: [
      {
        startTime: {
          [Op.lt]: endTime
        },
        endTime: {
          [Op.gt]: startTime
        }
      }
    ]
  };
  
  if (excludeBookingId) {
    where.id = {
      [Op.ne]: excludeBookingId
    };
  }
  
  const conflicts = await this.findAll({ where });
  return conflicts.length > 0;
};

module.exports = Booking;