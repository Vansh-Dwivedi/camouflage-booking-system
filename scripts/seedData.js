const { db, initializeDatabase } = require('../config/database');
require('dotenv').config();

// Initialize JSON database
async function initializeJsonDB() {
  try {
    await initializeDatabase();
    console.log('✅ Connected to JSON database');
    console.log('✅ JSON Database initialized with sample data');
  } catch (error) {
    console.error('❌ JSON Database initialization error:', error);
    process.exit(1);
  }
}

// Sample data
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@camouflage.com',
    password: 'admin123',
    role: 'admin',
    phone: '(555) 000-0001',
  },
  {
    name: 'Jane Smith',
    email: 'customer@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '(555) 000-0002',
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '(555) 000-0003',
  },
  {
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '(555) 000-0004',
  },
  {
    name: 'Jessica Wilson',
    email: 'jessica.wilson@example.com',
    password: 'staff123',
    role: 'staff',
    phone: '(555) 000-0005',
  }
];

const sampleServices = [
  {
    name: 'Full Glam Makeup',
    description: 'Complete glamorous makeup look perfect for special events, parties, and photoshoots. Includes foundation, contouring, eye makeup, and lip color.',
    category: 'makeup',
    duration: 90,
    price: 85.00,
    preparationTime: 10,
    cleanupTime: 10,
    tags: ['glamorous', 'events', 'photoshoot', 'full-face'],
    requirements: ['Clean face', 'No makeup on arrival'],
    availability: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
      saturday: { enabled: true, slots: [{ start: '08:00', end: '16:00' }] },
      sunday: { enabled: false, slots: [] }
    }
  },
  {
    name: 'Natural Everyday Look',
    description: 'Perfect natural makeup for daily wear. Light coverage foundation, subtle eye enhancement, and natural lip color.',
    category: 'makeup',
    duration: 45,
    price: 45.00,
    preparationTime: 5,
    cleanupTime: 5,
    tags: ['natural', 'everyday', 'subtle', 'quick'],
    requirements: ['Clean face'],
    availability: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
      saturday: { enabled: true, slots: [{ start: '08:00', end: '16:00' }] },
      sunday: { enabled: false, slots: [] }
    }
  },
  {
    name: 'Bridal Makeup Package',
    description: 'Complete bridal makeup service including trial run, wedding day application, and touch-up kit. Includes false lashes and long-lasting products.',
    category: 'makeup',
    duration: 120,
    price: 150.00,
    preparationTime: 15,
    cleanupTime: 15,
    tags: ['bridal', 'wedding', 'long-lasting', 'premium'],
    requirements: ['Schedule trial 1-2 weeks before wedding', 'Clean face', 'Hair styled before makeup'],
    availability: {
      monday: { enabled: true, slots: [{ start: '08:00', end: '15:00' }] },
      tuesday: { enabled: true, slots: [{ start: '08:00', end: '15:00' }] },
      wednesday: { enabled: true, slots: [{ start: '08:00', end: '15:00' }] },
      thursday: { enabled: true, slots: [{ start: '08:00', end: '15:00' }] },
      friday: { enabled: true, slots: [{ start: '08:00', end: '15:00' }] },
      saturday: { enabled: true, slots: [{ start: '07:00', end: '14:00' }] },
      sunday: { enabled: true, slots: [{ start: '08:00', end: '14:00' }] }
    }
  },
  {
    name: 'Express Touch-Up',
    description: 'Quick 30-minute touch-up service for existing makeup. Perfect for refreshing your look before an event.',
    category: 'makeup',
    duration: 30,
    price: 25.00,
    preparationTime: 5,
    cleanupTime: 5,
    tags: ['quick', 'touch-up', 'refresh'],
    requirements: ['Existing makeup on face'],
    availability: {
      monday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '10:00', end: '18:00' }] },
      saturday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      sunday: { enabled: false, slots: [] }
    }
  },
  {
    name: 'Professional Eyebrow Shaping',
    description: 'Expert eyebrow shaping, threading, and tinting service. Includes consultation and aftercare advice.',
    category: 'eyebrows',
    duration: 45,
    price: 35.00,
    preparationTime: 5,
    cleanupTime: 10,
    tags: ['eyebrows', 'threading', 'tinting', 'shaping'],
    requirements: ['No eyebrow products 24 hours before', 'Hair growth of at least 2 weeks'],
    availability: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      saturday: { enabled: true, slots: [{ start: '08:00', end: '16:00' }] },
      sunday: { enabled: false, slots: [] }
    }
  },
  {
    name: 'Lash Extension Application',
    description: 'Professional eyelash extension application. Individual lashes applied for natural or dramatic look. Lasts 2-3 weeks.',
    category: 'lashes',
    duration: 90,
    price: 75.00,
    preparationTime: 10,
    cleanupTime: 10,
    tags: ['lashes', 'extensions', 'individual', 'long-lasting'],
    requirements: ['Clean lashes', 'No mascara', 'Remove contact lenses'],
    availability: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      saturday: { enabled: true, slots: [{ start: '08:00', end: '15:00' }] },
      sunday: { enabled: false, slots: [] }
    }
  },
  {
    name: 'Anti-Aging Facial Treatment',
    description: 'Professional anti-aging facial with cleansing, exfoliation, mask, and moisturizing. Includes face massage and product recommendations.',
    category: 'skincare',
    duration: 75,
    price: 95.00,
    preparationTime: 10,
    cleanupTime: 15,
    tags: ['facial', 'anti-aging', 'skincare', 'relaxing'],
    requirements: ['No active skin treatments 48 hours before', 'Clean face'],
    availability: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      saturday: { enabled: true, slots: [{ start: '08:00', end: '15:00' }] },
      sunday: { enabled: false, slots: [] }
    }
  },
  {
    name: 'Express Manicure',
    description: 'Quick professional manicure including nail shaping, cuticle care, and polish application. Perfect for busy schedules.',
    category: 'nails',
    duration: 45,
    price: 25.00,
    preparationTime: 5,
    cleanupTime: 10,
    tags: ['manicure', 'nails', 'quick', 'polish'],
    requirements: ['Clean hands', 'Remove existing polish'],
    availability: {
      monday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '10:00', end: '17:00' }] },
      saturday: { enabled: true, slots: [{ start: '09:00', end: '16:00' }] },
      sunday: { enabled: false, slots: [] }
    }
  }
];

