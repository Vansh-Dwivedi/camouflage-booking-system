const express = require('express');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const router = express.Router();

// Middleware to verify admin token
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid access token'
    });
  }
};

// Get dashboard data
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const bookings = await db.findAllBookings();
    const services = await db.findAllServices();
    
    // Calculate stats
    const today = moment().format('YYYY-MM-DD');
    const thisMonth = moment().format('YYYY-MM');
    
    const todayBookings = bookings.filter(b => 
      moment(b.appointmentDate).format('YYYY-MM-DD') === today
    );
    
    const monthlyBookings = bookings.filter(b => 
      moment(b.appointmentDate).format('YYYY-MM') === thisMonth
    );
    
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    
    const monthlyRevenue = monthlyBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.price || 0), 0);
    
    res.json({
      success: true,
      data: {
        stats: {
          totalBookings: bookings.length,
          todayBookings: todayBookings.length,
          monthlyBookings: monthlyBookings.length,
          pendingBookings: pendingBookings.length,
          confirmedBookings: confirmedBookings.length,
          monthlyRevenue: monthlyRevenue,
          totalServices: services.length,
          activeServices: services.filter(s => s.isActive).length
        },
        recentBookings: bookings
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading dashboard data',
      error: error.message
    });
  }
});

// Get all bookings for admin
router.get('/bookings', authenticateAdmin, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { status, date, serviceId, page = 1, limit = 50 } = req.query;
    
    let bookings = await db.findAllBookings();
    
    // Apply filters
    if (status && status !== 'all') {
      bookings = bookings.filter(b => b.status === status);
    }
    
    if (date) {
      bookings = bookings.filter(b => 
        moment(b.appointmentDate).format('YYYY-MM-DD') === date
      );
    }
    
    if (serviceId) {
      bookings = bookings.filter(b => b.serviceId == serviceId);
    }
    
    // Sort by appointment date (newest first)
    bookings.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedBookings = bookings.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        bookings: paginatedBookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: bookings.length,
          pages: Math.ceil(bookings.length / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading bookings',
      error: error.message
    });
  }
});

// Update booking status
router.put('/bookings/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const db = req.app.get('db');
    
    if (!['pending', 'confirmed', 'completed', 'cancelled', 'no-show'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const booking = await db.findBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const updatedBooking = await db.updateBooking(req.params.id, { status });
    
    // Simulate SMS notification (would integrate with Twilio in full version)
    if (booking.customerPhone && ['confirmed', 'cancelled'].includes(status)) {
      console.log(`📱 SMS would be sent to ${booking.customerPhone}: Booking ${status}`);
    }
    
    res.json({
      success: true,
      data: { booking: updatedBooking },
      message: `Booking ${status} successfully`
    });
    
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
});

// Get all services for admin
router.get('/services', authenticateAdmin, async (req, res) => {
  try {
    const db = req.app.get('db');
    const services = await db.findAllServices();
    
    res.json({
      success: true,
      data: { services }
    });
    
  } catch (error) {
    console.error('Get admin services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading services',
      error: error.message
    });
  }
});

// Create new service
router.post('/services', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, duration, price, category, isActive = true } = req.body;
    const db = req.app.get('db');
    
    if (!name || !duration || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, duration, price, and category are required'
      });
    }
    
    const newService = await db.createService({
      name,
      description: description || '',
      duration: parseInt(duration),
      price: parseFloat(price),
      category,
      isActive: Boolean(isActive)
    });
    
    res.status(201).json({
      success: true,
      data: { service: newService },
      message: 'Service created successfully'
    });
    
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service',
      error: error.message
    });
  }
});

// Update service
router.put('/services/:id', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, duration, price, category, isActive } = req.body;
    const db = req.app.get('db');
    
    const service = await db.findServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    
    const updatedService = await db.updateService(req.params.id, updateData);
    
    res.json({
      success: true,
      data: { service: updatedService },
      message: 'Service updated successfully'
    });
    
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service',
      error: error.message
    });
  }
});

// Get settings
router.get('/settings', authenticateAdmin, async (req, res) => {
  try {
    const db = req.app.get('db');
    const settings = await db.findAllSettings();
    
    res.json({
      success: true,
      data: { settings }
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading settings',
      error: error.message
    });
  }
});

// Update setting
router.put('/settings/:key', authenticateAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    const db = req.app.get('db');
    
    const updatedSetting = await db.updateSetting(req.params.key, value);
    
    res.json({
      success: true,
      data: { setting: updatedSetting },
      message: 'Setting updated successfully'
    });
    
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating setting',
      error: error.message
    });
  }
});

module.exports = router;