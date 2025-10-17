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
  },
  // Discount/Offer fields
  hasDiscount: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: true,
    validate: {
      isIn: [['percentage', 'fixed']]
    }
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  offerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  offerDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  offerStartDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  offerEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Image/thumbnail field
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  // Bundle concept: is this a package of services?
  isBundle: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // If isBundle=true, this JSON contains array of serviceIds that make up this bundle
  bundleServices: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // Bundle discount: additional discount when services are bought as bundle
  bundleDiscount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
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

// Calculate discounted price
Service.prototype.getDiscountedPrice = function() {
  if (!this.hasDiscount) {
    return {
      originalPrice: parseFloat(this.price),
      discountedPrice: parseFloat(this.price),
      discount: 0,
      discountType: null
    };
  }
  
  const originalPrice = parseFloat(this.price);
  let discountedPrice = originalPrice;
  
  if (this.discountType === 'percentage') {
    discountedPrice = originalPrice - (originalPrice * this.discountValue / 100);
  } else if (this.discountType === 'fixed') {
    discountedPrice = Math.max(0, originalPrice - parseFloat(this.discountValue));
  }
  
  return {
    originalPrice,
    discountedPrice: Math.round(discountedPrice * 100) / 100,
    discount: parseFloat(this.discountValue),
    discountType: this.discountType,
    offerName: this.offerName,
    offerDescription: this.offerDescription,
    isActive: this.isOfferActive()
  };
};

// Check if offer is currently active
Service.prototype.isOfferActive = function() {
  if (!this.hasDiscount) return false;
  
  const now = new Date();
  const startDate = this.offerStartDate ? new Date(this.offerStartDate) : null;
  const endDate = this.offerEndDate ? new Date(this.offerEndDate) : null;
  
  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  
  return true;
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