// Seed users
async function seedUsers() {
  try {
    const users = await User.bulkCreate(sampleUsers, {
      individualHooks: true, // This ensures hooks are called for each record
      returning: true
    });
    
    console.log(`👥 Created ${users.length} users`);
    return users;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

// Seed services
async function seedServices() {
  try {
    const services = await Service.bulkCreate(sampleServices, {
      returning: true
    });
    
    console.log(`🛍️  Created ${services.length} services`);
    return services;
  } catch (error) {
    console.error('Error seeding services:', error);
    throw error;
  }
}

// Seed sample bookings
async function seedBookings(users, services) {
  try {
    const customers = users.filter(user => user.role === 'customer');
    
    // Create some sample bookings
    const sampleBookings = [
      {
        customerId: customers[0].id,
        serviceId: services[0].id, // Full Glam Makeup
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // +90 minutes
        customerInfo: {
          name: customers[0].name,
          email: customers[0].email,
          phone: customers[0].phone,
          notes: 'For a special dinner event'
        },
        pricing: {
          basePrice: parseFloat(services[0].price),
          discount: 0,
          finalPrice: parseFloat(services[0].price)
        },
        status: 'confirmed'
      },
      {
        customerId: customers[1].id,
        serviceId: services[2].id, // Bridal Makeup
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000), // +120 minutes
        customerInfo: {
          name: customers[1].name,
          email: customers[1].email,
          phone: customers[1].phone,
          notes: 'Wedding day makeup - natural look preferred'
        },
        pricing: {
          basePrice: parseFloat(services[2].price),
          discount: 0,
          finalPrice: parseFloat(services[2].price)
        },
        status: 'confirmed'
      },
      {
        customerId: customers[2].id,
        serviceId: services[1].id, // Natural Everyday Look
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +60 minutes
        customerInfo: {
          name: customers[2].name,
          email: customers[2].email,
          phone: customers[2].phone,
          notes: 'Work presentation'
        },
        pricing: {
          basePrice: parseFloat(services[1].price),
          discount: 0,
          finalPrice: parseFloat(services[1].price)
        },
        status: 'completed'
      },
      {
        customerId: customers[0].id,
        serviceId: services[4].id, // Eyebrow Shaping
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // +45 minutes
        customerInfo: {
          name: customers[0].name,
          email: customers[0].email,
          phone: customers[0].phone,
          notes: 'First time eyebrow shaping'
        },
        pricing: {
          basePrice: parseFloat(services[4].price),
          discount: 0,
          finalPrice: parseFloat(services[4].price)
        },
        status: 'pending'
      }
    ];
    
    const bookings = await Booking.bulkCreate(sampleBookings, {
      returning: true
    });
    
    console.log(`📅 Created ${bookings.length} sample bookings`);
    return bookings;
  } catch (error) {
    console.error('Error seeding bookings:', error);
    throw error;
  }
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('🌱 Starting JSON database seeding...');
    
    // Initialize JSON database (automatically seeds with initial data)
    await initializeJsonDB();
    
    console.log('✅ JSON Database seeding completed successfully!');
    console.log('\n🎯 Demo Accounts Available:');
    console.log('Admin: admin@camouflage.com / admin123');
    console.log('\n💾 Database Type: JSON File Storage');
    console.log('📁 Database Location: data/database.json');
    console.log('\n🚀 You can now start the server with: npm start');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ JSON Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  seedUsers,
  seedServices,
  seedBookings
};