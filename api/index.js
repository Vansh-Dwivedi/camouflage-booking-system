require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Camouflage Booking System API',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET'
    }
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    status: 'debug',
    timestamp: new Date().toISOString(),
    dbInitialized: dbInitialized,
    routesAdded: routesAdded,
    useFallback: app.get('useFallback') || false,
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    path: req.path,
    method: req.method,
    sqliteAvailable: 'checking...'
  });
});

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin-bookings.html'));
});

app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'booking.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// Initialize database and routes only after successful connection
let dbInitialized = false;
let routesAdded = false;

app.use(async (req, res, next) => {
  // Only initialize for API routes (not static files or health check)
  if (req.path.startsWith('/api/') && req.path !== '/api/health' && req.path !== '/api/debug') {
    
    if (!dbInitialized) {
      try {
        console.log('🔄 Initializing database for:', req.path);
        
        // Try to initialize database with fallback handling
        try {
          // First try the alternative database configuration
          let dbModule, sequelize, testConnection;
          
          try {
            dbModule = require('../config/database-alt');
            sequelize = await dbModule.createSequelizeInstance();
            testConnection = dbModule.testConnection;
            console.log('🔄 Using alternative database configuration');
          } catch (altError) {
            console.log('Alternative DB failed, trying original:', altError.message);
            dbModule = require('../config/database');
            sequelize = dbModule.sequelize;
            testConnection = dbModule.testConnection;
          }
          
          await testConnection();
          await sequelize.sync({ force: true }); // Force sync for in-memory database
          
          // If using Vercel (in-memory database), seed with initial data
          if (process.env.VERCEL === '1') {
            console.log('🌱 Seeding database for serverless environment...');
            
            // Import models
            const { User, Service, Setting } = require('../models');
            
            // Create admin user
            const bcrypt = require('bcryptjs');
            const adminPassword = await bcrypt.hash('admin123', 10);
            await User.create({
              email: 'admin@camouflage.com',
              password: adminPassword,
              name: 'Admin User',
              phone: '+1234567890',
              role: 'admin'
            });
            
            // Create sample services
            await Service.bulkCreate([
              {
                name: 'Bridal Makeup',
                description: 'Complete bridal makeup package with trial session',
                duration: 180,
                price: 250.00,
                category: 'bridal',
                isActive: true
              },
              {
                name: 'Party Makeup',
                description: 'Glamorous makeup for special occasions',
                duration: 90,
                price: 80.00,
                category: 'party',
                isActive: true
              },
              {
                name: 'Natural Look',
                description: 'Subtle, everyday makeup look',
                duration: 60,
                price: 50.00,
                category: 'natural',
                isActive: true
              }
            ]);
            
            // Create settings
            await Setting.bulkCreate([
              { key: 'businessName', value: 'Camouflage Beauty Studio' },
              { key: 'businessEmail', value: 'booking@camouflage.com' },
              { key: 'businessPhone', value: '+1234567890' },
              { key: 'businessAddress', value: '123 Beauty Street, City, State 12345' },
              { key: 'workingHours', value: '{"start": "09:00", "end": "18:00"}' },
              { key: 'workingDays', value: '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]' },
              { key: 'bookingBuffer', value: '15' },
              { key: 'maxAdvanceBooking', value: '30' },
              { key: 'autoConfirm', value: 'false' },
              { key: 'smsNotifications', value: 'true' },
              { key: 'emailNotifications', value: 'true' },
              { key: 'twilioAccountSid', value: process.env.TWILIO_ACCOUNT_SID || '' },
              { key: 'twilioAuthToken', value: process.env.TWILIO_AUTH_TOKEN || '' },
              { key: 'twilioPhoneNumber', value: process.env.TWILIO_PHONE_NUMBER || '' }
            ]);
            
            console.log('✅ Database seeded successfully');
          }
          
          console.log('✅ Database initialized with SQLite');
          
        } catch (dbError) {
          console.error('SQLite initialization failed, using fallback:', dbError.message);
          
          // Set up fallback database
          const fallbackDB = require('../config/fallback-db');
          app.set('fallbackDB', fallbackDB);
          app.set('useFallback', true);
          
          console.log('✅ Fallback database initialized');
        }
        
        dbInitialized = true;
        
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Database initialization failed',
          error: error.message
        });
      }
    }
    
    if (!routesAdded) {
      try {
        // Add routes after successful DB connection
        const useFallback = app.get('useFallback');
        
        if (useFallback) {
          // Use fallback routes when SQLite is not available
          console.log('🔄 Using fallback routes...');
          app.use('/api/services', require('./fallback-services'));
          
          // Simple fallback auth route
          app.use('/api/auth', (req, res) => {
            res.json({ success: false, message: 'Authentication temporarily unavailable' });
          });
          
          // Simple fallback for other routes
          app.use('/api/bookings', (req, res) => {
            res.json({ success: false, message: 'Booking temporarily unavailable' });
          });
          
          app.use('/api/admin', (req, res) => {
            res.json({ success: false, message: 'Admin panel temporarily unavailable' });
          });
          
        } else {
          // Use full routes when SQLite is working
          app.use('/api/auth', require('../routes/auth'));
          app.use('/api/bookings', require('../routes/bookings'));  
          app.use('/api/services', require('../routes/services'));
          app.use('/api/admin', require('../routes/admin'));
        }
        
        // Mock socket.io for serverless
        app.set('io', { 
          emit: () => {}, 
          to: () => ({ emit: () => {} }) 
        });
        
        routesAdded = true;
        console.log('✅ Routes initialized');
        
      } catch (error) {
        console.error('❌ Route initialization failed:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Route initialization failed',
          error: error.message
        });
      }
    }
  }
  
  next();
});

// Error handling
app.use((error, req, res, next) => {
  console.error('❌ Error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ 
      success: false, 
      message: 'API endpoint not found' 
    });
  } else {
    res.status(404).sendFile(path.join(__dirname, '..', 'views', 'index.html'));
  }
});

module.exports = app;