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
    useJsonDB: app.get('useJsonDB') || false,
    databaseType: 'JSON File Storage',
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    path: req.path,
    method: req.method
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
        
        // Initialize JSON database
        const { db, testConnection } = require('../config/database');
        await testConnection();
        
        // Set up JSON database for routes
        app.set('db', db);
        app.set('useJsonDB', true);
        
        console.log('✅ Database initialized with JSON storage');
        
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
        // Add JSON-compatible routes
        console.log('🔄 Setting up JSON database routes...');
        app.use('/api/services', require('./json-services'));
        app.use('/api/auth', require('./json-auth'));
        app.use('/api/bookings', require('./json-bookings'));
        app.use('/api/admin', require('./json-admin'));
        
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