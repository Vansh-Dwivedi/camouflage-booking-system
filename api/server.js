require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');

const app = express();

// Vercel serverless function compatibility
const isDevelopment = process.env.NODE_ENV !== 'production';
const isVercel = process.env.VERCEL === '1';

// Security middleware for Vercel
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting (lighter for serverless)
if (!isVercel) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Initialize database for serverless
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    await testConnection();
    
    // Sync database models
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized successfully');
    
    // Seed data for serverless (since database resets)
    if (isVercel) {
      const { seedUsers, seedServices } = require('../scripts/seedData');
      await seedUsers();
      await seedServices();
      console.log('✅ Database seeded for serverless environment');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Make app available to socket for serverless compatibility
app.set('io', { emit: () => {}, to: () => ({ emit: () => {} }) });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/services', require('./routes/services'));
app.use('/api/admin', require('./routes/admin'));

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-bookings.html'));
});

app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: isDevelopment ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Initialize database and start server
const startApp = async () => {
  try {
    await initializeDatabase();
    
    if (isDevelopment) {
      // Development server with Socket.IO
      const http = require('http');
      const socketIo = require('socket.io');
      
      const server = http.createServer(app);
      const io = socketIo(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });
      
      app.set('io', io);
      
      io.on('connection', (socket) => {
        console.log('📱 User connected:', socket.id);
        
        socket.on('join-booking', (serviceId) => {
          socket.join(`booking-${serviceId}`);
          console.log(`User joined booking room: booking-${serviceId}`);
        });
        
        socket.on('disconnect', () => {
          console.log('👋 User disconnected:', socket.id);
        });
      });
      
      const PORT = process.env.PORT || 3000;
      server.listen(PORT, () => {
        console.log(`🚀 Camouflage Booking System running on port ${PORT}`);
        console.log(`📱 Admin Panel: http://localhost:${PORT}/admin`);
        console.log(`💄 Booking System: http://localhost:${PORT}/booking`);
        console.log(`🏠 Home Page: http://localhost:${PORT}`);
        console.log(`💾 Database: SQLite`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    if (!isVercel) {
      process.exit(1);
    }
  }
};

// For Vercel serverless
if (isVercel) {
  // Initialize database on first request
  let dbInitialized = false;
  
  app.use(async (req, res, next) => {
    if (!dbInitialized) {
      try {
        await initializeDatabase();
        dbInitialized = true;
      } catch (error) {
        console.error('Database initialization failed:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Database initialization failed' 
        });
      }
    }
    next();
  });
}

// Start app for development
if (isDevelopment) {
  startApp();
}

// Export for Vercel
module.exports = app;