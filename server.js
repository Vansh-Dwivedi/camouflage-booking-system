require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { db, testConnection, initializeDatabase } = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware - Disable CSP completely for development
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// JSON Database initialization
const initializeJsonDatabase = async () => {
  try {
    await initializeDatabase();
    console.log('✅ JSON Database initialized successfully');
    
    // Set up database reference for routes
    app.set('db', db);
    app.set('useJsonDB', true);
    
  } catch (error) {
    console.error('❌ JSON Database initialization error:', error);
    console.log('⚠️ Continuing server startup despite database initialization error...');
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('📱 User connected:', socket.id);
  
  socket.on('join-booking-room', (data) => {
    socket.join(`booking-${data.serviceId}`);
    console.log(`User joined booking room: booking-${data.serviceId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Import JSON-based routes for local development
const jsonAuthRoutes = require('./api/json-auth');
const jsonServiceRoutes = require('./api/json-services');
const jsonBookingRoutes = require('./api/json-bookings');
const jsonAdminRoutes = require('./api/json-admin');
// Lazy load notification queue to ensure module is initialized
require('./utils/notificationQueue');

// API routes - Using JSON Database
app.use('/api/auth', jsonAuthRoutes);
app.use('/api/services', jsonServiceRoutes);
app.use('/api/bookings', jsonBookingRoutes);
app.use('/api/admin', jsonAdminRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Backward-compatible aliases
app.get('/admin.html', (req, res) => res.redirect('/admin'));
app.get('/booking.html', (req, res) => res.redirect('/booking'));

// Admin pages (separate files per tab)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});
app.get('/admin/bookings', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-bookings.html'));
});
app.get('/admin/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-services.html'));
});
app.get('/admin/customers', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-customers.html'));
});
app.get('/admin/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-analytics.html'));
});
app.get('/admin/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-settings.html'));
});

app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.redirect('/admin');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 3000;

// Start server after JSON database initialization
const startServer = async () => {
  try {
    console.log('🔄 Initializing JSON Database...');
    await initializeJsonDatabase();
    console.log('🔄 Starting server...');
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Camouflage Booking System running on port ${PORT}`);
      console.log(`📱 Admin Panel: http://localhost:${PORT}/admin`);
      console.log(`💄 Booking System: http://localhost:${PORT}/booking`);
      console.log(`🏠 Home Page: http://localhost:${PORT}`);
      console.log(`💾 Database: JSON File Storage (data/database.json)`);
      console.log(`🔧 Using: Express.js + JSON Database + Socket.IO`);
    });
    
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.log('❌ Port 3000 is already in use. Trying to kill existing processes...');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();