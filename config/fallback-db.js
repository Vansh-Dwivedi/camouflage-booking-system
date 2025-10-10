// Fallback in-memory data store for when SQLite is not available
class FallbackDB {
  constructor() {
    this.data = {
      users: [
        {
          id: 1,
          email: 'admin@camouflage.com',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
          name: 'Admin User',
          phone: '+1234567890',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      services: [
        {
          id: 1,
          name: 'Bridal Makeup',
          description: 'Complete bridal makeup package with trial session',
          duration: 180,
          price: 250.00,
          category: 'bridal',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          name: 'Party Makeup',
          description: 'Glamorous makeup for special occasions',
          duration: 90,
          price: 80.00,
          category: 'party',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          name: 'Natural Look',
          description: 'Subtle, everyday makeup look',
          duration: 60,
          price: 50.00,
          category: 'natural',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      bookings: [],
      settings: [
        { id: 1, key: 'businessName', value: 'Camouflage Beauty Studio', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, key: 'businessEmail', value: 'booking@camouflage.com', createdAt: new Date(), updatedAt: new Date() },
        { id: 3, key: 'businessPhone', value: '+1234567890', createdAt: new Date(), updatedAt: new Date() },
        { id: 4, key: 'businessAddress', value: '123 Beauty Street, City, State 12345', createdAt: new Date(), updatedAt: new Date() },
        { id: 5, key: 'workingHours', value: '{"start": "09:00", "end": "18:00"}', createdAt: new Date(), updatedAt: new Date() },
        { id: 6, key: 'workingDays', value: '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]', createdAt: new Date(), updatedAt: new Date() },
        { id: 7, key: 'bookingBuffer', value: '15', createdAt: new Date(), updatedAt: new Date() },
        { id: 8, key: 'maxAdvanceBooking', value: '30', createdAt: new Date(), updatedAt: new Date() },
        { id: 9, key: 'autoConfirm', value: 'false', createdAt: new Date(), updatedAt: new Date() },
        { id: 10, key: 'smsNotifications', value: 'true', createdAt: new Date(), updatedAt: new Date() }
      ]
    };
    this.nextId = { users: 2, services: 4, bookings: 1, settings: 11 };
  }

  // Service methods
  async findAllServices(where = {}) {
    let services = this.data.services;
    
    if (where.isActive !== undefined) {
      services = services.filter(s => s.isActive === where.isActive);
    }
    
    if (where.category) {
      services = services.filter(s => s.category === where.category);
    }
    
    return services;
  }

  async findServiceById(id) {
    return this.data.services.find(s => s.id == id);
  }

  // User methods
  async findUserByEmail(email) {
    return this.data.users.find(u => u.email === email);
  }

  async findUserById(id) {
    return this.data.users.find(u => u.id == id);
  }

  // Booking methods
  async findAllBookings(where = {}) {
    let bookings = this.data.bookings;
    
    if (where.serviceId) {
      bookings = bookings.filter(b => b.serviceId == where.serviceId);
    }
    
    if (where.userId) {
      bookings = bookings.filter(b => b.userId == where.userId);
    }
    
    return bookings;
  }

  async createBooking(bookingData) {
    const newBooking = {
      id: this.nextId.bookings++,
      ...bookingData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.bookings.push(newBooking);
    return newBooking;
  }

  // Settings methods
  async findAllSettings() {
    return this.data.settings;
  }

  async findSettingByKey(key) {
    return this.data.settings.find(s => s.key === key);
  }
}

module.exports = new FallbackDB();