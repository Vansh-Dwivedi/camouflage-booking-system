const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('makeup', 'skincare', 'eyebrows', 'lashes', 'hair', 'nails', 'other'),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false,
    validate: {
      min: 15,
      max: 480 // 8 hours max
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  preparationTime: {
    type: DataTypes.INTEGER, // time before service starts (in minutes)
    defaultValue: 10,
    validate: {
      min: 0
    }
  },
  cleanupTime: {
    type: DataTypes.INTEGER, // time after service ends (in minutes)
    defaultValue: 10,
    validate: {
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  staffRequired: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  maxAdvanceBooking: {
    type: DataTypes.INTEGER, // days in advance
    defaultValue: 30
  },
  minAdvanceBooking: {
    type: DataTypes.INTEGER, // hours in advance
    defaultValue: 2
  },
  availability: {
    type: DataTypes.JSON,
    defaultValue: {
      monday: {
        enabled: true,
        slots: [{ start: "09:00", end: "17:00" }]
      },
      tuesday: {
        enabled: true,
        slots: [{ start: "09:00", end: "17:00" }]
      },
      wednesday: {
        enabled: true,
        slots: [{ start: "09:00", end: "17:00" }]
      },
      thursday: {
        enabled: true,
        slots: [{ start: "09:00", end: "17:00" }]
      },
      friday: {
        enabled: true,
        slots: [{ start: "09:00", end: "17:00" }]
      },
      saturday: {
        enabled: true,
        slots: [{ start: "09:00", end: "17:00" }]
      },
      sunday: {
        enabled: false,
        slots: []
      }
    }
  },
  images: {
    type: DataTypes.JSON, // Array of image URLs
    defaultValue: []
  },
  tags: {
    type: DataTypes.JSON, // Array of tags
    defaultValue: []
  },
  requirements: {
    type: DataTypes.JSON, // Array of special requirements
    defaultValue: []
  },
  cancellationPolicy: {
    type: DataTypes.TEXT,
    defaultValue: "24 hours advance notice required for cancellation"
  }
}, {
  tableName: 'services',
  hooks: {
    beforeCreate: (service) => {
      // Ensure default availability is set
      if (!service.availability) {
        const defaultSlot = { start: "09:00", end: "17:00" };
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        service.availability = {};
        days.forEach(day => {
          service.availability[day] = {
            enabled: true,
            slots: [defaultSlot]
          };
        });
        service.availability.sunday = {
          enabled: false,
          slots: []
        };
      }
    }
  }
});

// Virtual for total duration including prep and cleanup
Service.prototype.getTotalDuration = function() {
  return this.preparationTime + this.duration + this.cleanupTime;
};

// Get available time slots for a specific date
Service.prototype.getAvailableSlots = function(date, existingBookings = []) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const dayAvailability = this.availability[dayOfWeek];
  
  if (!dayAvailability.enabled || !dayAvailability.slots.length) {
    return [];
  }
  
  const availableSlots = [];
  const totalDuration = this.getTotalDuration();
  
  dayAvailability.slots.forEach(slot => {
    const startTime = new Date(`${date.toDateString()} ${slot.start}`);
    const endTime = new Date(`${date.toDateString()} ${slot.end}`);
    
    // Generate 15-minute intervals
    const current = new Date(startTime);
    while (current < endTime) {
      const slotEnd = new Date(current.getTime() + totalDuration * 60000);
      
      if (slotEnd <= endTime) {
        // Check if this slot conflicts with existing bookings
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          return (current < bookingEnd && slotEnd > bookingStart);
        });
        
        if (!hasConflict) {
          availableSlots.push({
            start: current.toTimeString().slice(0, 5),
            end: slotEnd.toTimeString().slice(0, 5),
            datetime: new Date(current)
          });
        }
      }
      
      current.setMinutes(current.getMinutes() + 15);
    }
  });
  
  return availableSlots;
};

module.exports = Service;