const fs = require('fs').promises;
const path = require('path');

class JsonDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.dataFile = path.join(this.dataDir, 'database.json');
    this.initialized = false;
    this.data = {
      users: [],
      services: [],
      bookings: [],
      settings: []
    };
    this.nextId = { users: 1, services: 1, bookings: 1, settings: 1 };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Try to load existing data
      try {
        const dataContent = await fs.readFile(this.dataFile, 'utf8');
        const loadedData = JSON.parse(dataContent);
        this.data = { ...this.data, ...loadedData.data };
        this.nextId = { ...this.nextId, ...loadedData.nextId };
        console.log('✅ Loaded existing JSON database');
      } catch (error) {
        // File doesn't exist, create with initial data
        await this.seedInitialData();
        await this.save();
        console.log('✅ Created new JSON database with initial data');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ JSON database initialization failed:', error);
      // Use in-memory data if file operations fail
      await this.seedInitialData();
      this.initialized = true;
      console.log('⚠️ Using in-memory JSON database');
    }
  }

  async seedInitialData() {
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);

    this.data = {
      users: [
        {
          id: 1,
          email: 'admin@camouflage.com',
          password: adminPassword,
          name: 'Admin User',
          phone: '+1234567890',
          role: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Party Makeup',
          description: 'Glamorous makeup for special occasions',
          duration: 90,
          price: 80.00,
          category: 'party',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Natural Look',
          description: 'Subtle, everyday makeup look',
          duration: 60,
          price: 50.00,
          category: 'natural',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      bookings: [],
      settings: [
        { id: 1, key: 'businessName', value: 'Camouflage Beauty Studio', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 2, key: 'businessEmail', value: 'booking@camouflage.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 3, key: 'businessPhone', value: '+1234567890', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 4, key: 'businessAddress', value: '123 Beauty Street, City, State 12345', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 5, key: 'workingHours', value: '{"start": "09:00", "end": "18:00"}', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 6, key: 'workingDays', value: '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 7, key: 'bookingBuffer', value: '15', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 8, key: 'maxAdvanceBooking', value: '30', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 9, key: 'autoConfirm', value: 'false', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 10, key: 'smsNotifications', value: 'true', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]
    };

    this.nextId = { users: 2, services: 4, bookings: 1, settings: 11 };
  }

  async save() {
    if (!this.initialized) return;
    
    try {
      const dataToSave = {
        data: this.data,
        nextId: this.nextId,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(this.dataFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('⚠️ Failed to save JSON database:', error.message);
    }
  }

  // Service methods
  async findAllServices(where = {}) {
    await this.initialize();
    let services = [...this.data.services];
    
    if (where.isActive !== undefined) {
      services = services.filter(s => s.isActive === where.isActive);
    }
    
    if (where.category && where.category !== 'all') {
      services = services.filter(s => s.category === where.category);
    }
    
    return services;
  }

  async findServiceById(id) {
    await this.initialize();
    return this.data.services.find(s => s.id == id);
  }

  async createService(serviceData) {
    await this.initialize();
    const newService = {
      id: this.nextId.services++,
      ...serviceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.services.push(newService);
    await this.save();
    return newService;
  }

  async updateService(id, updateData) {
    await this.initialize();
    const serviceIndex = this.data.services.findIndex(s => s.id == id);
    if (serviceIndex === -1) return null;
    
    this.data.services[serviceIndex] = {
      ...this.data.services[serviceIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    await this.save();
    return this.data.services[serviceIndex];
  }

  // User methods
  async findUserByEmail(email) {
    await this.initialize();
    return this.data.users.find(u => u.email === email);
  }

  async findUserById(id) {
    await this.initialize();
    return this.data.users.find(u => u.id == id);
  }

  async createUser(userData) {
    await this.initialize();
    const newUser = {
      id: this.nextId.users++,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    await this.save();
    return newUser;
  }

  // Booking methods
  async findAllBookings(where = {}) {
    await this.initialize();
    let bookings = [...this.data.bookings];
    
    if (where.serviceId) {
      bookings = bookings.filter(b => b.serviceId == where.serviceId);
    }
    
    if (where.userId) {
      bookings = bookings.filter(b => b.userId == where.userId);
    }
    
    if (where.status) {
      bookings = bookings.filter(b => b.status === where.status);
    }
    
    return bookings;
  }

  async findBookingById(id) {
    await this.initialize();
    return this.data.bookings.find(b => b.id == id);
  }

  async createBooking(bookingData) {
    await this.initialize();
    const newBooking = {
      id: this.nextId.bookings++,
      ...bookingData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.bookings.push(newBooking);
    await this.save();
    return newBooking;
  }

  async updateBooking(id, updateData) {
    await this.initialize();
    const bookingIndex = this.data.bookings.findIndex(b => b.id == id);
    if (bookingIndex === -1) return null;
    
    this.data.bookings[bookingIndex] = {
      ...this.data.bookings[bookingIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    await this.save();
    return this.data.bookings[bookingIndex];
  }

  // Settings methods
  async findAllSettings() {
    await this.initialize();
    return [...this.data.settings];
  }

  async findSettingByKey(key) {
    await this.initialize();
    return this.data.settings.find(s => s.key === key);
  }

  async updateSetting(key, value) {
    await this.initialize();
    const settingIndex = this.data.settings.findIndex(s => s.key === key);
    
    if (settingIndex === -1) {
      // Create new setting
      const newSetting = {
        id: this.nextId.settings++,
        key,
        value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.settings.push(newSetting);
      await this.save();
      return newSetting;
    } else {
      // Update existing setting
      this.data.settings[settingIndex] = {
        ...this.data.settings[settingIndex],
        value,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.settings[settingIndex];
    }
  }
}

module.exports = new JsonDatabase();